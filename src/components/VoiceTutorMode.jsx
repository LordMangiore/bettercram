import { useState, useCallback, useEffect, useRef, useMemo } from "react";
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

  // Derive deck stats for display
  const deckCategories = useMemo(() => {
    return [...new Set(cards.map(c => c.category).filter(Boolean))];
  }, [cards]);

  // ===== CONNECTING =====
  if (status === "connecting") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
        <div className="flex flex-col items-center gap-8 text-center">
          <div className="relative w-32 h-32 flex items-center justify-center">
            <div className="absolute inset-0 rounded-full border-2 border-indigo-400/60" style={{ animation: "nova-ring 1.5s ease-out infinite" }} />
            <div className="absolute inset-0 rounded-full border-2 border-indigo-300/40" style={{ animation: "nova-ring-delay 1.5s ease-out 0.4s infinite" }} />
            <div className="absolute inset-0 rounded-full border border-indigo-200/30" style={{ animation: "nova-ring-delay 1.5s ease-out 0.8s infinite" }} />
            <div className="relative w-32 h-32 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center z-10" style={{ animation: "nova-glow 2s ease-in-out infinite" }}>
              <span className="text-white text-4xl font-bold">N</span>
            </div>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Calling Nova...</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">Getting your session ready</p>
          </div>
          <button onClick={() => setStatus("idle")} className="px-5 py-2 text-sm text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            Cancel
          </button>
        </div>
      </div>
    );
  }

  // ===== ERROR =====
  if (status === "error") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
        <div className="flex flex-col items-center gap-6 text-center">
          <div className="w-28 h-28 rounded-full bg-red-500/10 flex items-center justify-center">
            <i className="fa-solid fa-phone-slash text-red-500 text-3xl" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Couldn't connect</h2>
            <p className="text-sm text-red-500 dark:text-red-400 mt-1 max-w-xs">{errorMsg}</p>
          </div>
          <button onClick={() => { setErrorMsg(""); setStatus("idle"); }} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-medium transition-colors">
            Try again
          </button>
        </div>
      </div>
    );
  }

  // ===== CONNECTED =====
  if (status === "connected") {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] px-4">
        <div className="flex flex-col items-center gap-8 text-center">
          <div className="relative w-36 h-36 flex items-center justify-center">
            {conversation.isSpeaking && (
              <>
                <div className="absolute inset-0 rounded-full border-2 border-indigo-400/50" style={{ animation: "nova-ring 1.8s ease-out infinite" }} />
                <div className="absolute inset-0 rounded-full border border-indigo-300/30" style={{ animation: "nova-ring-delay 1.8s ease-out 0.4s infinite" }} />
              </>
            )}
            <div
              className={`relative w-28 h-28 rounded-full flex items-center justify-center z-10 transition-all duration-500 ${
                conversation.isSpeaking ? "bg-gradient-to-br from-indigo-500 to-violet-600 scale-100" : "bg-gradient-to-br from-emerald-500 to-green-600 scale-95"
              }`}
              style={conversation.isSpeaking ? { animation: "nova-glow 2s ease-in-out infinite" } : undefined}
            >
              <i className={`text-white text-3xl transition-all duration-300 ${conversation.isSpeaking ? "fa-solid fa-volume-high" : "fa-solid fa-microphone"}`} />
            </div>
          </div>
          <div>
            <p className="text-base font-semibold text-gray-800 dark:text-gray-200">
              {conversation.isSpeaking ? "Nova is speaking..." : "Listening..."}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{deckName || "Study session"}</p>
          </div>
          <button onClick={stopConversation} className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 active:scale-90 transition-all flex items-center justify-center shadow-lg shadow-red-500/20">
            <i className="fa-solid fa-phone-slash text-white text-xl" />
          </button>
        </div>
      </div>
    );
  }

  // ===== IDLE — Nova's profile page =====
  return (
    <div className="max-w-lg mx-auto px-4 pt-4 pb-12">

      {/* Nova avatar + identity */}
      <div className="flex flex-col items-center text-center mb-6">
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center mb-4 shadow-lg shadow-indigo-500/25">
          <span className="text-white text-4xl font-bold select-none">N</span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Nova</h2>
        <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5 italic">"Tell me what you're stuck on."</p>
      </div>

      {/* Nova's bio / personality */}
      <div className="bg-white/60 dark:bg-white/[0.04] backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-white/[0.06] p-5 mb-4">
        <p className="text-[13px] leading-relaxed text-gray-600 dark:text-gray-400">
          I'm your voice study partner. I adapt to how you learn — if you need hand-holding, I'll walk you through it. If you just need a quick answer, I won't waste your time with twenty questions. I quiz from your actual cards, not made-up stuff, and I'll push back when you're guessing instead of thinking.
        </p>
      </div>

      {/* Teaching style traits */}
      <div className="grid grid-cols-2 gap-2.5 mb-4">
        {[
          { icon: "fa-bolt", label: "Adapts to your pace", bg: "from-amber-500/10 to-orange-500/10 dark:from-amber-500/10 dark:to-orange-500/10", color: "text-amber-600 dark:text-amber-400" },
          { icon: "fa-ear-listen", label: "Listens first, teaches second", bg: "from-emerald-500/10 to-green-500/10 dark:from-emerald-500/10 dark:to-green-500/10", color: "text-emerald-600 dark:text-emerald-400" },
          { icon: "fa-fire", label: "Pushes you when you're ready", bg: "from-rose-500/10 to-pink-500/10 dark:from-rose-500/10 dark:to-pink-500/10", color: "text-rose-500 dark:text-rose-400" },
          { icon: "fa-layer-group", label: "Uses your real cards", bg: "from-indigo-500/10 to-violet-500/10 dark:from-indigo-500/10 dark:to-violet-500/10", color: "text-indigo-600 dark:text-indigo-400" },
        ].map(t => (
          <div key={t.label} className={`bg-gradient-to-br ${t.bg} rounded-xl p-3.5 border border-gray-200/40 dark:border-white/[0.04]`}>
            <i className={`fa-solid ${t.icon} ${t.color} text-sm mb-2 block`} />
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 leading-snug">{t.label}</p>
          </div>
        ))}
      </div>

      {/* Current deck context — compact */}
      <div className="bg-white/60 dark:bg-white/[0.04] backdrop-blur-sm rounded-2xl border border-gray-200/60 dark:border-white/[0.06] px-5 py-4 mb-6 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500/15 to-violet-500/15 flex items-center justify-center flex-shrink-0">
          <i className="fa-solid fa-layer-group text-indigo-500 dark:text-indigo-400 text-sm" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{deckName || "Your Deck"}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {cards.length} cards
            {deckCategories.length > 0 && <span> across {deckCategories.length} {deckCategories.length === 1 ? "topic" : "topics"}</span>}
          </p>
        </div>
      </div>

      {/* Call button */}
      <button
        onClick={startConversation}
        className="w-full py-4 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.98] text-white rounded-2xl font-semibold text-base transition-all shadow-lg shadow-indigo-500/25 flex items-center justify-center gap-3"
      >
        <i className="fa-solid fa-phone" />
        Talk to Nova
      </button>

      {/* Error */}
      {errorMsg && (
        <div className="mt-4 bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
          <p className="text-red-600 dark:text-red-400 text-sm">{errorMsg}</p>
          <button onClick={() => setErrorMsg("")} className="mt-2 text-xs text-red-500 underline">Dismiss</button>
        </div>
      )}
    </div>
  );
}
