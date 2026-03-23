import { useState, useEffect, useRef } from "react";
import { textToSpeech } from "../api";

const difficultyColors = {
  easy: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  hard: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export default function FlashCard({ card, onKnown, onUnknown, showActions, cardKey }) {
  const [flipped, setFlipped] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    setFlipped(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setSpeaking(false);
    }
  }, [cardKey]);

  async function handleSpeak(e, text) {
    e.stopPropagation();
    if (speaking) {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      setSpeaking(false);
      return;
    }
    setSpeaking(true);
    try {
      const audioUrl = await textToSpeech(text);
      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => {
        setSpeaking(false);
        URL.revokeObjectURL(audioUrl);
      };
      audio.play();
      // Precache the other side
      const otherText = text === card.front ? card.back : card.front;
      textToSpeech(otherText).catch(() => {});
    } catch (err) {
      console.error("TTS error:", err);
      setSpeaking(false);
    }
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <div
        className="w-full cursor-pointer select-none"
        onClick={() => setFlipped(!flipped)}
      >
        {!flipped ? (
          <div className="w-full min-h-[280px] bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/50 px-2 py-1 rounded-full">
                  {card.category}
                </span>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${difficultyColors[card.difficulty] || ""}`}>
                  {card.difficulty}
                </span>
                {card.custom && (
                  <span className="text-xs font-medium px-2 py-1 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                    Custom
                  </span>
                )}
              </div>
              <p className="text-lg text-gray-800 dark:text-gray-100 font-medium leading-relaxed">
                {card.front}
              </p>
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-4 text-center">
              <i className="fa-solid fa-hand-pointer mr-1" /> Tap to reveal answer
            </p>
          </div>
        ) : (
          <div className="w-full min-h-[280px] bg-indigo-50 dark:bg-indigo-950 rounded-2xl shadow-lg border border-indigo-200 dark:border-indigo-800 p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50 px-2 py-1 rounded-full">
                  Answer
                </span>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${difficultyColors[card.difficulty] || ""}`}>
                  {card.difficulty}
                </span>
              </div>
              <p className="text-lg text-gray-800 dark:text-gray-100 leading-relaxed">
                {card.back}
              </p>
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-4 text-center">
              <i className="fa-solid fa-hand-pointer mr-1" /> Tap to see question
            </p>
          </div>
        )}
      </div>

      {/* TTS button */}
      <div className="flex justify-center mt-4">
        <button
          onClick={(e) => handleSpeak(e, flipped ? card.back : card.front)}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
            speaking
              ? "bg-indigo-200 dark:bg-indigo-800 text-indigo-700 dark:text-indigo-300 animate-pulse"
              : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          }`}
        >
          <i className={`fa-solid ${speaking ? "fa-stop" : "fa-volume-high"}`} />
          {speaking ? "Stop" : `Listen to ${flipped ? "answer" : "question"}`}
        </button>
      </div>

      {showActions && flipped && (
        <div className="flex gap-4 justify-center mt-4">
          <button
            onClick={(e) => { e.stopPropagation(); setFlipped(false); onUnknown?.(); }}
            className="px-6 py-3 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-xl font-medium hover:bg-red-200 dark:hover:bg-red-900 transition-colors"
          >
            <i className="fa-solid fa-rotate-left mr-2" />Still Learning
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setFlipped(false); onKnown?.(); }}
            className="px-6 py-3 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-xl font-medium hover:bg-green-200 dark:hover:bg-green-900 transition-colors"
          >
            <i className="fa-solid fa-check mr-2" />Got It!
          </button>
        </div>
      )}
    </div>
  );
}
