import { useState, useEffect, useRef, useCallback } from "react";
import FlashCard from "./FlashCard";
import { ShuffleIcon, ChevronLeftIcon, ChevronRightIcon } from "./Icons";

export default function FlipMode({ cards }) {
  const [index, setIndex] = useState(0);
  const [deck, setDeck] = useState(cards);
  const [shuffled, setShuffled] = useState(false);
  const touchStart = useRef(null);

  useEffect(() => {
    setDeck(shuffled ? shuffle([...cards]) : cards);
    setIndex(0);
  }, [cards]);

  const goNext = useCallback(() => {
    setIndex((i) => Math.min(i + 1, deck.length - 1));
  }, [deck.length]);

  const goPrev = useCallback(() => {
    setIndex((i) => Math.max(i - 1, 0));
  }, []);

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
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm text-gray-500">
          Card {index + 1} of {deck.length}
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={handleShuffle}
            className={`flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg transition-colors ${
              shuffled
                ? "bg-indigo-100 text-indigo-700"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
            title="Shuffle cards"
          >
            <ShuffleIcon className="text-xs" /> Shuffle
          </button>
          <div className="w-32 bg-gray-200 rounded-full h-2">
            <div
              className="bg-indigo-500 h-2 rounded-full transition-all"
              style={{ width: `${((index + 1) / deck.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <FlashCard card={card} cardKey={`flip-${index}-${card.front.slice(0, 20)}`} />

      <div className="flex gap-4 justify-center mt-8">
        <button
          disabled={index === 0}
          onClick={goPrev}
          className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-40 flex items-center gap-2"
        >
          <ChevronLeftIcon className="text-sm" /> Previous
        </button>
        <button
          disabled={index === deck.length - 1}
          onClick={goNext}
          className="px-6 py-3 bg-indigo-100 text-indigo-700 rounded-xl font-medium hover:bg-indigo-200 transition-colors disabled:opacity-40 flex items-center gap-2"
        >
          Next <ChevronRightIcon className="text-sm" />
        </button>
      </div>

      <p className="text-center text-xs text-gray-400 mt-4">
        <i className="fa-solid fa-keyboard mr-1" /> Use arrow keys or swipe to navigate
      </p>
    </div>
  );
}
