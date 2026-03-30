import { useState } from "react";
import { submitSuggestion } from "../api";

export default function SuggestEditModal({ open, onClose, publicDeckId, card, type = "edit" }) {
  const [front, setFront] = useState(card?.front || "");
  const [back, setBack] = useState(card?.back || "");
  const [category, setCategory] = useState(card?.category || "");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  if (!open) return null;

  async function handleSubmit(e) {
    e.preventDefault();
    if (!front.trim()) return;
    setSubmitting(true);
    setResult(null);
    try {
      await submitSuggestion(publicDeckId, {
        type,
        cardId: type === "edit" ? (card?.id || card?.front?.slice(0, 60)) : null,
        front: front.trim(),
        back: back.trim(),
        category: category.trim() || "General",
        reason: reason.trim() || null,
      });
      setResult("sent");
      setTimeout(() => onClose(), 1500);
    } catch (err) {
      setResult(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              {type === "new" ? "Suggest New Card" : "Suggest Edit"}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {type === "new" ? "Propose a new card for this deck" : "Propose changes to this card"}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {type === "edit" && card && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-3 text-xs text-gray-500 dark:text-gray-400">
              <p className="font-medium mb-1">Original:</p>
              <p>Q: {card.front?.slice(0, 100)}</p>
              <p>A: {card.back?.slice(0, 100)}</p>
            </div>
          )}

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
              {type === "edit" ? "Suggested front (question)" : "Front (question)"}
            </label>
            <textarea
              value={front}
              onChange={e => setFront(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
              placeholder="Enter the question..."
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
              {type === "edit" ? "Suggested back (answer)" : "Back (answer)"}
            </label>
            <textarea
              value={back}
              onChange={e => setBack(e.target.value)}
              rows={3}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
              placeholder="Enter the answer..."
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">Category</label>
            <input
              type="text"
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              placeholder="e.g. Anatomy, Biochemistry"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-1">
              Why? <span className="text-gray-400 font-normal">(required for edits)</span>
            </label>
            <textarea
              value={reason}
              onChange={e => setReason(e.target.value)}
              rows={2}
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
              placeholder={type === "edit" ? "e.g. Answer is incorrect, missing key detail, outdated info..." : "e.g. This topic isn't covered yet, common exam question..."}
            />
          </div>

          {result && result !== "sent" && (
            <p className="text-red-500 text-sm">{result}</p>
          )}
          {result === "sent" && (
            <p className="text-green-500 text-sm"><i className="fa-solid fa-check mr-1" />Suggestion submitted! The deck owner will be notified.</p>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={submitting || !front.trim() || (type === "edit" && !reason.trim()) || result === "sent"}
              className="flex-1 py-2.5 bg-indigo-600 text-white rounded-xl font-medium text-sm hover:bg-indigo-700 transition-all disabled:opacity-50"
            >
              {submitting ? <><i className="fa-solid fa-spinner fa-spin mr-2" />Submitting...</> : "Submit Suggestion"}
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
