import { useState } from "react";

const COLORS = [
  "from-indigo-500 to-purple-600",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-red-600",
  "from-pink-500 to-rose-600",
  "from-cyan-500 to-blue-600",
  "from-amber-500 to-yellow-600",
  "from-violet-500 to-fuchsia-600",
  "from-lime-500 to-green-600",
];

function getColor(index) {
  return COLORS[index % COLORS.length];
}

export default function DeckLibrary({ decks, activeDeckId, onSelectDeck, onCreateDeck, onDeleteDeck }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [creating, setCreating] = useState(false);

  async function handleCreate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await onCreateDeck(newName.trim(), newUrl.trim() || null);
      setNewName("");
      setNewUrl("");
      setShowCreate(false);
    } catch (err) {
      alert("Failed to create deck: " + err.message);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Library</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {decks.length} {decks.length === 1 ? "deck" : "decks"}
          </p>
        </div>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-all shadow-md"
        >
          <i className="fa-solid fa-plus" />
          New Deck
        </button>
      </div>

      {/* Create deck form */}
      {showCreate && (
        <form onSubmit={handleCreate} className="mb-6 p-5 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Create a new study deck</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Deck name *
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g., Organic Chemistry, Anatomy 301"
                required
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Google Doc URL <span className="text-gray-400 font-normal">(optional — add cards manually if blank)</span>
              </label>
              <input
                type="url"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                placeholder="https://docs.google.com/document/d/..."
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Make sure the doc is shared as "Anyone with the link can view"
              </p>
            </div>
            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={creating || !newName.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-all disabled:opacity-50"
              >
                {creating ? (
                  <><i className="fa-solid fa-spinner fa-spin" /> Creating...</>
                ) : (
                  <><i className="fa-solid fa-plus" /> Create Deck</>
                )}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setNewName(""); setNewUrl(""); }}
                className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Deck grid */}
      {decks.length === 0 && !showCreate ? (
        <div className="text-center py-16">
          <i className="fa-solid fa-book-open text-5xl text-gray-300 dark:text-gray-600 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">No decks yet</h3>
          <p className="text-gray-500 dark:text-gray-400 mb-6">Create your first study deck to get started</p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition-all"
          >
            <i className="fa-solid fa-plus mr-2" />
            Create Your First Deck
          </button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map((deck, i) => (
            <div
              key={deck.id}
              onClick={() => onSelectDeck(deck.id)}
              className={`relative rounded-2xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-all group ${
                activeDeckId === deck.id ? "ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-gray-900" : ""
              }`}
            >
              {/* Gradient header */}
              <div className={`bg-gradient-to-br ${getColor(i)} p-5 pb-8`}>
                <div className="flex items-start justify-between">
                  <h3 className="text-lg font-bold text-white leading-tight pr-6">
                    {deck.name}
                  </h3>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm(`Delete "${deck.name}"? This can't be undone.`)) {
                        onDeleteDeck(deck.id);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 w-7 h-7 flex items-center justify-center rounded-full bg-black/20 text-white/80 hover:bg-black/40 hover:text-white transition-all text-xs"
                  >
                    <i className="fa-solid fa-trash" />
                  </button>
                </div>
              </div>

              {/* Stats */}
              <div className="bg-white dark:bg-gray-800 border border-t-0 border-gray-200 dark:border-gray-700 rounded-b-2xl p-4 -mt-3 relative">
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-gray-600 dark:text-gray-300">
                    <i className="fa-solid fa-clone text-indigo-500 mr-1.5" />
                    {deck.cardCount || 0} cards
                  </span>
                  {deck.lastStudied && (
                    <span className="text-gray-400 dark:text-gray-500 text-xs">
                      <i className="fa-solid fa-clock mr-1" />
                      {new Date(deck.lastStudied).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {deck.docUrl && (
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 truncate">
                    <i className="fa-solid fa-link mr-1" />
                    Google Doc linked
                  </p>
                )}
              </div>

              {/* Active indicator */}
              {activeDeckId === deck.id && (
                <div className="absolute top-3 right-3 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow">
                  <i className="fa-solid fa-check text-indigo-600 text-xs" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
