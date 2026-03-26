import { useState, useEffect, useRef, useCallback } from "react";
import FlashCard from "./FlashCard";
import { ShuffleIcon, ChevronLeftIcon, ChevronRightIcon } from "./Icons";

export default function FlipMode({ cards, onRegenCard }) {
  const [index, setIndex] = useState(0);
  const [deck, setDeck] = useState(cards);
  const [shuffled, setShuffled] = useState(false);
  const [slideDir, setSlideDir] = useState(null); // "left" | "right" | null
  const pendingIndexRef = useRef(null);
  const touchStart = useRef(null);

  useEffect(() => {
    setDeck(shuffled ? shuffle([...cards]) : cards);
    setIndex(0);
  }, [cards]);

  const goNext = useCallback(() => {
    if (slideDir) return;
    const nextIdx = Math.min(index + 1, deck.length - 1);
    if (nextIdx === index) return;
    pendingIndexRef.current = nextIdx;
    setSlideDir("left");
  }, [index, deck.length, slideDir]);

  const goPrev = useCallback(() => {
    if (slideDir) return;
    const prevIdx = Math.max(index - 1, 0);
    if (prevIdx === index) return;
    pendingIndexRef.current = prevIdx;
    setSlideDir("right");
  }, [index, slideDir]);

  function handleSlideEnd() {
    const nextIdx = pendingIndexRef.current;
    pendingIndexRef.current = null;
    setSlideDir(null);
    if (nextIdx != null) setIndex(nextIdx);
  }

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e) {
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        goNext();
      } else if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        goPrev();
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goNext, goPrev]);

  // Swipe support
  function handleTouchStart(e) {
    touchStart.current = e.touches[0].clientX;
  }

  function handleTouchEnd(e) {
    if (touchStart.current === null) return;
    const diff = touchStart.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) goNext();
      else goPrev();
    }
    touchStart.current = null;
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function handleShuffle() {
    setDeck(shuffle([...cards]));
    setIndex(0);
    setShuffled(true);
  }

  if (deck.length === 0) return <p className="text-gray-500">No cards to display.</p>;

  const card = deck[index];

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Card with slide animation */}
      <div className="overflow-hidden rounded-2xl">
        <div
          className={slideDir === "left" ? "animate-slide-out-left" : slideDir === "right" ? "animate-slide-out-right" : "animate-slide-in"}
          onAnimationEnd={handleSlideEnd}
        >
          <FlashCard card={card} cardKey={`flip-${index}-${card.front.slice(0, 20)}`} onRegenCard={onRegenCard} />
        </div>
      </div>

      {/* Progress bar */}
      <div className="mt-4 mb-2">
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
          <div
            className="bg-indigo-500 h-1.5 rounded-full transition-all"
            style={{ width: `${((index + 1) / deck.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-gray-400 dark:text-gray-500">
          {index + 1} / {deck.length}
        </span>
        <button
          onClick={handleShuffle}
          className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg transition-colors ${
            shuffled
              ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400"
              : "text-gray-400 dark:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700"
          }`}
          title="Shuffle cards"
        >
          <ShuffleIcon className="text-xs" /> Shuffle
        </button>
      </div>

      <div className="flex gap-3 justify-center">
        <button
          disabled={index === 0}
          onClick={goPrev}
          className="px-5 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-40 flex items-center gap-2 text-sm"
        >
          <ChevronLeftIcon className="text-xs" /> Previous
        </button>
        <button
          disabled={index === deck.length - 1}
          onClick={goNext}
          className="px-5 py-2.5 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 rounded-xl font-medium hover:bg-indigo-200 dark:hover:bg-indigo-800/40 transition-colors disabled:opacity-40 flex items-center gap-2 text-sm"
        >
          Next <ChevronRightIcon className="text-xs" />
        </button>
      </div>

      <p className="text-center text-[11px] text-gray-400 dark:text-gray-500 mt-3">
        <i className="fa-solid fa-keyboard mr-1" /> Arrow keys or swipe to navigate · Spacebar to flip
      </p>
    </div>
  );
}
