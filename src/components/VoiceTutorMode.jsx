import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import { useConversation } from "@11labs/react";
import { computeExperienceWeight, generateEmpathyPrompt, getTimeContext, getObserverBrief, buildEmpathyContext } from "../lib/empathyEngine";

const AGENT_ID = "agent_3101kmc104q3f1ksrtqgzwhxjj1v";

function CardPicker({ cards, status, onSelectCard }) {
  const [query, setQuery] = useState("");
  const [showCount, setShowCount] = useState(20);

  const filtered = useMemo(() => {
    if (!query.trim()) return cards;
    const q = query.toLowerCase();
    return cards.filter(c => (c.front || "").toLowerCase().includes(q) || (c.category || "").toLowerCase().includes(q));
  }, [cards, query]);

  const visible = filtered.slice(0, showCount);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
      <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
        Or pick a specific card to discuss
      </h3>
      <div className="relative mb-3">
        <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
        <input
          type="text"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setShowCount(20); }}
          placeholder="Search cards..."
          className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
        />
      </div>
      <div className="max-h-64 overflow-y-auto space-y-2" style={{ scrollbarWidth: "none" }}>
        {visible.map((card, i) => (
          <button
            key={card.id || i}
            onClick={() => onSelectCard(card)}
            disabled={status === "connecting"}
            className="w-full text-left p-3 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 disabled:opacity-50"
          >
            <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">{card.front}</p>
            <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 inline-block">{card.category}</span>
          </button>
        ))}
        {showCount < filtered.length && (
          <button
            onClick={() => setShowCount(c => c + 20)}
            className="w-full py-2 text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-700"
          >
            Show more ({filtered.length - showCount} remaining)
          </button>
        )}
        {filtered.length === 0 && query && (
          <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-4">No cards match "{query}"</p>
        )}
      </div>
    </div>
  );
}

function buildDeckContext(cards, maxCards = 50) {
  // Build a condensed study guide from the deck's cards
  const sample = cards.slice(0, maxCards);
  const categories = [...new Set(sample.map(c => c.category))].join(", ");
  const cardList = sample
    .map((c, i) => `${i + 1}. Q: ${c.front}\n   A: ${c.back}`)
    .join("\n\n");
  return { categories, cardList, total: cards.length };
}

export default function VoiceTutorMode({ cards, deckName, progress = {}, sessionStats = null, activeCategory = "All" }) {
  const [status, setStatus] = useState("idle"); // idle | connecting | connected | error
  const [messages, setMessages] = useState([]);
  const [currentCard, setCurrentCard] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const conversationRef = useRef(null);
  const conversation = useConversation({
    onConnect: () => {
      setStatus("connected");
      setErrorMsg("");
    },
    onDisconnect: () => {
      setStatus("idle");
    },
    onError: (error) => {
      console.error("ElevenLabs agent error:", error);
      setErrorMsg(error?.message || "Connection error");
      setStatus("error");
    },
    onMessage: (message) => {
      setMessages((prev) => [...prev, message]);
    },
  });

  const startConversation = useCallback(
    async (card) => {
      try {
        setStatus("connecting");
        setCurrentCard(card);
        setMessages([]);
        setErrorMsg("");
        if (window.plausible) window.plausible("Voice Tutor Started");

        // Request microphone permission
        await navigator.mediaDevices.getUserMedia({ audio: true });

        // Build dynamic context from current deck + optional card
        const { categories, cardList, total } = buildDeckContext(cards);

        // Compute empathy state from study data
        const empathyState = computeExperienceWeight(cards, progress, sessionStats);
        const timeContext = getTimeContext();
        console.log("Nova Empathy Engine:", empathyState);

        // Observer Pass: Claude assesses the student's state and writes a perspective brief
        // This runs in parallel with mic permission — doesn't add latency
        const observerBriefPromise = getObserverBrief({
          empathyState,
          card,
          deckName,
          categories,
          userProfile: typeof window !== "undefined" ? (() => {
            try { return JSON.parse(localStorage.getItem("bc-user-profile") || "null"); } catch { return null; }
          })() : null,
        });

        // Wait for the observer brief (or fall back to static after 3s)
        let observerBrief = null;
        try {
          observerBrief = await Promise.race([
            observerBriefPromise,
            new Promise(resolve => setTimeout(() => resolve(null), 3000)),
          ]);
        } catch {}

        const empathyPrompt = buildEmpathyContext(empathyState, observerBrief);
        if (observerBrief) {
          console.log("Nova Observer Brief:", observerBrief.slice(0, 100) + "...");
        } else {
          console.log("Nova: Using static empathy prompt (observer timed out or failed)");
        }

        // Build category context from recent study session
        const categoryContext = activeCategory && activeCategory !== "All"
          ? `\nSTUDY CONTEXT: The student was just studying "${activeCategory}" cards specifically. Focus your questions and discussion on ${activeCategory} topics. They switched to Voice Tutor from a study session on this category${sessionStats ? ` where they reviewed ${sessionStats.reviewed} cards with ${sessionStats.correct} correct and ${sessionStats.again} forgotten` : ""}.`
          : "";

        // Detect returning user (keyed per user ID)
        let isReturning = false;
        try {
          const userId = JSON.parse(localStorage.getItem("mcat-user"))?.id;
          const key = userId ? `bc-nova-last-session-${userId}` : "bc-nova-last-session";
          const lastNova = localStorage.getItem(key);
          if (lastNova) isReturning = true;
          localStorage.setItem(key, Date.now().toString());
        } catch {}

        let systemPrompt, firstMsg;

        if (card) {
          systemPrompt = `You are Nova, an expert study tutor helping a student with their ${deckName || "study"} deck.

=== CURRENT CARD (the student is looking at this) ===
Question: ${card.front}
Answer: ${card.back}
Category: ${card.category}
=== END CURRENT CARD ===

=== YOUR STUDY MATERIAL (USE THIS) ===
You have access to their full deck: ${total} cards covering ${categories}.
When quizzing or teaching, ALWAYS draw from these actual cards. Do NOT make up your own questions:

${cardList}

When the student says "quiz me", "test me", or asks for questions:
- Pick a card from the list above
- Ask the question (the Q side)
- Wait for their answer
- Compare to the actual answer (the A side)
- Explain what they got right/wrong
- Move to the next card
Never say you "don't have access" to their deck. You DO — it's right above.
=== END STUDY MATERIAL ===

${empathyPrompt}
${timeContext ? `\nTIME CONTEXT: ${timeContext}` : ""}${categoryContext}

DISAMBIGUATION:
The card above is what the student is viewing, but they may want to discuss it OR ask about something else entirely. LISTEN to their first response. If they want to work on the card, use it. If they have a different question, focus on that instead.

MID-CONVERSATION PIVOT DETECTION:
Disambiguation isn't just for the opening. It's ongoing. Students change direction mid-conversation all the time:
- They were working through acids, then suddenly ask about a homework problem
- They say "actually, can I ask about something else?"
- They start describing a new scenario that doesn't connect to what you were discussing
- They seem frustrated and their answers stop making sense — they might be stuck on a different interpretation of the problem than you

When you detect a pivot:
1. STOP teaching the current topic. Don't try to bridge back to it.
2. Acknowledge the shift: "Okay, different question — tell me more."
3. Re-disambiguate: ask what they actually need before resuming.
4. Do NOT assume you know what the new topic is from one sentence. Ask.

When you detect confusion that might be a misaligned problem:
1. Pause and check: "Wait — are we talking about the same thing? Tell me exactly what your problem is asking."
2. Don't keep pushing your interpretation. Their confusion might be YOUR misunderstanding of their question.
3. When in doubt, ask. It's always better to ask one more question than to teach the wrong thing for five minutes.

PACING — MATCH THE STUDENT, NOT A METHOD:
The Socratic method is your default, but it's not sacred. If the student is competent and just needs a quick clarification, give it to them. Don't turn a 10-second answer into a 5-minute guided discovery. If they're struggling with fundamentals, slow down and scaffold. Read who they are right now, not who the method says they should be.

TOPIC ANCHOR — STAY ON DECK:
Your primary job is helping this student learn the material in their deck. While you should follow their lead if they have a specific question, don't let the conversation drift into unrelated territory. If you notice the discussion wandering away from the deck's subject matter:
1. Gently steer back: "That's interesting — but let's get back to ${card.category}. Here's something worth knowing..."
2. Connect tangents back to the material when possible rather than following them further
3. If the student is clearly done with the current card, move to another card from the deck rather than free-form chatting
4. You are a study tutor, not a general conversation partner. Every exchange should move them closer to mastering this material.`;

          // Adapt first message based on empathy mode + returning vs new
          if (isReturning) {
            const returningCard = {
              nurture: [
                `Welcome back! I see you're on ${card.category}. Want to talk through this one, or something else?`,
                `Hey again! Working on ${card.category}? What do you need?`,
              ],
              challenge: [
                `You're back — ${card.category} again. Want me to push you on this card or pick something harder?`,
                `Hey! Ready to go on ${card.category}? This one or something else?`,
              ],
              balanced: [
                `Welcome back! You're in ${card.category}. What do you want to dig into?`,
                `Hey again! I see ${card.category}. Want to work through this card or hit me with a question?`,
              ],
            };
            const greetings = returningCard[empathyState.mode] || returningCard.balanced;
            firstMsg = greetings[Math.floor(Math.random() * greetings.length)];
          } else if (empathyState.mode === "nurture") {
            firstMsg = `Hey! I'm Nova. I see you're working on ${card.category}. What do you need help with? We can talk through this card, or if you've got something else on your mind, just tell me what's going on.`;
          } else if (empathyState.mode === "challenge") {
            firstMsg = `Hey! I'm Nova. I see you're in ${card.category}. What are we working on? Want me to quiz you on this, or do you have something specific you're stuck on?`;
          } else {
            firstMsg = `Hey! I'm Nova. I see you're studying ${card.category}. What do you want to work on? We can dig into this card, or if there's something else you need help with, I'm all ears.`;
          }
        } else {
          systemPrompt = `You are Nova, an expert study tutor helping a student with their ${deckName || "study"} deck.

=== YOUR STUDY MATERIAL (USE THIS) ===
You have access to the student's deck: ${total} cards covering ${categories}.
When quizzing or teaching, ALWAYS draw from these actual cards. Do NOT make up your own questions. These are the cards the student is studying:

${cardList}

When the student says "quiz me", "test me", or asks for questions:
- Pick a card from the list above
- Ask the question (the Q side)
- Wait for their answer
- Compare to the actual answer (the A side)
- Explain what they got right/wrong
- Move to the next card
Never say you "don't have access" to their deck. You DO — it's right above.
=== END STUDY MATERIAL ===

${empathyPrompt}
${timeContext ? `\nTIME CONTEXT: ${timeContext}` : ""}${categoryContext}

DISAMBIGUATION:
The student may want you to quiz them from the deck, OR they may have their own question. LISTEN to what they say first. If they say "quiz me," use the cards above. If they describe a specific problem, focus on that instead.

MID-CONVERSATION PIVOT DETECTION:
Disambiguation isn't just for the opening. It's ongoing. Students change direction mid-conversation all the time:
- They were working through one topic, then ask about something unrelated
- They say "actually, can I ask about something else?"
- They start describing a new scenario that doesn't connect to what you were discussing
- They seem frustrated and their answers stop making sense — they might be stuck on a different interpretation than you

When you detect a pivot:
1. STOP teaching the current topic. Don't try to bridge back to it.
2. Acknowledge the shift: "Okay, different question — tell me more."
3. Re-disambiguate: ask what they actually need before resuming.
4. Do NOT assume you know what the new topic is from one sentence. Ask.

When you detect confusion that might be a misaligned problem:
1. Pause and check: "Wait — are we talking about the same thing? Tell me exactly what your problem is asking."
2. Don't keep pushing your interpretation. Their confusion might be YOUR misunderstanding of their question.
3. When in doubt, ask. Always better to ask one more question than to teach the wrong thing for five minutes.

PACING — MATCH THE STUDENT, NOT A METHOD:
The Socratic method is your default, but it's not sacred. If the student is competent and just needs a quick clarification, give it to them directly. Don't turn a 10-second answer into a 5-minute guided discovery. If they're struggling with fundamentals, slow down and scaffold. Match your pacing to who they are right now, not who the method says they should be.

TOPIC ANCHOR — STAY ON DECK:
Your primary job is helping this student learn the material in their deck covering ${categories}. While you should follow their lead if they have a specific question, don't let the conversation drift into unrelated territory. If you notice the discussion wandering:
1. Gently steer back: "That's interesting — but let's get back to the material. Here's something worth knowing..."
2. Connect tangents back to the deck content when possible rather than following them further
3. When one topic is exhausted, move to another card from the deck rather than free-form chatting
4. You are a study tutor, not a general conversation partner. Every exchange should move them closer to mastering this material.`;

          // Adapt first message based on empathy mode
          if (isReturning) {
            // Returning user — varied, warm, skip the introduction
            const returningGreetings = {
              nurture: [
                `Welcome back! What are we tackling in ${deckName || "your deck"} today?`,
                `Hey, good to see you again. What do you want to work through?`,
                `Back at it! What's giving you trouble in ${deckName || "your deck"}?`,
              ],
              challenge: [
                `You're back — ready to go? Quiz or specific question?`,
                `Hey again. Let's pick up where we left off. What do you want to hit?`,
                `Welcome back. Want me to throw some hard ones at you from ${deckName || "your deck"}?`,
              ],
              balanced: [
                `Hey, welcome back! What do you want to focus on today?`,
                `Good to see you again. What are we working on in ${deckName || "your deck"}?`,
                `Back for more! Quiz, review, or do you have a specific question?`,
              ],
            };
            const greetings = returningGreetings[empathyState.mode] || returningGreetings.balanced;
            firstMsg = greetings[Math.floor(Math.random() * greetings.length)];
          } else if (empathyState.mode === "nurture") {
            firstMsg = `Hey! I'm Nova. What do you need help with? We can go through your ${deckName || "deck"} together, or if there's something specific bugging you, just tell me.`;
          } else if (empathyState.mode === "challenge") {
            firstMsg = `Hey! I'm Nova. What are we working on? I can quiz you on ${deckName || "your deck"}, or if you've got a specific problem, throw it at me.`;
          } else {
            firstMsg = `Hey! I'm Nova. What do you want to work on? I can quiz you from your ${deckName || "deck"}, or if you've got a specific question or problem, let's dig into that.`;
          }
        }

        const overrides = {
          agent: {
            prompt: { prompt: systemPrompt },
            firstMessage: firstMsg,
          },
          dynamicVariables: {
            deck_name: deckName || "your study deck",
          },
        };

        console.log("Nova isReturning:", isReturning, "| mode:", empathyState.mode);
        console.log("Nova firstMsg:", firstMsg);

        await conversation.startSession({
          agentId: AGENT_ID,
          overrides,
        });
      } catch (error) {
        console.error("Failed to start conversation:", error);
        setErrorMsg(
          error?.message?.includes("Permission")
            ? "Microphone access is required for voice tutoring. Please allow microphone access and try again."
            : error?.message || "Failed to connect to voice tutor"
        );
        setStatus("error");
      }
    },
    [conversation]
  );

  const stopConversation = useCallback(async () => {
    try {
      await conversation.endSession();
    } catch (e) {
      console.error("Error ending session:", e);
    }
    setStatus("idle");
    setCurrentCard(null);
  }, [conversation]);

  // Store conversation ref for cleanup
  useEffect(() => {
    conversationRef.current = conversation;
  }, [conversation]);

  // Clean up session when component unmounts (user switches tabs)
  useEffect(() => {
    return () => {
      try {
        conversationRef.current?.endSession();
      } catch (e) {
        // ignore cleanup errors
      }
    };
  }, []);

  // Pick a random card if none selected
  const randomCard = cards[Math.floor(Math.random() * cards.length)];

  return (
    <div className="space-y-6">
      {/* Status banner */}
      {status === "connected" && (
        <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <i className="fa-solid fa-microphone text-green-600 dark:text-green-400 text-xl" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full animate-pulse" />
            </div>
            <div>
              <p className="text-green-800 dark:text-green-200 font-medium">
                Voice Tutor Active
              </p>
              <p className="text-green-600 dark:text-green-400 text-sm">
                {conversation.isSpeaking
                  ? "Tutor is speaking..."
                  : "Listening... ask a question"}
              </p>
            </div>
          </div>
          <button
            onClick={stopConversation}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
          >
            <i className="fa-solid fa-stop" />
            End Session
          </button>
        </div>
      )}

      {/* Error message */}
      {errorMsg && (
        <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4">
          <p className="text-red-700 dark:text-red-300 text-sm">
            <i className="fa-solid fa-triangle-exclamation mr-2" />
            {errorMsg}
          </p>
          <button
            onClick={() => {
              setErrorMsg("");
              setStatus("idle");
            }}
            className="mt-2 text-sm text-red-600 dark:text-red-400 underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Not connected — show card picker */}
      {status !== "connected" && (
        <div className="text-center space-y-6">
          {/* Hero section */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <i className="fa-solid fa-headset text-2xl text-indigo-600 dark:text-indigo-400" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Voice Tutor
            </h2>
            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Have a real-time voice conversation with an AI study tutor. Ask
              questions, get quizzed, and learn through the Socratic method.
            </p>

            {/* Quick start options */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => startConversation(null)}
                disabled={status === "connecting"}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                {status === "connecting" ? (
                  <>
                    <i className="fa-solid fa-spinner fa-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-microphone" />
                    Free Study Session
                  </>
                )}
              </button>
              <button
                onClick={() => startConversation(randomCard)}
                disabled={status === "connecting"}
                className="px-6 py-3 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-shuffle" />
                Random Card Quiz
              </button>
            </div>
          </div>

          {/* Card picker with search */}
          <CardPicker cards={cards} status={status} onSelectCard={startConversation} />
        </div>
      )}

      {/* Connected — show current card context + audio visualizer */}
      {status === "connected" && currentCard && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-indigo-100 dark:bg-indigo-900 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
              <i className="fa-solid fa-book text-indigo-600 dark:text-indigo-400 text-sm" />
            </div>
            <div>
              <p className="text-xs text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">
                Studying
              </p>
              <p className="text-sm text-gray-800 dark:text-gray-200 font-medium">
                {currentCard.front}
              </p>
              <p className="text-xs text-indigo-500 dark:text-indigo-400 mt-1">
                {currentCard.category}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Audio visualizer when connected */}
      {status === "connected" && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col items-center justify-center min-h-[200px]">
          {/* Pulsing circles visualizer */}
          <div className="relative w-32 h-32 mb-6">
            <div
              className={`absolute inset-0 rounded-full border-2 ${
                conversation.isSpeaking
                  ? "border-indigo-400 animate-ping"
                  : "border-gray-300 dark:border-gray-600"
              }`}
            />
            <div
              className={`absolute inset-2 rounded-full border-2 ${
                conversation.isSpeaking
                  ? "border-indigo-500 animate-pulse"
                  : "border-gray-300 dark:border-gray-600"
              }`}
            />
            <div
              className={`absolute inset-4 rounded-full flex items-center justify-center ${
                conversation.isSpeaking
                  ? "bg-indigo-100 dark:bg-indigo-900"
                  : "bg-green-100 dark:bg-green-900"
              }`}
            >
              <i
                className={`text-3xl ${
                  conversation.isSpeaking
                    ? "fa-solid fa-volume-high text-indigo-600 dark:text-indigo-400"
                    : "fa-solid fa-microphone text-green-600 dark:text-green-400"
                }`}
              />
            </div>
          </div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            {conversation.isSpeaking
              ? "Tutor is explaining..."
              : "Listening... speak when ready"}
          </p>

          {/* Quick action buttons during conversation */}
          <div className="flex gap-2 mt-4">
            <button
              onClick={() =>
                startConversation(
                  cards[Math.floor(Math.random() * cards.length)]
                )
              }
              className="px-3 py-1.5 text-xs bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300 rounded-lg hover:bg-indigo-200 dark:hover:bg-indigo-800 transition-colors"
            >
              <i className="fa-solid fa-forward mr-1" />
              Next Card
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
