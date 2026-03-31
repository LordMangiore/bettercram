import { useState, useCallback, useEffect, useRef } from "react";
import { useConversation } from "@11labs/react";
import { computeExperienceWeight, generateEmpathyPrompt, getTimeContext, getObserverBrief, buildEmpathyContext } from "../lib/empathyEngine";

const AGENT_ID = "agent_3101kmc104q3f1ksrtqgzwhxjj1v";

function buildDeckContext(cards, maxCards = 50) {
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
    async () => {
      try {
        setStatus("connecting");
        setMessages([]);
        setErrorMsg("");
        if (window.plausible) window.plausible("Voice Tutor Started");

        await navigator.mediaDevices.getUserMedia({ audio: true });

        const { categories, cardList, total } = buildDeckContext(cards);

        const empathyState = computeExperienceWeight(cards, progress, sessionStats);
        const timeContext = getTimeContext();
        console.log("Nova Empathy Engine:", empathyState);

        const observerBriefPromise = getObserverBrief({
          empathyState,
          card: null,
          deckName,
          categories,
          userProfile: typeof window !== "undefined" ? (() => {
            try { return JSON.parse(localStorage.getItem("bc-user-profile") || "null"); } catch { return null; }
          })() : null,
        });

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

        const categoryContext = activeCategory && activeCategory !== "All"
          ? `\nSTUDY CONTEXT: The student was just studying "${activeCategory}" cards specifically. Focus your questions and discussion on ${activeCategory} topics. They switched to Voice Tutor from a study session on this category${sessionStats ? ` where they reviewed ${sessionStats.reviewed} cards with ${sessionStats.correct} correct and ${sessionStats.again} forgotten` : ""}.`
          : "";

        let isReturning = false;
        try {
          const userId = JSON.parse(localStorage.getItem("mcat-user"))?.id;
          const key = userId ? `bc-nova-last-session-${userId}` : "bc-nova-last-session";
          const lastNova = localStorage.getItem(key);
          if (lastNova) isReturning = true;
          localStorage.setItem(key, Date.now().toString());
        } catch {}

        const systemPrompt = `You are Nova, an expert study tutor helping a student with their ${deckName || "study"} deck.

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

        let firstMsg;
        if (isReturning) {
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
  }, [conversation]);

  useEffect(() => {
    conversationRef.current = conversation;
  }, [conversation]);

  useEffect(() => {
    return () => {
      try {
        conversationRef.current?.endSession();
      } catch (e) {
        // ignore cleanup errors
      }
    };
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">

      {/* ===== IDLE — Call button ===== */}
      {status === "idle" && (
        <div className="flex flex-col items-center gap-6 text-center">
          <button
            onClick={startConversation}
            className="group relative w-28 h-28 rounded-full bg-indigo-600 hover:bg-indigo-700 active:scale-95 transition-all duration-200 shadow-lg hover:shadow-xl hover:shadow-indigo-500/25 flex items-center justify-center"
          >
            <i className="fa-solid fa-phone text-white text-3xl group-hover:scale-110 transition-transform" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Call Nova</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
              {cards.length} cards from <span className="font-medium text-gray-700 dark:text-gray-300">{deckName || "your deck"}</span> ready to study
            </p>
          </div>

          {errorMsg && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl p-4 max-w-sm w-full">
              <p className="text-red-700 dark:text-red-300 text-sm">
                <i className="fa-solid fa-triangle-exclamation mr-2" />
                {errorMsg}
              </p>
              <button
                onClick={() => setErrorMsg("")}
                className="mt-2 text-sm text-red-600 dark:text-red-400 underline"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>
      )}

      {/* ===== CONNECTING — Calling animation ===== */}
      {status === "connecting" && (
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="relative w-28 h-28 flex items-center justify-center">
            {/* Radiating rings */}
            <div
              className="absolute inset-0 rounded-full border-2 border-indigo-400 dark:border-indigo-500"
              style={{ animation: "nova-ring 1.5s ease-out infinite" }}
            />
            <div
              className="absolute inset-0 rounded-full border-2 border-indigo-300 dark:border-indigo-600"
              style={{ animation: "nova-ring-delay 1.5s ease-out 0.4s infinite" }}
            />
            <div
              className="absolute inset-0 rounded-full border border-indigo-200 dark:border-indigo-700"
              style={{ animation: "nova-ring-delay 1.5s ease-out 0.8s infinite" }}
            />
            {/* Center avatar */}
            <div
              className="relative w-28 h-28 rounded-full bg-indigo-600 flex items-center justify-center z-10"
              style={{ animation: "nova-glow 2s ease-in-out infinite" }}
            >
              <i className="fa-solid fa-phone text-white text-3xl" />
            </div>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Calling Nova...</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Setting up your study session</p>
          </div>
          <button
            onClick={() => setStatus("idle")}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
          >
            Cancel
          </button>
        </div>
      )}

      {/* ===== ERROR (during connecting) ===== */}
      {status === "error" && (
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="w-28 h-28 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <i className="fa-solid fa-phone-slash text-red-500 dark:text-red-400 text-3xl" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Couldn't connect</h2>
            <p className="text-sm text-red-600 dark:text-red-400 mt-1 max-w-xs">{errorMsg}</p>
          </div>
          <button
            onClick={() => { setErrorMsg(""); setStatus("idle"); }}
            className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            Try again
          </button>
        </div>
      )}

      {/* ===== CONNECTED — Active call ===== */}
      {status === "connected" && (
        <div className="flex flex-col items-center gap-6 text-center">
          {/* Visualizer */}
          <div className="relative w-32 h-32 flex items-center justify-center">
            <div
              className={`absolute inset-0 rounded-full border-2 transition-colors duration-300 ${
                conversation.isSpeaking
                  ? "border-indigo-400 dark:border-indigo-500"
                  : "border-gray-200 dark:border-gray-700"
              }`}
              style={conversation.isSpeaking ? { animation: "nova-ring 1.8s ease-out infinite" } : undefined}
            />
            <div
              className={`absolute inset-2 rounded-full border-2 transition-colors duration-300 ${
                conversation.isSpeaking
                  ? "border-indigo-300 dark:border-indigo-600"
                  : "border-gray-200 dark:border-gray-700"
              }`}
              style={conversation.isSpeaking ? { animation: "nova-ring-delay 1.8s ease-out 0.3s infinite" } : undefined}
            />
            <div
              className={`relative w-24 h-24 rounded-full flex items-center justify-center z-10 transition-colors duration-300 ${
                conversation.isSpeaking
                  ? "bg-indigo-600"
                  : "bg-green-600"
              }`}
              style={conversation.isSpeaking ? { animation: "nova-glow 2s ease-in-out infinite" } : undefined}
            >
              <i
                className={`text-white text-3xl transition-all duration-300 ${
                  conversation.isSpeaking
                    ? "fa-solid fa-volume-high"
                    : "fa-solid fa-microphone"
                }`}
              />
            </div>
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {conversation.isSpeaking ? "Nova is speaking..." : "Listening..."}
            </p>
            {deckName && (
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Studying {deckName}
              </p>
            )}
          </div>

          {/* End call */}
          <button
            onClick={stopConversation}
            className="w-14 h-14 rounded-full bg-red-500 hover:bg-red-600 active:scale-95 transition-all flex items-center justify-center shadow-lg"
          >
            <i className="fa-solid fa-phone-slash text-white text-lg" />
          </button>
        </div>
      )}
    </div>
  );
}
