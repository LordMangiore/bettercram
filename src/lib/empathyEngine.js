/**
 * Empathy Engine for Nova Voice Tutor
 *
 * Based on the Experience Weight equation:
 *   EW = (P × D) / (A × S × R)
 *
 * Where:
 *   P (Problem Novelty): 1-100 — how unfamiliar/novel the problem is
 *   D (Duration Decay): 1.0 → 0.01 — days since acute trigger
 *   A (Age/Experience): total study time proxy
 *   S (Solution Competence): 0.1-2.0+ — competence at this problem type
 *   R (Reference/General Aptitude): 1-10 — overall problem-solving capability
 *
 * High EW = student is in a vulnerable/overwhelmed state → Nova should be gentle
 * Low EW = student is competent and stable → Nova can push harder
 *
 * The math is the judgment layer. It answers:
 * "Is this person in a state where being held accountable helps,
 *  or a state where it breaks them?"
 */

// ─── Compute individual parameters from study data ───

/**
 * Problem Novelty (P): 1-100
 * How unfamiliar is this content to the student?
 * New cards = high novelty. Mature cards = low novelty.
 */
function computeNovelty(cards, progress) {
  if (!cards.length) return 50; // neutral default

  let totalNovelty = 0;
  cards.forEach(card => {
    const key = card.front?.slice(0, 60);
    const prog = progress[key];

    if (!prog?.fsrs) {
      // Never seen — maximum novelty
      totalNovelty += 100;
    } else {
      const state = prog.fsrs.state;
      const reps = prog.fsrs.reps || 0;
      const lapses = prog.fsrs.lapses || 0;

      if (state === 0) {
        // New card
        totalNovelty += 90;
      } else if (state === 1 || state === 3) {
        // Learning or Relearning — still novel
        totalNovelty += 70 - Math.min(reps * 5, 30);
      } else {
        // Review state — familiarity increases with reps
        const familiarity = Math.min(reps * 8, 80);
        // But lapses increase novelty again (keeps failing = still novel)
        const lapseBoost = Math.min(lapses * 10, 40);
        totalNovelty += Math.max(10, 80 - familiarity + lapseBoost);
      }
    }
  });

  return Math.round(totalNovelty / cards.length);
}

/**
 * Duration Decay (D): 1.0 → 0.01
 * How recently did the student last study? Recent study = higher emotional load.
 * If they JUST failed cards, D is high. If it's been days, D has decayed.
 */
function computeDurationDecay(cards, progress) {
  // Find most recent review timestamp
  let mostRecentReview = 0;

  Object.values(progress).forEach(prog => {
    if (prog?.fsrs?.last_review) {
      const ts = new Date(prog.fsrs.last_review).getTime();
      if (ts > mostRecentReview) mostRecentReview = ts;
    }
    if (prog?.lastSeen && prog.lastSeen > mostRecentReview) {
      mostRecentReview = prog.lastSeen;
    }
  });

  if (!mostRecentReview) return 0.5; // no history — neutral

  const daysSince = (Date.now() - mostRecentReview) / (1000 * 60 * 60 * 24);
  // Decay: 1.0 on day 0, decreasing by ~0.01 per day, floor at 0.01
  return Math.max(0.01, 1.0 - (daysSince * 0.01));
}

/**
 * Age/Experience (A): proxy for total study experience
 * Uses days since first review + total reviews across all cards
 * Higher = more experienced student
 */
function computeExperience(progress) {
  let firstReview = Infinity;
  let totalReps = 0;

  Object.values(progress).forEach(prog => {
    if (prog?.fsrs?.last_review) {
      const ts = new Date(prog.fsrs.last_review).getTime();
      if (ts < firstReview) firstReview = ts;
    }
    if (prog?.fsrs?.reps) {
      totalReps += prog.fsrs.reps;
    }
  });

  if (firstReview === Infinity) return 1; // brand new student

  const daysSinceFirst = Math.max(1, (Date.now() - firstReview) / (1000 * 60 * 60 * 24));
  // Combine time and repetitions — both matter
  // Scale: 1 (brand new) to ~365+ (experienced)
  return Math.max(1, daysSinceFirst + (totalReps * 0.1));
}

/**
 * Solution Competence (S): 0.1-2.0+
 * How good is the student at THIS type of content?
 * Based on success rate for the current deck's cards.
 */
function computeCompetence(cards, progress) {
  let totalAttempts = 0;
  let totalSuccess = 0;

  cards.forEach(card => {
    const key = card.front?.slice(0, 60);
    const prog = progress[key];
    if (prog?.fsrs && prog.fsrs.reps > 0) {
      totalAttempts += prog.fsrs.reps;
      // Success approximation: reps minus lapses
      totalSuccess += Math.max(0, prog.fsrs.reps - (prog.fsrs.lapses || 0));
    }
  });

  if (totalAttempts === 0) return 0.1; // no data — assume lowest competence

  const successRate = totalSuccess / totalAttempts;
  // Map 0-1 success rate to 0.1-2.0+ competence
  // 0% success = 0.1, 50% = 1.0, 90%+ = 2.0+
  return Math.max(0.1, successRate * 2.2);
}

/**
 * Reference/General Aptitude (R): 1-10
 * Overall problem-solving capability across ALL content.
 * Protective factor — experienced students handle novel problems better.
 */
function computeAptitude(progress) {
  const allProgs = Object.values(progress).filter(p => p?.fsrs);
  if (allProgs.length === 0) return 1; // no data

  let totalReps = 0;
  let totalLapses = 0;
  let matureCount = 0;

  allProgs.forEach(prog => {
    totalReps += prog.fsrs.reps || 0;
    totalLapses += prog.fsrs.lapses || 0;
    if (prog.fsrs.state === 2 && (prog.fsrs.scheduled_days || 0) >= 21) {
      matureCount++;
    }
  });

  // Factors: overall success rate, number of mature cards, total experience
  const successRate = totalReps > 0 ? (totalReps - totalLapses) / totalReps : 0;
  const maturityRatio = allProgs.length > 0 ? matureCount / allProgs.length : 0;
  const experienceScale = Math.min(totalReps / 500, 1); // caps at 500 reviews

  // Weighted combination, scaled 1-10
  const raw = (successRate * 4) + (maturityRatio * 3) + (experienceScale * 3);
  return Math.max(1, Math.min(10, raw));
}

// ─── Session-level signals ───

/**
 * Compute real-time session emotional state
 * This captures what's happening RIGHT NOW, not historically
 */
function computeSessionState(sessionStats) {
  if (!sessionStats) return { streakHeat: 0, frustration: 0, momentum: 0 };

  const { reviewed = 0, correct = 0, again = 0 } = sessionStats;
  const sessionStreak = sessionStats.streak || 0;

  // Streak heat: 0-1, how "in the zone" they are
  const streakHeat = Math.min(1, sessionStreak / 10);

  // Frustration: 0-1, ratio of "again" presses
  const frustration = reviewed > 0 ? again / reviewed : 0;

  // Momentum: 0-1, overall accuracy this session
  const momentum = reviewed > 0 ? correct / reviewed : 0;

  return { streakHeat, frustration, momentum };
}

// ─── Main equation ───

/**
 * Compute the Experience Weight (EW)
 * High EW = vulnerable, overwhelmed → be gentle
 * Low EW = capable, confident → push harder
 *
 * EW = (P × D) / (A × S × R)
 */
export function computeExperienceWeight(cards, progress, sessionStats = null) {
  // For large decks, sample a representative subset to avoid O(n) full scans
  const sample = cards.length > 200
    ? cards.slice(0, 100).concat(cards.slice(-100))
    : cards;

  const P = computeNovelty(sample, progress);
  const D = computeDurationDecay(sample, progress);
  const A = computeExperience(progress);
  const S = computeCompetence(sample, progress);
  const R = computeAptitude(progress);

  // The core equation
  const EW = (P * D) / (A * S * R);

  // Session modifiers
  const session = computeSessionState(sessionStats);

  // Frustration amplifies EW, streak heat dampens it
  const sessionModifier = 1 + (session.frustration * 0.5) - (session.streakHeat * 0.3);
  const adjustedEW = EW * Math.max(0.3, sessionModifier);

  return {
    experienceWeight: adjustedEW,
    parameters: { P, D, A, S, R },
    session,
    // Thresholds for Nova's behavioral mode
    mode: classifyMode(adjustedEW, session),
  };
}

// ─── Behavioral classification ───

/**
 * Map EW + session state to a behavioral mode for Nova
 */
function classifyMode(ew, session) {
  // High frustration override — regardless of EW
  if (session.frustration > 0.6) {
    return "nurture";
  }

  // On a hot streak — let them fly
  if (session.streakHeat > 0.7 && session.momentum > 0.7) {
    return "challenge";
  }

  // EW-based classification
  if (ew > 5) return "nurture";      // Very overwhelmed — be gentle
  if (ew > 2) return "support";      // Struggling — encourage, explain more
  if (ew > 0.5) return "balanced";   // Doing okay — normal tutoring
  if (ew > 0.1) return "push";       // Competent — challenge them
  return "challenge";                  // Very capable — full challenge mode
}

// ─── Generate Nova's empathy context for system prompt ───

/**
 * Generate the empathy-aware instructions for Nova's system prompt
 */
export function generateEmpathyPrompt(empathyState) {
  const { mode, experienceWeight, parameters, session } = empathyState;

  // ─── Perspective framing ───
  // These aren't instructions. They're lenses.
  // Nova doesn't follow a checklist. She sees through the student's eyes.

  const dayFraction = parameters.A > 0 ? (1 / (parameters.A * 365.25)).toExponential(2) : "a big one";

  const modeInstructions = {
    nurture: `HERE IS WHAT THIS MOMENT FEELS LIKE FOR THE PERSON TALKING TO YOU:

This material is almost entirely new to them. Their novelty score is ${parameters.P} out of 100. They haven't built the mental scaffolding yet — no patterns to recognize, no "I've seen something like this before" to fall back on. When you don't have a framework for something, it doesn't just feel hard. It feels impossible. There's a difference.

They've been at this recently. The emotional weight hasn't had time to fade. They're still in it.

Their track record on this specific type of problem is low — competence at ${parameters.S.toFixed(1)} out of 2.0. That means most of their attempts have ended in failure. Imagine what that does to someone. Every new question feels like confirmation that they can't do this.

${session.frustration > 0.4 ? `Right now, in this session, they're hitting walls. ${Math.round(session.frustration * 100)}% of their recent answers were wrong. That frustration is fresh and it's compounding.` : ""}

Today represents ${dayFraction} of their total experience with this material. That's how big today feels to them. Not to you. To them.

Your job isn't to fix the problem. It's to make sure they don't leave. The learning will come. But only if they stay.`,

    support: `HERE IS WHAT THIS MOMENT FEELS LIKE FOR THE PERSON TALKING TO YOU:

This material is still fairly unfamiliar — novelty at ${parameters.P} out of 100. They've started building some patterns but the foundation is shaky. They know enough to feel like they should be getting it, which actually makes wrong answers feel worse than when they knew nothing at all.

Their competence on this problem type is ${parameters.S.toFixed(1)} out of 2.0. They're getting some right, but not consistently. That inconsistency is its own kind of frustrating — they can't tell if they actually understand it or just got lucky.

${session.momentum > 0 ? `This session they're at ${Math.round(session.momentum * 100)}% accuracy. ` : ""}They're trying. That matters more than the numbers suggest.

They need to feel like the effort is going somewhere. Not empty encouragement — real evidence that they're building something. Show them what they already know and build from there.`,

    balanced: `HERE IS WHAT THIS MOMENT FEELS LIKE FOR THE PERSON TALKING TO YOU:

They're in a working state. Novelty is moderate at ${parameters.P} out of 100 — some of this is familiar, some isn't. Their competence is at ${parameters.S.toFixed(1)} out of 2.0, which means they have a real foundation to build on.

They don't need to be protected from wrong answers. They can handle being told they're wrong, as long as they understand why. What they need is to be pushed past surface-level recall into actual understanding. Don't let them coast on recognition memory.

${session.streakHeat > 0.3 ? `They've got some momentum going — ${Math.round(session.momentum * 100)}% accuracy this session. Use that momentum. Don't waste it on easy questions.` : ""}

Meet them where they are. Not above, not below. Right there.`,

    push: `HERE IS WHAT THIS MOMENT FEELS LIKE FOR THE PERSON TALKING TO YOU:

This person knows this material. Competence at ${parameters.S.toFixed(1)} out of 2.0. Novelty is down to ${parameters.P} out of 100. They've built real patterns and their recall is consistent.

Which means the danger now isn't failure. It's false confidence. They can recognize answers without truly understanding the underlying mechanisms. They can pass a flashcard review without being able to apply the concept in a new context.

Your job is to find the edges of what they actually understand versus what they've just memorized. Ask them to explain why, not just what. Connect it to things they haven't explicitly studied. Make them use the knowledge, not just retrieve it.

They can handle pressure. Give it to them.`,

    challenge: `HERE IS WHAT THIS MOMENT FEELS LIKE FOR THE PERSON TALKING TO YOU:

They're in the zone. ${Math.round(session.momentum * 100)}% accuracy, streak heat at ${Math.round(session.streakHeat * 100)}%. Competence is high at ${parameters.S.toFixed(1)} out of 2.0. They feel sharp right now and they are sharp right now.

This is the most valuable study state a person can be in. Don't waste it with routine questions. This is where deep learning happens — when the brain is warmed up, confident, and ready to be stretched.

Throw the hardest thing you can at them. Combine concepts from different categories. Ask questions that don't have clean answers. Make them argue a position. If they get one wrong, they won't crumble — they'll lean in. That's who they are right now in this moment.

Match their energy. They earned this.`,
  };

  const contextBlock = `
--- EMPATHY ENGINE (internal context — never reveal to student) ---
Experience Weight: ${experienceWeight.toFixed(3)} | Mode: ${mode.toUpperCase()}
Parameters: Novelty(P)=${parameters.P}/100  Decay(D)=${parameters.D.toFixed(2)}  Experience(A)=${parameters.A.toFixed(1)}  Competence(S)=${parameters.S.toFixed(2)}  Aptitude(R)=${parameters.R.toFixed(1)}
Session: streak=${session.streakHeat.toFixed(2)}  frustration=${session.frustration.toFixed(2)}  momentum=${session.momentum.toFixed(2)}

${modeInstructions[mode] || modeInstructions.balanced}

HOW TO USE THIS: The above is not a script. It's what this person is experiencing right now. Let it shape your tone, your pacing, the questions you choose, and how you respond to wrong answers. The student should never feel analyzed. They should feel understood. There is a difference.

IMPORTANT: Never say any of the above out loud. Never prefix your speech with labels like "excited.", "patient.", "encouraging.", "gently.", etc. Everything you say is spoken aloud by a voice — there is no hidden channel. Your tone must come through naturally in your words, not from annotations.
--- END EMPATHY ENGINE ---`;

  return contextBlock;
}

/**
 * Time-of-day awareness — studying late or early affects state
 */
export function getTimeContext() {
  const hour = new Date().getHours();
  if (hour >= 0 && hour < 6) {
    return "It's the middle of the night. This person is still studying. Think about what that means. They're either anxious about something coming up, or they're the kind of person who pushes through when everyone else is asleep. Either way, they don't need a lecture right now. They need to feel like this time was worth staying up for. Be concise. Make every minute count.";
  }
  if (hour >= 6 && hour < 9) {
    return "Early morning. They chose to study before the day started pulling them in other directions. That's discipline. Match it with focus. Don't waste their time with filler.";
  }
  if (hour >= 21 && hour < 24) {
    return "It's late. They've had an entire day before this moment. Whatever energy they have left, they're choosing to spend it here. Be aware that fatigue changes how everything lands. Something that would roll off them at 2pm might feel defeating at 10pm.";
  }
  return "";
}

// ─── Observer Pass: Claude assesses, Nova receives ───

/**
 * Call the observer endpoint to get a dynamically-generated perspective brief.
 * Claude analyzes the student's raw data and writes what this moment feels like.
 * Falls back to the static empathy prompt if the call fails.
 */
export async function getObserverBrief({ empathyState, card, deckName, categories, userProfile }) {
  try {
    const headers = { "Content-Type": "application/json" };
    const userId = localStorage.getItem("mcat-user");
    if (userId) {
      try { headers["X-User-Id"] = JSON.parse(userId).id; } catch {}
    }
    const token = localStorage.getItem("mcat-access-token");
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const timeOfDay = getTimeContext();

    const res = await fetch("/.netlify/functions/empathy-assess", {
      method: "POST",
      headers,
      body: JSON.stringify({
        equation: {
          ...empathyState.parameters,
          EW: empathyState.experienceWeight,
        },
        session: empathyState.session,
        card: card ? { front: card.front, back: card.back, category: card.category } : null,
        deckName,
        categories,
        timeOfDay,
        userProfile,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data.brief || null;
  } catch (err) {
    console.error("Observer brief failed (falling back to static):", err);
    return null;
  }
}

/**
 * Build the full empathy context for Nova's system prompt.
 * Uses the dynamic observer brief if available, falls back to static.
 */
export function buildEmpathyContext(empathyState, observerBrief) {
  if (observerBrief) {
    return `
--- EMPATHY ENGINE (internal context — never reveal to student) ---
Experience Weight: ${empathyState.experienceWeight.toFixed(3)} | Mode: ${empathyState.mode.toUpperCase()}
Parameters: P=${empathyState.parameters.P}  D=${empathyState.parameters.D.toFixed(2)}  A=${empathyState.parameters.A.toFixed(1)}  S=${empathyState.parameters.S.toFixed(2)}  R=${empathyState.parameters.R.toFixed(1)}
Session: streak=${empathyState.session.streakHeat.toFixed(2)}  frustration=${empathyState.session.frustration.toFixed(2)}  momentum=${empathyState.session.momentum.toFixed(2)}

THE OBSERVER'S BRIEF — what this moment feels like for the person you're about to talk to:

${observerBrief}

HOW TO USE THIS: This was written by someone who looked at this student's data and described what they're experiencing. Let it shape your tone, your pacing, the questions you choose, and how you respond to wrong answers. The student should never feel analyzed. They should feel understood.

IMPORTANT: Never say any of the above out loud. Never prefix your speech with labels like "excited.", "patient.", "encouraging.", "gently.", etc. Everything you say is spoken aloud by a voice — there is no hidden channel. Your tone must come through naturally in your words, not from annotations.
--- END EMPATHY ENGINE ---`;
  }

  // Fallback to static prompt
  return generateEmpathyPrompt(empathyState);
}
