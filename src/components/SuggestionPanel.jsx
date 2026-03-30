import { useState, useEffect } from "react";
import { listSuggestions, reviewSuggestion } from "../api";

export default function SuggestionPanel({ open, onClose, publicDeckId, deckName }) {
  const [suggestions, setSuggestions] = useState([]);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [reviewing, setReviewing] = useState(null);

  useEffect(() => {
    if (!open || !publicDeckId) return;
    setLoading(true);
    listSuggestions(publicDeckId, filter === "all" ? null : filter).then(data => {
      setSuggestions(data.suggestions || []);
      setIsOwner(data.isOwner);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [open, publicDeckId, filter]);

  if (!open) return null;

  async function handleReview(suggestionId, action) {
    setReviewing(suggestionId);
    try {
      await reviewSuggestion(publicDeckId, suggestionId, action);
      setSuggestions(prev => prev.map(s =>
        s.id === suggestionId ? { ...s, status: action === "approve" ? "approved" : "rejected", reviewedAt: new Date().toISOString() } : s
      ));
    } catch (err) {
      alert("Failed: " + err.message);
    } finally {
      setReviewing(null);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl shadow-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between shrink-0">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Suggestions for "{deckName}"
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {isOwner ? "Review suggestions from subscribers" : "Your suggestions"}
            </p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Filter tabs */}
        <div className="px-6 py-2 border-b border-gray-100 dark:border-gray-700 flex gap-2 shrink-0">
          {["pending", "approved", "rejected", "all"].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filter === f ? "bg-indigo-600 text-white" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="text-center py-10"><i className="fa-solid fa-spinner fa-spin text-gray-400 text-xl" /></div>
          ) : suggestions.length === 0 ? (
            <div className="text-center py-10">
              <i className="fa-solid fa-lightbulb text-2xl text-gray-300 dark:text-gray-600 mb-2" />
              <p className="text-sm text-gray-400 dark:text-gray-500">No {filter} suggestions</p>
            </div>
          ) : (
            suggestions.map(s => (
              <div key={s.id} className={`rounded-xl border p-4 ${
                s.status === "approved" ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-900/10" :
                s.status === "rejected" ? "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-900/10" :
                "border-gray-200 dark:border-gray-700"
              }`}>
                {/* Type badge */}
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    s.type === "new" ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300" : "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300"
                  }`}>
                    {s.type === "new" ? "New Card" : "Edit"}
                  </span>
                  <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    s.status === "pending" ? "bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400" :
                    s.status === "approved" ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300" :
                    "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300"
                  }`}>
                    {s.status}
                  </span>
                  <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-auto">
                    by {s.submittedBy?.name || "Unknown"} · {new Date(s.submittedAt).toLocaleDateString()}
                  </span>
                </div>

                {/* Original vs suggested (for edits) */}
                {s.type === "edit" && s.originalFront && (
                  <div className="mb-2 bg-gray-50 dark:bg-gray-700/30 rounded-lg p-2 text-xs text-gray-500 dark:text-gray-400">
                    <span className="font-medium">Original:</span> {s.originalFront?.slice(0, 80)}
                  </div>
                )}

                <div className="space-y-1">
                  <p className="text-sm text-gray-900 dark:text-white"><strong>Q:</strong> {s.front}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300"><strong>A:</strong> {s.back}</p>
                  {s.category && <p className="text-xs text-gray-400 dark:text-gray-500">Category: {s.category}</p>}
                  {s.reason && (
                    <div className="mt-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg p-2 text-xs text-indigo-700 dark:text-indigo-300">
                      <i className="fa-solid fa-comment-dots mr-1" />
                      <strong>Reason:</strong> {s.reason}
                    </div>
                  )}
                </div>

                {/* Owner actions */}
                {isOwner && s.status === "pending" && (
                  <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                    <button
                      onClick={() => handleReview(s.id, "approve")}
                      disabled={reviewing === s.id}
                      className="flex-1 py-2 bg-green-600 text-white rounded-lg text-xs font-medium hover:bg-green-700 disabled:opacity-50"
                    >
                      {reviewing === s.id ? <i className="fa-solid fa-spinner fa-spin" /> : <><i className="fa-solid fa-check mr-1" />Approve</>}
                    </button>
                    <button
                      onClick={() => handleReview(s.id, "reject")}
                      disabled={reviewing === s.id}
                      className="flex-1 py-2 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50"
                    >
                      {reviewing === s.id ? <i className="fa-solid fa-spinner fa-spin" /> : <><i className="fa-solid fa-xmark mr-1" />Reject</>}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
