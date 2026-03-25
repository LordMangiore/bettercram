import { useState, useRef, useCallback, useEffect } from "react";
import { audioSession } from "../api";

// In-memory cache so we don't re-fetch audio we've already generated this session
const audioCache = new Map();

function cacheKey(card, mode) {
  return `${mode}:${card.front.slice(0, 60)}`;
}

const LAST_PLAYED_KEY = "bettercram_audio_lastPlayed";

function saveLastPlayed(mode, idx) {
  try {
    localStorage.setItem(LAST_PLAYED_KEY, JSON.stringify({ mode, idx, ts: Date.now() }));
  } catch {}
}

function loadLastPlayed() {
  try {
    return JSON.parse(localStorage.getItem(LAST_PLAYED_KEY));
  } catch {
    return null;
  }
}

export default function AudioMode({ cards }) {
  const [playerState, setPlayerState] = useState("idle"); // idle | loading | playing | paused
  const [currentIdx, setCurrentIdx] = useState(0);
  const [mode, setMode] = useState("podcast");
  const [script, setScript] = useState("");
  const [autoPlay, setAutoPlay] = useState(true);
  const [shuffled, setShuffled] = useState(false);
  const [shuffleOrder, setShuffleOrder] = useState([]);
  const [audioProgress, setAudioProgress] = useState(0);
  const autoPlayRef = useRef(true);
  const audioRef = useRef(null);
  const stoppedRef = useRef(false);
  const scriptContainerRef = useRef(null);
  const userScrolledRef = useRef(false);
  const scrollTimeoutRef = useRef(null);

  // Restore last played position on mount
  useEffect(() => {
    const saved = loadLastPlayed();
    if (saved && saved.idx < cards.length) {
      setCurrentIdx(saved.idx);
      if (saved.mode) setMode(saved.mode);
    }
  }, [cards.length]);

  // Stop audio when switching away from this tab
  useEffect(() => {
    function handleStopAudio() {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      stoppedRef.current = true;
      setPlayerState("idle");
    }
    window.addEventListener("bc-stop-audio", handleStopAudio);
    return () => window.removeEventListener("bc-stop-audio", handleStopAudio);
  }, []);

  // Generate shuffle order
  function doShuffle() {
    const order = cards.map((_, i) => i);
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    setShuffleOrder(order);
    setShuffled(true);
    setCurrentIdx(0);
  }

  function unShuffle() {
    setShuffled(false);
    setShuffleOrder([]);
    setCurrentIdx(0);
  }

  // Map display index to actual card index
  function actualIdx(displayIdx) {
    if (shuffled && shuffleOrder.length > 0) return shuffleOrder[displayIdx];
    return displayIdx;
  }

  const fetchOrCacheAudio = useCallback(async (card, audioMode) => {
    const key = cacheKey(card, audioMode);
    if (audioCache.has(key)) {
      return audioCache.get(key);
    }
    const result = await audioSession(card, audioMode);
    audioCache.set(key, result);
    return result;
  }, []);

  // Find next uncached card index (from current position)
  function findNextUncached(fromIdx) {
    for (let i = fromIdx; i < cards.length; i++) {
      const aIdx = actualIdx(i);
      if (!audioCache.has(cacheKey(cards[aIdx], mode))) return i;
    }
    return fromIdx; // all cached, just stay
  }

  async function playCard(idx) {
    if (idx >= cards.length) {
      setPlayerState("idle");
      setCurrentIdx(0);
      return;
    }

    const aIdx = actualIdx(idx);
    stoppedRef.current = false;
    setCurrentIdx(idx);
    if (window.plausible) window.plausible("Podcast Play", { props: { mode } });
    setPlayerState("loading");
    setScript("");
    saveLastPlayed(mode, idx);

    try {
      const { audioUrl, script: s } = await fetchOrCacheAudio(cards[aIdx], mode);
      if (stoppedRef.current) return;

      setScript(s);

      // Precache next card while this one plays
      if (idx + 1 < cards.length) {
        const nextAIdx = actualIdx(idx + 1);
        fetchOrCacheAudio(cards[nextAIdx], mode).catch(() => {});
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      setPlayerState("playing");
      setAudioProgress(0);

      audio.ontimeupdate = () => {
        if (audio.duration) {
          setAudioProgress(audio.currentTime / audio.duration);
        }
      };

      audio.onended = () => {
        setAudioProgress(1);
        if (autoPlayRef.current && !stoppedRef.current) {
          playCard(idx + 1);
        } else {
          setPlayerState("idle");
        }
      };
      audio.play();
    } catch (e) {
      console.error("Audio error:", e);
      setPlayerState("idle");
    }
  }

  function togglePause() {
    if (!audioRef.current) return;
    if (playerState === "playing") {
      audioRef.current.pause();
      setPlayerState("paused");
    } else if (playerState === "paused") {
      audioRef.current.play();
      setPlayerState("playing");
    }
  }

  function stopPlayback() {
    stoppedRef.current = true;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayerState("idle");
  }

  function skipNext() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    playCard(currentIdx + 1);
  }

  function skipPrev() {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    playCard(Math.max(0, currentIdx - 1));
  }

  const aIdx = actualIdx(currentIdx);
  const card = cards[aIdx];
  const isActive = playerState !== "idle";
  const cachedCount = [...audioCache.keys()].filter((k) => k.startsWith(mode)).length;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
          <i className="fa-solid fa-headphones text-indigo-600 dark:text-indigo-400 mr-2" />
          Audio Study
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Hands-free study — listen while commuting, exercising, or relaxing
        </p>

        {/* Mode selector */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setMode("podcast")}
            disabled={isActive}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
              mode === "podcast"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            <i className="fa-solid fa-podcast mr-1.5" />
            Podcast Mode
          </button>
          <button
            onClick={() => setMode("readthrough")}
            disabled={isActive}
            className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
              mode === "readthrough"
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            <i className="fa-solid fa-list-check mr-1.5" />
            Read Through
          </button>
        </div>

        {/* Options row */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={autoPlay}
              onChange={(e) => { setAutoPlay(e.target.checked); autoPlayRef.current = e.target.checked; }}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <i className="fa-solid fa-forward mr-0.5" />
            Auto-play next
          </label>
          <div className="flex items-center gap-2">
            {/* Shuffle */}
            <button
              onClick={shuffled ? unShuffle : doShuffle}
              disabled={isActive}
              className={`text-xs px-2.5 py-1 rounded-full transition-colors disabled:opacity-50 ${
                shuffled
                  ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-300"
                  : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
              }`}
            >
              <i className="fa-solid fa-shuffle mr-1" />
              {shuffled ? "Shuffled" : "Shuffle"}
            </button>
            {/* Skip to uncached */}
            {cachedCount > 0 && cachedCount < cards.length && (
              <button
                onClick={() => {
                  const next = findNextUncached(currentIdx);
                  setCurrentIdx(next);
                  if (isActive) playCard(next);
                }}
                disabled={playerState === "loading"}
                className="text-xs px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors disabled:opacity-50"
              >
                <i className="fa-solid fa-forward-fast mr-1" />
                Skip to new
              </button>
            )}
            {cachedCount > 0 && (
              <span className="text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full">
                <i className="fa-solid fa-bolt mr-1" />
                {cachedCount} cached
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Now playing */}
      {card && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs text-gray-400">
              Card {currentIdx + 1} of {cards.length}
              {shuffled && <span className="ml-1 text-indigo-400">(shuffled)</span>}
            </span>
            <div className="flex items-center gap-2">
              {audioCache.has(cacheKey(card, mode)) && (
                <span className="text-xs text-green-500">
                  <i className="fa-solid fa-bolt" /> cached
                </span>
              )}
              <span className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-full">
                {card.category}
              </span>
            </div>
          </div>

          <p className="text-sm font-medium text-gray-800 dark:text-white mb-2">{card.front}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400">{card.back}</p>

          {/* Progress bar */}
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-4">
            <div
              className="bg-indigo-500 h-1.5 rounded-full transition-all"
              style={{ width: `${((currentIdx + 1) / cards.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Script preview — scrollable with live tracking */}
      {script && mode === "podcast" && (
        <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800 p-4 mb-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 uppercase">
              <i className="fa-solid fa-scroll mr-1" />
              Script
            </p>
            {playerState === "playing" && (
              <p className="text-[10px] text-indigo-400 dark:text-indigo-500">
                <i className="fa-solid fa-circle text-green-500 mr-1 animate-pulse text-[6px]" />
                Live tracking
              </p>
            )}
          </div>
          {/* Progress bar */}
          {(playerState === "playing" || playerState === "paused") && (
            <div className="w-full h-1 bg-indigo-200 dark:bg-indigo-800 rounded-full mb-3 overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-300"
                style={{ width: `${audioProgress * 100}%` }}
              />
            </div>
          )}
          <div
            ref={scriptContainerRef}
            className="max-h-64 overflow-y-auto text-sm leading-relaxed scroll-smooth"
            style={{ scrollbarWidth: "thin" }}
            onScroll={() => {
              // Mark that user is manually scrolling
              userScrolledRef.current = true;
              // Reset after 3 seconds of no scrolling — resume auto-scroll
              clearTimeout(scrollTimeoutRef.current);
              scrollTimeoutRef.current = setTimeout(() => {
                userScrolledRef.current = false;
              }, 3000);
            }}
          >
            {(() => {
              // Split script into sentences for tracking
              const sentences = script.split(/(?<=[.!?])\s+/).filter(Boolean);
              const activeSentenceIdx = Math.min(
                Math.floor(audioProgress * sentences.length),
                sentences.length - 1
              );
              return sentences.map((sentence, i) => {
                const isActive = i === activeSentenceIdx && (playerState === "playing" || playerState === "paused");
                const isPast = i < activeSentenceIdx && (playerState === "playing" || playerState === "paused");
                return (
                  <span
                    key={i}
                    ref={isActive ? (el) => {
                      // Only auto-scroll if user hasn't manually scrolled
                      if (el && scriptContainerRef.current && playerState === "playing" && !userScrolledRef.current) {
                        const container = scriptContainerRef.current;
                        const elTop = el.offsetTop - container.offsetTop;
                        container.scrollTo({ top: elTop - 60, behavior: "smooth" });
                      }
                    } : undefined}
                    className={`inline transition-colors duration-300 ${
                      isActive
                        ? "text-indigo-700 dark:text-indigo-300 font-medium bg-indigo-100 dark:bg-indigo-800/40 rounded px-0.5"
                        : isPast
                        ? "text-gray-400 dark:text-gray-500"
                        : "text-gray-700 dark:text-gray-300"
                    }`}
                  >
                    {sentence}{" "}
                  </span>
                );
              });
            })()}
          </div>
        </div>
      )}

      {/* Loading */}
      {playerState === "loading" && (
        <div className="text-center py-4">
          <i className="fa-solid fa-spinner fa-spin text-xl text-indigo-600 mb-2 block" />
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {mode === "podcast" ? "Claude is writing, ElevenLabs is recording..." : "Generating audio..."}
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center justify-center gap-4 mt-4">
        <button
          onClick={skipPrev}
          disabled={currentIdx === 0 || playerState === "loading"}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 transition-colors"
        >
          <i className="fa-solid fa-backward-step text-lg" />
        </button>

        {/* Main play/pause/stop button */}
        {playerState === "idle" ? (
          <button
            onClick={() => playCard(currentIdx)}
            disabled={cards.length === 0}
            className="w-16 h-16 flex items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <i className="fa-solid fa-play text-xl ml-1" />
          </button>
        ) : playerState === "loading" ? (
          <button
            onClick={stopPlayback}
            className="w-16 h-16 flex items-center justify-center rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 transition-colors"
          >
            <i className="fa-solid fa-spinner fa-spin text-xl" />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={togglePause}
              className="w-16 h-16 flex items-center justify-center rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
            >
              <i className={`fa-solid ${playerState === "playing" ? "fa-pause" : "fa-play ml-1"} text-xl`} />
            </button>
            <button
              onClick={stopPlayback}
              className="w-10 h-10 flex items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-800/30 transition-colors"
            >
              <i className="fa-solid fa-stop" />
            </button>
          </div>
        )}

        <button
          onClick={skipNext}
          disabled={currentIdx >= cards.length - 1 || playerState === "loading"}
          className="w-12 h-12 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-30 transition-colors"
        >
          <i className="fa-solid fa-forward-step text-lg" />
        </button>
      </div>

      <p className="text-center text-xs text-gray-400 mt-3">
        {mode === "podcast"
          ? "Claude explains each concept, ElevenLabs narrates"
          : "Each card's Q&A read aloud"}
        {cachedCount > 0 && " • Previously played cards load instantly"}
      </p>
    </div>
  );
}
