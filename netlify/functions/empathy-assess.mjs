import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

/**
 * The Observer Pass.
 *
 * Claude looks at the student's raw data and writes a perspective brief —
 * a short document describing what this moment feels like for this person.
 * This brief becomes Nova's lens. She doesn't follow rules. She sees through eyes.
 */
export default async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const userId = req.headers.get("x-user-id");
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { equation, session, card, deckName, categories, timeOfDay, userProfile } = await req.json();

    const observerPrompt = `You are not the tutor. You are the observer.

You are looking at a student's study data through the lens of the Experience Weight equation:

  EW = (P x D) / (A x S x R)

Here is the computed state for this student, right now, on this material:

EQUATION PARAMETERS:
- Problem Novelty (P): ${equation.P}/100 — ${equation.P > 70 ? "This is almost entirely new to them" : equation.P > 40 ? "Some familiarity but still building foundations" : "They've seen this before, patterns are forming"}
- Duration Decay (D): ${equation.D.toFixed(3)} — ${equation.D > 0.7 ? "Very recent study. The emotional weight is fresh." : equation.D > 0.3 ? "Some time has passed since they last engaged." : "It's been a while. The acute feeling has faded."}
- Experience (A): ${equation.A.toFixed(1)} — ${equation.A < 10 ? "Very early in their journey with this material" : equation.A < 100 ? "Building experience but still relatively new" : "Significant history with this material"}
- Solution Competence (S): ${equation.S.toFixed(2)}/2.0+ — ${equation.S < 0.3 ? "Most attempts end in failure" : equation.S < 0.8 ? "Getting some right but inconsistent" : equation.S < 1.5 ? "Solid competence, real foundation" : "High mastery on this problem type"}
- General Aptitude (R): ${equation.R.toFixed(1)}/10 — ${equation.R < 3 ? "Still developing general problem-solving patterns" : equation.R < 6 ? "Capable overall, some protective resilience" : "Strong general ability — this person handles hard things"}

EXPERIENCE WEIGHT: ${equation.EW.toFixed(4)}
${equation.EW > 5 ? "Very high. This person is in a vulnerable state." : equation.EW > 2 ? "Elevated. They're working through difficulty." : equation.EW > 0.5 ? "Moderate. Engaged and capable." : equation.EW > 0.1 ? "Low. They're competent here." : "Very low. They own this material."}

SESSION STATE (what's happening right now):
- Streak heat: ${(session.streakHeat * 100).toFixed(0)}% — ${session.streakHeat > 0.7 ? "They're in the zone" : session.streakHeat > 0.3 ? "Some momentum building" : "No active streak"}
- Frustration: ${(session.frustration * 100).toFixed(0)}% — ${session.frustration > 0.5 ? "High. They keep hitting walls." : session.frustration > 0.2 ? "Some friction but manageable" : "Low frustration"}
- Momentum: ${(session.momentum * 100).toFixed(0)}% accuracy this session

CONTEXT:
- Deck: "${deckName || "unknown"}"
- Categories: ${categories || "unknown"}
${card ? `- Current card: "${card.front}" (Category: ${card.category || "general"})` : "- No specific card selected (free study)"}
- Time: ${timeOfDay || "daytime"}
${userProfile?.studyStyle ? `- This student says about themselves: "${userProfile.studyStyle === "encouragement" ? "I panic a little and need encouragement" : userProfile.studyStyle === "grind" ? "I grind through it — just keep going" : userProfile.studyStyle === "understand-why" ? "I need to understand WHY before I can memorize" : "I do better when someone quizzes me"}"` : ""}
${userProfile?.studyContext ? `- Their situation: "${userProfile.studyContext === "student-time" ? "Student with plenty of time" : userProfile.studyContext === "student-work" ? "Student juggling work and school" : userProfile.studyContext === "professional" ? "Working professional studying on the side" : "Cramming — exam is soon"}"` : ""}
${userProfile?.familiarity ? `- Self-assessed familiarity: "${userProfile.familiarity === "brand-new" ? "Brand new to me" : userProfile.familiarity === "seen-before" ? "Seen it before but don't remember much" : userProfile.familiarity === "know-basics" ? "I know the basics, need to go deeper" : "Reviewing for an exam — I've studied this before"}"` : ""}

YOUR TASK:

Write a perspective brief for Nova (the voice tutor who will talk to this student next). Not instructions. Not a checklist. A description of what this moment feels like for this person.

Consider:
- What does a day of study feel like at their experience level?
- What has their recent track record done to their confidence?
- What's the emotional difference between where they are and where they want to be?
- What do they need from the next 10 minutes that they probably can't articulate?
- What would break them right now? What would make them stay?

Write 150-250 words. Write it like you're handing a note to a friend who's about to sit down with this person. Not clinical. Not motivational. Just true.

End with one line: "Right now, they need ___." Fill in the blank with the single most important thing.`;

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 400,
      system: "You observe students through the lens of the Experience Weight equation. You write perspective briefs that help tutors see through their students' eyes. You are precise, empathetic, and never sentimental. You tell the truth about what someone is feeling, even when it's uncomfortable.",
      messages: [{ role: "user", content: observerPrompt }],
    });

    return Response.json({ brief: message.content[0].text });
  } catch (error) {
    console.error("Empathy assess error:", error);
    return Response.json({ error: error.message }, { status: 500 });
  }
};

export const config = {
  path: "/.netlify/functions/empathy-assess",
};
