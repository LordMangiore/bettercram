import { useState } from "react";
import { deepDive } from "../api";

export default function DeepDiveMode({ cards, deckName }) {
  const [selectedCard, setSelectedCard] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [sources, setSources] = useState([]);

  async function handleDeepDive(card) {
    setSelectedCard(card);
    setLoading(true);
    setResult(null);
    setSources([]);
    try {
      const { content, sources: s } = await deepDive(card, null, deckName);
      setResult(content);
      setSources(s || []);
    } catch (e) {
      setResult(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  if (!selectedCard) {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-4">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-1">
            <i className="fa-solid fa-microscope text-indigo-600 dark:text-indigo-400 mr-2" />
            Deep Dive Research
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Select a card to research with Firecrawl + Claude — get web-sourced deep analysis
          </p>
        </div>

        <div className="space-y-2 max-h-[60vh] overflow-y-auto hide-scrollbar">
          {cards.map((card, i) => (
            <button
              key={i}
              onClick={() => handleDeepDive(card)}
              className="w-full text-left p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:shadow-sm transition-all group"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="text-sm text-gray-800 dark:text-gray-200 font-medium line-clamp-2">
                    {card.front}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 line-clamp-1">{card.back}</p>
                </div>
                <span className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/50 px-2 py-0.5 rounded-full whitespace-nowrap">
                  {card.category}
                </span>
              </div>
            </button>
          ))}
          {cards.length === 0 && (
            <p className="text-center text-gray-400 dark:text-gray-500 py-8">No cards in this category</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-4 mb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <span className="text-xs text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/50 px-2 py-0.5 rounded-full">
              <i className="fa-solid fa-microscope mr-1" />
              Deep Dive
            </span>
            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-2">{selectedCard.front}</p>
          </div>
          <button
            onClick={() => {
              setSelectedCard(null);
              setResult(null);
              setSources([]);
            }}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 ml-3"
          >
            <i className="fa-solid fa-xmark text-lg" />
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-8 text-center">
          <i className="fa-solid fa-globe fa-spin text-2xl text-indigo-600 dark:text-indigo-400 mb-3 block" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">Searching the web and analyzing...</p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">Firecrawl + Claude working together</p>
        </div>
      )}

      {/* Result */}
      {result && (
        <>
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 mb-4">
            <div
              className="text-gray-700 dark:text-gray-300 text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: formatMarkdown(result) }}
            />
          </div>

          {/* Sources */}
          {sources.length > 0 && (
            <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700 p-4">
              <h4 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">
                <i className="fa-solid fa-link mr-1" />
                Sources
              </h4>
              <div className="space-y-1.5">
                {sources.map((s, i) => (
                  <a
                    key={i}
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                  >
                    <i className="fa-solid fa-arrow-up-right-from-square text-xs" />
                    {s.title || s.url}
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="mt-4 text-center">
            <button
              onClick={() => handleDeepDive(selectedCard)}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              <i className="fa-solid fa-arrows-rotate mr-1" />
              Research again
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function formatMarkdown(text) {
  return text
    .replace(/## (.*)/g, '<h3 class="text-base font-semibold text-gray-900 dark:text-white mt-4 mb-2">$1</h3>')
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900 dark:text-white">$1</strong>')
    .replace(/\*(.*?)\*/g, "<em>$1</em>")
    .replace(/`(.*?)`/g, '<code class="bg-gray-100 dark:bg-gray-700 px-1 py-0.5 rounded text-indigo-700 dark:text-indigo-300 text-xs">$1</code>')
    .replace(/^- (.*)/gm, '<li class="ml-4 list-disc">$1</li>')
    .replace(/^(\d+)\. (.*)/gm, '<li class="ml-4 list-decimal">$1. $2</li>')
    .replace(/\n\n/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}
