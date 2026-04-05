import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Rating } from "ts-fsrs";
import { textToSpeech } from "../api";
import DOMPurify from "dompurify";
import katex from "katex";
import "katex/dist/katex.min.css";

const difficultyColors = {
  easy: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  hard: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

function textSize(text) {
  if (!text) return "text-lg";
  const len = text.length;
  if (len > 500) return "text-sm leading-snug";
  if (len > 300) return "text-base leading-relaxed";
  return "text-lg leading-relaxed";
}

/**
 * Render LaTeX math in text. Handles:
 * - \(inline\) and \[display\] delimiters (Anki standard)
 * - $inline$ and $$display$$ delimiters
 * - \ce{chemistry} via mhchem-like handling
 * Returns HTML string with rendered math, or plain text if no math found.
 */
function renderMath(text) {
  if (!text) return { html: null, hasMath: false };

  // Quick check — skip expensive regex if no math delimiters
  if (!text.includes("\\(") && !text.includes("\\[") && !text.includes("$") && !text.includes("[$]")) {
    return { html: null, hasMath: false };
  }

  try {
    let result = text;

    // Anki-style delimiters: [$]...[/$] → convert to \(...\) first
    result = result.replace(/\[\$\]([\s\S]*?)\[\/\$\]/g, "\\($1\\)");
    // Anki display: [$$]...[/$$] → convert to \[...\]
    result = result.replace(/\[\$\$\]([\s\S]*?)\[\/\$\$\]/g, "\\[$1\\]");

    // Display math: \[...\] or $$...$$
    result = result.replace(/\\\[([\s\S]*?)\\\]/g, (_, math) => {
      try {
        return katex.renderToString(math.trim(), { displayMode: true, throwOnError: false, trust: true });
      } catch { return _; }
    });
    result = result.replace(/\$\$([\s\S]*?)\$\$/g, (_, math) => {
      try {
        return katex.renderToString(math.trim(), { displayMode: true, throwOnError: false, trust: true });
      } catch { return _; }
    });

    // Inline math: \(...\) or $...$
    result = result.replace(/\\\(([\s\S]*?)\\\)/g, (_, math) => {
      try {
        return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false, trust: true });
      } catch { return _; }
    });
    // Single $ — be careful not to match currency. Only match if both delimiters on same line.
    result = result.replace(/(?<!\$)\$(?!\$)([^\n$]+?)\$(?!\$)/g, (_, math) => {
      try {
        return katex.renderToString(math.trim(), { displayMode: false, throwOnError: false, trust: true });
      } catch { return _; }
    });

    if (result !== text) {
      return { html: result, hasMath: true };
    }
  } catch {}

  return { html: null, hasMath: false };
}

export default function FlashCard({ card, onKnown, onUnknown, onRate, showActions, sm2Rating, intervals, cardKey, heatLevel = 0, onRegenCard }) {
  const [flipped, setFlipped] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [regenning, setRegenning] = useState(false);
  const [regenMenu, setRegenMenu] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const audioRef = useRef(null);
  const frontRef = useRef(null);
  const backRef = useRef(null);
  const [cardHeight, setCardHeight] = useState(340);

  useEffect(() => {
    setFlipped(false);
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
      setSpeaking(false);
    }
  }, [cardKey]);

  // Measure both sides and use the taller one, capped to prevent runaway growth
  const MAX_CARD_HEIGHT = 500;
  useEffect(() => {
    const measure = () => {
      const frontH = frontRef.current?.scrollHeight || 0;
      const backH = backRef.current?.scrollHeight || 0;
      setCardHeight(Math.min(MAX_CARD_HEIGHT, Math.max(280, frontH, backH)));
    };
    measure();
    // Re-measure after images load
    const timer = setTimeout(measure, 500);
    return () => clearTimeout(timer);
  }, [flipped, cardKey, card?.front, card?.back, card?.frontImages?.length, card?.backImages?.length]);

  // Stop audio on mode switch
  useEffect(() => {
    function handleStopAudio() {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
        setSpeaking(false);
      }
    }
    window.addEventListener("bc-stop-audio", handleStopAudio);
    return () => window.removeEventListener("bc-stop-audio", handleStopAudio);
  }, []);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA" || e.target.tagName === "AUDIO") return;

    if (e.code === "Space") {
      e.preventDefault();
      setFlipped(f => !f);
    }

    // FSRS keyboard shortcuts (only when flipped and sm2Rating)
    if (sm2Rating && flipped && onRate) {
      if (e.key === "1") { e.preventDefault(); setFlipped(false); onRate(Rating.Again); }
      if (e.key === "2") { e.preventDefault(); setFlipped(false); onRate(Rating.Hard); }
      if (e.key === "3") { e.preventDefault(); setFlipped(false); onRate(Rating.Good); }
      if (e.key === "4") { e.preventDefault(); setFlipped(false); onRate(Rating.Easy); }
    }
  }, [sm2Rating, flipped, onRate]);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

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
      // If the card has its own audio (e.g. from Anki import), use that instead of generating Sage audio
      const isFront = text === card.front;
      const cardAudio = isFront ? card.frontAudio : card.backAudio;
      let audioUrl;

      if (cardAudio?.length > 0) {
        audioUrl = cardAudio[0]; // use the card's embedded audio
      } else {
        audioUrl = await textToSpeech(text);
      }

      const audio = new Audio(audioUrl);
      audioRef.current = audio;
      audio.onended = () => {
        setSpeaking(false);
        if (!cardAudio?.length) URL.revokeObjectURL(audioUrl);
      };
      audio.play();
      // Precache the other side (only if it needs Sage generation)
      const otherText = isFront ? card.back : card.front;
      const otherAudio = isFront ? card.backAudio : card.frontAudio;
      if (!otherAudio?.length) {
        textToSpeech(otherText).catch(() => {});
      }
    } catch (err) {
      console.error("TTS error:", err);
      setSpeaking(false);
    }
  }

  function handleSM2Rate(e, quality) {
    e.stopPropagation();
    e.currentTarget.blur(); // prevent space bar from re-triggering this button
    setFlipped(false);
    onRate?.(quality);
  }

  return (
    <div className="w-full max-w-lg mx-auto">
      <div
        className={`w-full cursor-pointer select-none rounded-2xl transition-all duration-500 ${heatLevel > 0 ? `card-heat-${heatLevel}` : ""}`}
        style={{ perspective: "1200px" }}
        onClick={() => setFlipped(!flipped)}
      >
        <div
          className="relative w-full transition-transform duration-500 ease-in-out"
          style={{
            transformStyle: "preserve-3d",
            transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)",
            height: `${cardHeight}px`,
            transition: "transform 0.5s ease-in-out, height 0.5s ease-in-out",
          }}
        >
          {/* Front — Question */}
          <div
            ref={frontRef}
            className="absolute inset-0 w-full bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 flex flex-col justify-between overflow-y-auto"
            style={{ backfaceVisibility: "hidden" }}
          >
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
              {(() => {
                const math = renderMath(card.front);
                return math.hasMath
                  ? <div className={`${textSize(card.front)} text-gray-800 dark:text-gray-100 font-medium math-content`} dangerouslySetInnerHTML={{ __html: math.html }} />
                  : <p className={`${textSize(card.front)} text-gray-800 dark:text-gray-100 font-medium`}>{card.front}</p>;
              })()}
              {card.occlusion && card.frontImages?.[0] ? (
                <div className="mt-3 flex justify-center">
                  <div className="relative inline-block" onClick={e => e.stopPropagation()}>
                    <img src={card.frontImages[0]} alt="" className="block max-h-64 max-w-full rounded-lg border border-gray-200 dark:border-gray-700 object-contain cursor-zoom-in" onClick={(e) => { e.stopPropagation(); setLightboxSrc({ src: card.frontImages[0], maskUrl: card.occlusion?.questionMaskUrl, maskSvg: card.occlusion?.type === "inline" ? card.occlusion?.maskSvg : null }); }} />
                    {card.occlusion.type === "file" && card.occlusion.questionMaskUrl && (
                      <img
                        src={card.occlusion.questionMaskUrl}
                        alt=""
                        className="absolute top-0 left-0 w-full h-full rounded-lg object-contain pointer-events-none"
                      />
                    )}
                    {card.occlusion.type === "inline" && card.occlusion.maskSvg && (
                      <div
                        className="absolute top-0 left-0 w-full h-full rounded-lg pointer-events-none"
                        dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(
                          card.occlusion.maskSvg.replace(/<svg/, '<svg preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%"'),
                          { USE_PROFILES: { svg: true, svgFilters: true }, ADD_TAGS: ["rect", "ellipse", "circle", "polygon", "path", "g"], ADD_ATTR: ["viewBox", "preserveAspectRatio"] }
                        ) }}
                      />
                    )}
                  </div>
                </div>
              ) : card.frontImages?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {card.frontImages.map((src, i) => (
                    <img key={i} src={src} alt="" className="max-h-48 max-w-full rounded-lg border border-gray-200 dark:border-gray-700 object-contain cursor-zoom-in" onClick={e => { e.stopPropagation(); setLightboxSrc({ src }); }} />
                  ))}
                </div>
              )}
              {card.frontAudio?.length > 0 && (
                <div className="mt-3 flex gap-2" onClick={e => e.stopPropagation()}>
                  {card.frontAudio.map((src, i) => (
                    <audio key={i} controls src={src} className="h-10 w-full max-w-[280px] rounded-lg" preload="none" style={{ colorScheme: "dark" }} onClick={e => e.stopPropagation()} />
                  ))}
                </div>
              )}
            </div>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-4 text-center">
              <i className="fa-solid fa-hand-pointer mr-1" /> Tap or press space to flip
            </p>
          </div>

          {/* Back — Answer */}
          <div
            ref={backRef}
            className="absolute inset-0 w-full bg-indigo-50 dark:bg-indigo-950 rounded-2xl shadow-lg border border-indigo-200 dark:border-indigo-800 p-8 flex flex-col justify-between overflow-y-auto"
            style={{
              backfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
            }}
          >
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50 px-2 py-1 rounded-full">
                  Answer
                </span>
                <span className={`text-xs font-medium px-2 py-1 rounded-full ${difficultyColors[card.difficulty] || ""}`}>
                  {card.difficulty}
                </span>
              </div>
              {(() => {
                const math = renderMath(card.back);
                return math.hasMath
                  ? <div className={`${textSize(card.back)} text-gray-800 dark:text-gray-100 math-content`} dangerouslySetInnerHTML={{ __html: math.html }} />
                  : <p className={`${textSize(card.back)} text-gray-800 dark:text-gray-100`}>{card.back}</p>;
              })()}
              {card.occlusion && card.backImages?.[0] ? (
                <div className="mt-3 flex justify-center">
                  <div className="relative inline-block" onClick={e => e.stopPropagation()}>
                    <img src={card.backImages[0]} alt="" className="block max-h-64 max-w-full rounded-lg border border-indigo-200 dark:border-indigo-700 object-contain cursor-zoom-in" onClick={(e) => { e.stopPropagation(); setLightboxSrc({ src: card.backImages[0], maskUrl: card.occlusion?.answerMaskUrl, maskSvg: null }); }} />
                    {card.occlusion.type === "file" && card.occlusion.answerMaskUrl && (
                      <img
                        src={card.occlusion.answerMaskUrl}
                        alt=""
                        className="absolute top-0 left-0 w-full h-full rounded-lg object-contain pointer-events-none"
                      />
                    )}
                  </div>
                </div>
              ) : card.backImages?.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {card.backImages.map((src, i) => (
                    <img key={i} src={src} alt="" className="max-h-48 rounded-lg border border-indigo-200 dark:border-indigo-700 object-contain cursor-zoom-in" onClick={e => { e.stopPropagation(); setLightboxSrc({ src }); }} />
                  ))}
                </div>
              )}
              {card.backAudio?.length > 0 && (
                <div className="mt-3 flex gap-2" onClick={e => e.stopPropagation()}>
                  {card.backAudio.map((src, i) => (
                    <audio key={i} controls src={src} className="h-10 w-full max-w-[280px] rounded-lg" preload="none" style={{ colorScheme: "dark" }} onClick={e => e.stopPropagation()} />
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center flex-1">
                {sm2Rating ? (
                  <>
                    <i className="fa-solid fa-keyboard mr-1" /> Rate below or press 1-4
                  </>
                ) : (
                  <>
                    <i className="fa-solid fa-hand-pointer mr-1" /> Tap or press space to flip
                  </>
                )}
              </p>
              {onRegenCard && (
                <div className="relative">
                  <button
                    onClick={(e) => { e.stopPropagation(); setRegenMenu(!regenMenu); }}
                    disabled={regenning}
                    className="text-xs text-gray-400 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors p-1"
                    title="Rewrite this card"
                  >
                    {regenning ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-wand-magic-sparkles" />}
                  </button>
                  {regenMenu && (
                    <div
                      className="absolute bottom-8 right-0 bg-white dark:bg-gray-700 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 py-1 min-w-[160px] z-50"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {[
                        { style: "gap-fill", label: "Gap fill", icon: "fa-text-slash" },
                        { style: "clinical", label: "Clinical scenario", icon: "fa-stethoscope" },
                        { style: "deeper", label: "Go deeper", icon: "fa-arrow-down-long" },
                        { style: "simpler", label: "Simplify", icon: "fa-feather" },
                        { style: "compare", label: "Compare/contrast", icon: "fa-code-compare" },
                      ].map((opt) => (
                        <button
                          key={opt.style}
                          onClick={async (e) => {
                            e.stopPropagation();
                            setRegenMenu(false);
                            setRegenning(true);
                            try {
                              const result = await onRegenCard(card, opt.style);
                              if (result) setRegenning(false);
                            } catch { setRegenning(false); }
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 flex items-center gap-2"
                        >
                          <i className={`fa-solid ${opt.icon} w-4 text-center text-gray-400`} />
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
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

      {/* SM-2 Rating Buttons — always visible, disabled when not flipped */}
      {showActions && sm2Rating && (() => {
        const showIntervals = localStorage.getItem("bc-show-intervals") === "true";
        return (
        <div className={`grid grid-cols-4 gap-2 mt-4 transition-opacity duration-300 ${flipped ? "opacity-100" : "opacity-30 pointer-events-none"}`}>
          <button
            onClick={(e) => handleSM2Rate(e, Rating.Again)}
            className="flex flex-col items-center px-3 py-3 bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-300 rounded-xl font-medium hover:bg-red-200 dark:hover:bg-red-900 transition-colors"
          >
            <span className="text-sm font-semibold">Again</span>
            {showIntervals && <span className="text-xs opacity-70 mt-0.5">{intervals?.again}</span>}
          </button>
          <button
            onClick={(e) => handleSM2Rate(e, Rating.Hard)}
            className="flex flex-col items-center px-3 py-3 bg-orange-100 dark:bg-orange-900/50 text-orange-700 dark:text-orange-300 rounded-xl font-medium hover:bg-orange-200 dark:hover:bg-orange-900 transition-colors"
          >
            <span className="text-sm font-semibold">Hard</span>
            {showIntervals && <span className="text-xs opacity-70 mt-0.5">{intervals?.hard}</span>}
          </button>
          <button
            onClick={(e) => handleSM2Rate(e, Rating.Good)}
            className="flex flex-col items-center px-3 py-3 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-xl font-medium hover:bg-indigo-200 dark:hover:bg-indigo-900 transition-colors"
          >
            <span className="text-sm font-semibold">Good</span>
            {showIntervals && <span className="text-xs opacity-70 mt-0.5">{intervals?.good}</span>}
          </button>
          <button
            onClick={(e) => handleSM2Rate(e, Rating.Easy)}
            className="flex flex-col items-center px-3 py-3 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-xl font-medium hover:bg-green-200 dark:hover:bg-green-900 transition-colors"
          >
            <span className="text-sm font-semibold">Easy</span>
            {showIntervals && <span className="text-xs opacity-70 mt-0.5">{intervals?.easy}</span>}
          </button>
        </div>
        );
      })()}

      {/* Legacy 2-button system (for non-SM2 modes) */}
      {showActions && !sm2Rating && flipped && (
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
      {/* Image lightbox */}
      {lightboxSrc && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxSrc(null)}
          onKeyDown={(e) => e.key === "Escape" && setLightboxSrc(null)}
        >
          <div className="relative inline-block max-w-full max-h-full" onClick={() => setLightboxSrc(null)}>
            <img
              src={lightboxSrc.src}
              alt=""
              className="max-w-full max-h-[90vh] object-contain rounded-lg"
            />
            {lightboxSrc.maskUrl && (
              <img
                src={lightboxSrc.maskUrl}
                alt=""
                className="absolute top-0 left-0 w-full h-full rounded-lg object-contain pointer-events-none"
              />
            )}
            {lightboxSrc.maskSvg && (
              <div
                className="absolute top-0 left-0 w-full h-full rounded-lg pointer-events-none"
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(
                  lightboxSrc.maskSvg.replace(/<svg/, '<svg preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%"'),
                  { USE_PROFILES: { svg: true, svgFilters: true }, ADD_TAGS: ["rect", "ellipse", "circle", "polygon", "path", "g"], ADD_ATTR: ["viewBox", "preserveAspectRatio"] }
                ) }}
              />
            )}
          </div>
          <button
            onClick={() => setLightboxSrc(null)}
            className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>
      )}
    </div>
  );
}
