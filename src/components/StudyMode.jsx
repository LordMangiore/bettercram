import { useState, useMemo } from "react";
import FlashCard from "./FlashCard";
import { RotateIcon } from "./Icons";

export default function StudyMode({ cards, progress, onUpdateProgress }) {
  const [pool, setPool] = useState(() => shuffle([...cards]));
  const [index, setIndex] = useState(0);
  const [sessionStats, setSessionStats] = useState({ known: 0, unknown: 0 });

  const stats = useMemo(() => {
    const known = cards.filter(
      (c) => (progress[cardKey(c)]?.score || 0) >= 3
    ).length;
    return {
      mastered: known,
      learning: cards.length - known,
      total: cards.length,
    };
  }, [cards, progress]);

  function cardKey(card) {
    return card.front.slice(0, 60);
  }

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function handleKnown() {
    const card = pool[index];
    const key = cardKey(card);
    const prev = progress[key] || { score: 0, lastSeen: null };
    onUpdateProgress(key, {
      score: Math.min(prev.score + 1, 5),
      lastSeen: Date.now(),
    });
    setSessionStats((s) => ({ ...s, known: s.known + 1 }));
    advance();
  }

  function handleUnknown() {
    const card = pool[index];
    const key = cardKey(card);
    const prev = progress[key] || { score: 0, lastSeen: null };
    onUpdateProgress(key, {
      score: Math.max(prev.score - 1, 0),
      lastSeen: Date.now(),
    });
    setSessionStats((s) => ({ ...s, unknown: s.unknown + 1 }));
    advance();
  }

  function advance() {
    if (index < pool.length - 1) {
      setIndex((i) => i + 1);
    } else {
      setPool(shuffle([...cards]));
      setIndex(0);
    }
  }

  function resetSession() {
    setPool(shuffle([...cards]));
    setIndex(0);
    setSessionStats({ known: 0, unknown: 0 });
  }

  if (pool.length === 0) return <p className="text-gray-500">No cards to study.</p>;

  const card = pool[index];
  const cardScore = progress[cardKey(card)]?.score || 0;

  return (
    <div>
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-green-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-green-700">
            <i className="fa-solid fa-circle-check mr-1 text-lg" />
            {stats.mastered}
          </p>
          <p className="text-xs text-green-600">Mastered</p>
        </div>
        <div className="bg-yellow-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-yellow-700">
            <i className="fa-solid fa-spinner mr-1 text-lg" />
            {stats.learning}
          </p>
          <p className="text-xs text-yellow-600">Learning</p>
        </div>
        <div className="bg-indigo-50 rounded-xl p-4 text-center">
          <p className="text-2xl font-bold text-indigo-700">
            <i className="fa-solid fa-layer-group mr-1 text-lg" />
            {sessionStats.known + sessionStats.unknown}
          </p>
          <p className="text-xs text-indigo-600">This Session</p>
        </div>
      </div>

      {/* Confidence meter */}
      <div className="flex items-center gap-2 mb-6">
        <span className="text-xs text-gray-500">
          <i className="fa-solid fa-signal mr-1" />
          Confidence:
        </span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <div
              key={n}
              className={`w-6 h-2 rounded-full ${n <= cardScore ? "bg-green-500" : "bg-gray-200"}`}
            />
          ))}
        </div>
      </div>

      <FlashCard
        card={card}
        cardKey={`study-${index}`}
        showActions
        onKnown={handleKnown}
        onUnknown={handleUnknown}
      />

      <div className="mt-6 text-center">
        <button
          onClick={resetSession}
          className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1.5 mx-auto"
        >
          <RotateIcon className="text-xs" /> Restart Session
        </button>
      </div>
    </div>
  );
}
