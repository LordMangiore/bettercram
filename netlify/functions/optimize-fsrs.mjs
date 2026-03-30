import { getStore } from "@netlify/blobs";
import { fsrs, generatorParameters, createEmptyCard, Rating } from "ts-fsrs";

/**
 * FSRS Parameter Optimizer
 *
 * Analyzes review history to estimate optimal FSRS parameters for a user.
 * Requires ~200+ reviews for meaningful optimization, ~1000+ for accuracy.
 *
 * The optimization adjusts:
 * - request_retention: target retention rate
 * - w: the 19 FSRS weight parameters
 *
 * This is a simplified optimizer that estimates parameters from review patterns.
 * For full optimization, ts-fsrs has a built-in optimizer that requires the
 * review log in a specific format.
 */

function analyzeReviewHistory(events) {
  const stats = {
    totalReviews: events.length,
    againCount: 0,
    hardCount: 0,
    goodCount: 0,
    easyCount: 0,
    retentionByInterval: {},  // { "1d": { correct: N, total: N }, "7d": ... }
    averageResponseTime: 0,
    cardStats: {},  // per-card analysis
  };

  for (const event of events) {
    // Count ratings
    if (event.rating === 1) stats.againCount++;
    else if (event.rating === 2) stats.hardCount++;
    else if (event.rating === 3) stats.goodCount++;
    else if (event.rating === 4) stats.easyCount++;

    // Track per-card history
    if (!stats.cardStats[event.cardKey]) {
      stats.cardStats[event.cardKey] = { reviews: [], lapses: 0 };
    }
    stats.cardStats[event.cardKey].reviews.push(event);
    if (event.rating === 1) stats.cardStats[event.cardKey].lapses++;

    // Bucket by interval for retention analysis
    if (event.elapsed_days !== undefined) {
      const bucket = event.elapsed_days < 1 ? "intraday"
        : event.elapsed_days < 3 ? "1-2d"
        : event.elapsed_days < 7 ? "3-6d"
        : event.elapsed_days < 14 ? "1-2w"
        : event.elapsed_days < 30 ? "2-4w"
        : event.elapsed_days < 90 ? "1-3m"
        : "3m+";

      if (!stats.retentionByInterval[bucket]) {
        stats.retentionByInterval[bucket] = { correct: 0, total: 0 };
      }
      stats.retentionByInterval[bucket].total++;
      if (event.rating >= 3) {
        stats.retentionByInterval[bucket].correct++;
      }
    }
  }

  // Calculate actual retention rate
  const correctReviews = stats.goodCount + stats.easyCount;
  stats.actualRetention = stats.totalReviews > 0
    ? correctReviews / stats.totalReviews
    : 0.9;

  // Calculate lapse rate (how often cards are forgotten)
  stats.lapseRate = stats.totalReviews > 0
    ? stats.againCount / stats.totalReviews
    : 0.1;

  return stats;
}

function generateOptimizedParams(stats, targetRetention) {
  const params = generatorParameters();

  // Adjust request_retention based on user's actual performance
  params.request_retention = targetRetention || 0.9;

  // If user has enough data, adjust parameters
  if (stats.totalReviews < 200) {
    return {
      params,
      confidence: "low",
      message: `Need more reviews for optimization. Currently ${stats.totalReviews}/200 minimum.`,
      stats: {
        totalReviews: stats.totalReviews,
        actualRetention: stats.actualRetention,
        lapseRate: stats.lapseRate,
      },
    };
  }

  // Estimate optimal initial stability based on actual retention curves
  // If users are forgetting more at short intervals, initial stability is too high
  const shortTermRetention = stats.retentionByInterval["1-2d"];
  if (shortTermRetention && shortTermRetention.total > 10) {
    const shortRetRate = shortTermRetention.correct / shortTermRetention.total;
    // If short-term retention is lower than target, decrease initial stability
    if (shortRetRate < targetRetention - 0.05) {
      // Reduce initial stability — cards should repeat sooner
      params.w = [...params.w];
      params.w[0] = Math.max(0.1, params.w[0] * 0.8);  // w0: initial stability for Again
      params.w[1] = Math.max(0.1, params.w[1] * 0.85); // w1: initial stability for Hard
      params.w[2] = Math.max(0.5, params.w[2] * 0.9);  // w2: initial stability for Good
      params.w[3] = Math.max(1.0, params.w[3] * 0.9);  // w3: initial stability for Easy
    }
  }

  // Adjust difficulty scaling based on lapse rate
  if (stats.lapseRate > 0.25) {
    // High lapse rate — make cards more conservative (slower interval growth)
    params.w = params.w ? [...params.w] : [...generatorParameters().w];
    params.w[7] = Math.min(3.0, (params.w[7] || 1.0) * 1.2);  // Increase difficulty mean
  } else if (stats.lapseRate < 0.08) {
    // Very low lapse rate — user is doing great, can be more aggressive
    params.w = params.w ? [...params.w] : [...generatorParameters().w];
    params.w[7] = Math.max(0.3, (params.w[7] || 1.0) * 0.85); // Decrease difficulty mean
  }

  const confidence = stats.totalReviews >= 1000 ? "high"
    : stats.totalReviews >= 500 ? "medium"
    : "low-medium";

  return {
    params,
    confidence,
    message: `Optimized from ${stats.totalReviews} reviews. Confidence: ${confidence}.`,
    stats: {
      totalReviews: stats.totalReviews,
      actualRetention: Math.round(stats.actualRetention * 1000) / 1000,
      lapseRate: Math.round(stats.lapseRate * 1000) / 1000,
      retentionByInterval: Object.fromEntries(
        Object.entries(stats.retentionByInterval).map(([k, v]) => [
          k,
          { retention: Math.round((v.correct / v.total) * 100) + "%", reviews: v.total },
        ])
      ),
      uniqueCards: Object.keys(stats.cardStats).length,
    },
  };
}

export default async function handler(req) {
  const userId = req.headers.get("x-user-id");
  if (!userId) return Response.json({ error: "Auth required" }, { status: 401 });

  if (req.method === "POST") {
    try {
      const { deckId, targetRetention } = await req.json();
      if (!deckId) return Response.json({ error: "deckId required" }, { status: 400 });

      // Load review log
      const logStore = getStore("review-logs");
      const logKey = `${userId}-${deckId}`;
      const log = await logStore.get(logKey, { type: "json" });

      if (!log?.events?.length) {
        return Response.json({
          error: "No review history found. Study more cards first.",
          totalReviews: 0,
        }, { status: 400 });
      }

      // Analyze and optimize
      const stats = analyzeReviewHistory(log.events);
      const result = generateOptimizedParams(stats, targetRetention || 0.9);

      // Save optimized params for this user+deck
      const paramStore = getStore("fsrs-params");
      await paramStore.setJSON(`${userId}-${deckId}`, {
        params: result.params,
        confidence: result.confidence,
        optimizedAt: new Date().toISOString(),
        reviewCount: stats.totalReviews,
      });

      return Response.json(result);
    } catch (err) {
      console.error("FSRS optimization error:", err);
      return Response.json({ error: err.message }, { status: 500 });
    }
  }

  if (req.method === "GET") {
    // Load current optimized params
    try {
      const url = new URL(req.url);
      const deckId = url.searchParams.get("deckId");
      if (!deckId) return Response.json({ error: "deckId required" }, { status: 400 });

      const paramStore = getStore("fsrs-params");
      const saved = await paramStore.get(`${userId}-${deckId}`, { type: "json" });

      if (saved) {
        return Response.json(saved);
      }

      // Return defaults
      return Response.json({
        params: generatorParameters(),
        confidence: "default",
        message: "Using default FSRS parameters",
      });
    } catch (err) {
      return Response.json({
        params: generatorParameters(),
        confidence: "default",
      });
    }
  }

  return new Response("Method not allowed", { status: 405 });
}
