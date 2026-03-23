import { useState, useCallback, useEffect, useRef } from "react";
import { useConversation } from "@11labs/react";

const AGENT_ID = "agent_3101kmc104q3f1ksrtqgzwhxjj1v";

export default function VoiceTutorMode({ cards }) {
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

        // Request microphone permission
        await navigator.mediaDevices.getUserMedia({ audio: true });

        // Build context from the selected card
        const overrides = {};
        if (card) {
          overrides.agent = {
            prompt: {
              prompt: `You are an expert study tutor. The student is currently studying this flashcard:

Question: ${card.front}
Answer: ${card.back}
Category: ${card.category}

Start by asking the student what they know about this topic. Use the Socratic method - ask probing questions before giving answers. Keep responses concise and conversational. Be encouraging but honest when answers are wrong. Highlight common exam traps and misconceptions.`,
            },
            firstMessage: `Hey! I see you're studying ${card.category}. Let me ask you - ${card.front.length > 100 ? "what do you know about this concept?" : card.front}`,
          };
        }

        await conversation.startSession({
          agentId: AGENT_ID,
          ...overrides,
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

          {/* Card picker */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-4">
              Or pick a specific card to discuss
            </h3>
            <div className="max-h-64 overflow-y-auto space-y-2 scrollbar-hide">
              {cards.slice(0, 50).map((card, i) => (
                <button
                  key={i}
                  onClick={() => startConversation(card)}
                  disabled={status === "connecting"}
                  className="w-full text-left p-3 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors border border-transparent hover:border-indigo-200 dark:hover:border-indigo-800 disabled:opacity-50"
                >
                  <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2">
                    {card.front}
                  </p>
                  <span className="text-xs text-gray-400 dark:text-gray-500 mt-1 inline-block">
                    {card.category}
                  </span>
                </button>
              ))}
              {cards.length > 50 && (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-2">
                  Showing first 50 cards. Use category filter to narrow down.
                </p>
              )}
            </div>
          </div>
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
