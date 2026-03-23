import { useState } from "react";
import { scrapeDocument, generateCards } from "../api";

const CATEGORIES = [
  "All",
  "Psychology/Sociology",
  "Biology",
  "Biochemistry",
  "Physics",
  "Chemistry",
];

function extractDocId(url) {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export default function SetupScreen({ onCardsGenerated, onSkip, existingCards, dark, setDark }) {
  const [url, setUrl] = useState("https://docs.google.com/document/d/1p7X3_n9K8sra6fYNUQgYeXcLJi3h9Uh3gGfGgV2N-K8/edit?tab=t.0");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState(null);
  const [category, setCategory] = useState("All");

  async function handleGenerate() {
    setLoading(true);
    setError(null);

    try {
      let content = "";

      const docId = extractDocId(url);

      setStatus("Scraping document with Firecrawl...");
      const result = await scrapeDocument(url);
      content = result.content;

      if (!content || content.trim().length < 50) {
        throw new Error(
          "Could not extract enough content. Make sure the doc is shared or you're signed in with Google."
        );
      }

      // Generate cards in parallel chunks
      setStatus("Generating flashcards with Claude...");
      const chunkSize = 8000;
      const chunks = [];
      for (let i = 0; i < content.length; i += chunkSize) {
        chunks.push(content.slice(i, i + chunkSize));
      }

      let allCards = [];
      const PARALLEL = 5;
      for (let i = 0; i < chunks.length; i += PARALLEL) {
        const batch = chunks.slice(i, i + PARALLEL);
        setStatus(
          `Generating flashcards... (batch ${Math.floor(i / PARALLEL) + 1}/${Math.ceil(chunks.length / PARALLEL)})`
        );
        const results = await Promise.all(
          batch.map((chunk) =>
            generateCards(chunk, category === "All" ? null : category)
          )
        );
        for (const { cards } of results) {
          allCards = allCards.concat(cards);
        }
      }

      onCardsGenerated(allCards);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setStatus("");
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center p-4 transition-colors">
      <div className="w-full max-w-md space-y-6">
        {/* Dark mode toggle */}
        <div className="flex justify-end">
          <button
            onClick={() => setDark(!dark)}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
          >
            <i className={`fa-solid ${dark ? "fa-sun" : "fa-moon"}`} />
          </button>
        </div>

        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            <i className="fa-solid fa-bolt text-indigo-600 dark:text-indigo-400 mr-2" />
            BetterCram
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            <i className="fa-solid fa-wand-magic-sparkles mr-1" />
            Turn your study doc into AI-powered flashcards
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Google Doc URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://docs.google.com/document/d/..."
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-4 py-3 text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              Make sure your doc is shared as "Anyone with the link can view"
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Filter by category (optional)
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-4 py-3 text-gray-700 dark:text-gray-200"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading || !url.trim()}
            className="w-full px-6 py-3 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-50"
          >
            {loading ? (
              <><i className="fa-solid fa-spinner fa-spin mr-2" />{status || "Working..."}</>
            ) : (
              <><i className="fa-solid fa-wand-magic-sparkles mr-2" />Generate Flashcards</>
            )}
          </button>

          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
            </div>
          )}

          {onSkip && (
            <button
              onClick={onSkip}
              className="w-full px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <i className="fa-solid fa-forward mr-2" />
              Skip — use default cards
            </button>
          )}
        </div>

        {existingCards && existingCards.length > 0 && (
          <div className="text-center">
            <button
              onClick={() => onCardsGenerated(existingCards)}
              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium text-sm underline"
            >
              Use previously generated cards ({existingCards.length} cards)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
