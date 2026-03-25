import { useState, useMemo } from "react";
import { publishDeck, browsePublicDecks, subscribeToDeck, cloneDeck, upvotePublicDeck } from "../api";

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

// Maps test color ids to tailwind classes
const TEST_COLOR_MAP = {
  indigo:  { dot: "bg-indigo-500", light: "bg-indigo-50 dark:bg-indigo-900/20", border: "border-indigo-200 dark:border-indigo-800", text: "text-indigo-700 dark:text-indigo-300", btn: "bg-indigo-600 hover:bg-indigo-700" },
  emerald: { dot: "bg-emerald-500", light: "bg-emerald-50 dark:bg-emerald-900/20", border: "border-emerald-200 dark:border-emerald-800", text: "text-emerald-700 dark:text-emerald-300", btn: "bg-emerald-600 hover:bg-emerald-700" },
  orange:  { dot: "bg-orange-500", light: "bg-orange-50 dark:bg-orange-900/20", border: "border-orange-200 dark:border-orange-800", text: "text-orange-700 dark:text-orange-300", btn: "bg-orange-600 hover:bg-orange-700" },
  pink:    { dot: "bg-pink-500", light: "bg-pink-50 dark:bg-pink-900/20", border: "border-pink-200 dark:border-pink-800", text: "text-pink-700 dark:text-pink-300", btn: "bg-pink-600 hover:bg-pink-700" },
  cyan:    { dot: "bg-cyan-500", light: "bg-cyan-50 dark:bg-cyan-900/20", border: "border-cyan-200 dark:border-cyan-800", text: "text-cyan-700 dark:text-cyan-300", btn: "bg-cyan-600 hover:bg-cyan-700" },
  amber:   { dot: "bg-amber-500", light: "bg-amber-50 dark:bg-amber-900/20", border: "border-amber-200 dark:border-amber-800", text: "text-amber-700 dark:text-amber-300", btn: "bg-amber-600 hover:bg-amber-700" },
  violet:  { dot: "bg-violet-500", light: "bg-violet-50 dark:bg-violet-900/20", border: "border-violet-200 dark:border-violet-800", text: "text-violet-700 dark:text-violet-300", btn: "bg-violet-600 hover:bg-violet-700" },
  rose:    { dot: "bg-rose-500", light: "bg-rose-50 dark:bg-rose-900/20", border: "border-rose-200 dark:border-rose-800", text: "text-rose-700 dark:text-rose-300", btn: "bg-rose-600 hover:bg-rose-700" },
};

function getTestColors(colorId) {
  return TEST_COLOR_MAP[colorId] || TEST_COLOR_MAP.indigo;
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  const diff = Math.ceil((target - now) / (1000 * 60 * 60 * 24));
  return diff;
}

function formatDate(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export default function DeckLibrary({ decks, activeDeckId, onSelectDeck, onCreateDeck, onDeleteDeck, onGenerateFromDoc, generating, generatingStatus, onRefreshDecks, user, onRegenerate, onAddMore, onManageCards, onShowPlanner, studyPlan, onStudyGroup }) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [showBrowse, setShowBrowse] = useState(false);
  const [publicDecks, setPublicDecks] = useState([]);
  const [loadingPublic, setLoadingPublic] = useState(false);
  const [publishing, setPublishing] = useState(null);
  const [copying, setCopying] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [confirmRegenDeckId, setConfirmRegenDeckId] = useState(null);
  const [confirmDeleteDeckId, setConfirmDeleteDeckId] = useState(null);
  const [collapsedGroups, setCollapsedGroups] = useState({});

  // Compute test groups and ungrouped decks
  const { testGroups, ungroupedDecks } = useMemo(() => {
    const tests = studyPlan?.tests || [];
    const assignedDeckIds = new Set();
    const groups = [];

    for (const test of tests) {
      if (!test.deckIds || test.deckIds.length === 0) continue;
      const groupDecks = test.deckIds.map(did => decks.find(d => d.id === did)).filter(Boolean);
      if (groupDecks.length === 0) continue;
      groupDecks.forEach(d => assignedDeckIds.add(d.id));
      const totalCards = groupDecks.reduce((sum, d) => sum + (d.cardCount || 0), 0);
      groups.push({ test, decks: groupDecks, totalCards });
    }

    const ungrouped = decks.filter(d => !assignedDeckIds.has(d.id));
    return { testGroups: groups, ungroupedDecks: ungrouped };
  }, [studyPlan, decks]);

  const hasGroups = testGroups.length > 0;

  function toggleGroup(testId) {
    setCollapsedGroups(prev => ({ ...prev, [testId]: !prev[testId] }));
  }

  async function handleBrowse() {
    setShowBrowse(true);
    setLoadingPublic(true);
    try {
      const { decks: pd } = await browsePublicDecks();
      setPublicDecks(pd || []);
    } catch (err) {
      console.error("Browse failed:", err);
    } finally {
      setLoadingPublic(false);
    }
  }

  async function handlePublish(deckId, isCurrentlyPublic) {
    setPublishing(deckId);
    try {
      if (window.plausible) window.plausible("Deck Published");
      await publishDeck(deckId, isCurrentlyPublic ? "unpublish" : "publish", user);
      if (onRefreshDecks) onRefreshDecks();
    } catch (err) {
      alert("Failed to publish: " + err.message);
    } finally {
      setPublishing(null);
    }
  }

  const [toast, setToast] = useState(null);

  function showToast(msg, type = "success") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  async function handleSubscribe(publicDeckId) {
    setCopying(publicDeckId);
    try {
      if (window.plausible) window.plausible("Community Subscribe");
      const result = await subscribeToDeck(publicDeckId);
      showToast(`Added "${result.name}" to your library!`);
      if (onRefreshDecks) onRefreshDecks();
    } catch (err) {
      showToast("Failed to add: " + err.message, "error");
    } finally {
      setCopying(null);
    }
  }

  async function handleClone(publicDeckId) {
    setCopying(publicDeckId);
    try {
      const result = await cloneDeck(publicDeckId);
      showToast(`Cloned "${result.name}" — you can now edit it!`);
      if (onRefreshDecks) onRefreshDecks();
    } catch (err) {
      showToast("Failed to clone: " + err.message, "error");
    } finally {
      setCopying(null);
    }
  }

  async function handleUpvote(publicDeckId) {
    try {
      const result = await upvotePublicDeck(publicDeckId);
      setPublicDecks(prev => prev.map(d => d.id === publicDeckId ? { ...d, upvotes: result.upvotes } : d));
    } catch {}
  }

  const filteredPublicDecks = publicDecks.filter(d => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return d.name.toLowerCase().includes(q) || (d.description || "").toLowerCase().includes(q) || (d.categories || []).some(c => c.toLowerCase().includes(q));
  });

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

  // Renders a single deck card — reused for grouped and ungrouped
  function renderDeckCard(deck, colorIndex) {
    return (
      <div
        key={deck.id}
        onClick={() => onSelectDeck(deck.id, { switchMode: false })}
        onDoubleClick={() => onSelectDeck(deck.id, { switchMode: true })}
        className={`relative rounded-2xl overflow-hidden cursor-pointer hover:scale-[1.02] transition-all group ${
          activeDeckId === deck.id ? "ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-gray-900" : ""
        }`}
      >
        {/* Gradient header */}
        <div className={`bg-gradient-to-br ${getColor(colorIndex)} p-5 pb-8`}>
          {/* Status badge */}
          {(deck.isPublic || deck.isReference || deck.isClone) && (
            <div className="mb-2">
              {deck.isPublic && (
                <span className="inline-flex items-center px-2 py-0.5 bg-white/20 text-white text-[10px] font-bold rounded-full">
                  <i className="fa-solid fa-globe mr-1" />SHARED
                </span>
              )}
              {deck.isReference && (
                <span className="inline-flex items-center px-2 py-0.5 bg-white/20 text-white text-[10px] font-bold rounded-full">
                  <i className="fa-solid fa-link mr-1" />SUBSCRIBED
                </span>
              )}
              {deck.isClone && (
                <span className="inline-flex items-center px-2 py-0.5 bg-white/20 text-white text-[10px] font-bold rounded-full">
                  <i className="fa-solid fa-copy mr-1" />CLONED
                </span>
              )}
            </div>
          )}
          <div className="flex items-start justify-between">
            <h3 className="text-lg font-bold text-white leading-tight pr-6">
              {deck.name}
            </h3>
            <div className="flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all">
              {(deck.cardCount || 0) > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePublish(deck.id, deck.isPublic);
                  }}
                  disabled={publishing === deck.id}
                  className={`w-7 h-7 flex items-center justify-center rounded-full text-xs transition-all ${
                    deck.isPublic
                      ? "bg-green-500/30 text-green-300 hover:bg-green-500/50"
                      : "bg-black/20 text-white/80 hover:bg-black/40 hover:text-white"
                  }`}
                  title={deck.isPublic ? "Unpublish from community" : "Share with community"}
                >
                  <i className={`fa-solid ${publishing === deck.id ? "fa-spinner fa-spin" : deck.isPublic ? "fa-globe" : "fa-share-nodes"}`} />
                </button>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDeleteDeckId(deck.id);
                }}
                className="w-7 h-7 flex items-center justify-center rounded-full bg-black/20 text-white/80 hover:bg-black/40 hover:text-white transition-all text-xs"
              >
                <i className="fa-solid fa-trash" />
              </button>
            </div>
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
          {deck.docUrl && (deck.cardCount || 0) === 0 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onGenerateFromDoc(deck.id, deck.docUrl);
              }}
              disabled={generating}
              className="mt-2 w-full px-3 py-2 bg-indigo-600 text-white rounded-lg text-xs font-medium hover:bg-indigo-700 transition-all disabled:opacity-50"
            >
              {generating ? (
                <><i className="fa-solid fa-spinner fa-spin mr-1" /> Generating...</>
              ) : (
                <><i className="fa-solid fa-wand-magic-sparkles mr-1" /> Generate Cards from Doc</>
              )}
            </button>
          )}
          {deck.docUrl && (deck.cardCount || 0) > 0 && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 truncate">
              <i className="fa-solid fa-link mr-1" />
              Google Doc linked
            </p>
          )}
          {!deck.docUrl && (deck.cardCount || 0) === 0 && (
            <p className="text-xs text-orange-400 dark:text-orange-500 mt-2">
              <i className="fa-solid fa-pen mr-1" />
              Add cards manually
            </p>
          )}
          {/* Regen confirmation panel */}
          {confirmRegenDeckId === deck.id && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl" onClick={(e) => e.stopPropagation()}>
              <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-1">
                <i className="fa-solid fa-triangle-exclamation mr-1" />
                Regenerate all cards?
              </p>
              <p className="text-[11px] text-red-600 dark:text-red-400 mb-2.5">
                This will replace all {deck.cardCount || 0} cards in "{deck.name}" with a fresh set from the linked doc. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmRegenDeckId(null);
                    onRegenerate();
                  }}
                  disabled={generating}
                  className="flex-1 px-3 py-1.5 text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-all disabled:opacity-50"
                >
                  Yes, regenerate
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmRegenDeckId(null);
                  }}
                  className="flex-1 px-3 py-1.5 text-[11px] font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {/* Delete confirmation panel */}
          {confirmDeleteDeckId === deck.id && (
            <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-xl" onClick={(e) => e.stopPropagation()}>
              <p className="text-xs font-semibold text-red-700 dark:text-red-300 mb-1">
                <i className="fa-solid fa-triangle-exclamation mr-1" />
                Delete "{deck.name}"?
              </p>
              <p className="text-[11px] text-red-600 dark:text-red-400 mb-2.5">
                {deck.cardCount || 0} cards will be permanently removed. This cannot be undone.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteDeckId(null);
                    onDeleteDeck(deck.id);
                  }}
                  className="flex-1 px-3 py-1.5 text-[11px] font-bold text-white bg-red-600 hover:bg-red-700 rounded-lg transition-all"
                >
                  Yes, delete
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDeleteDeckId(null);
                  }}
                  className="flex-1 px-3 py-1.5 text-[11px] font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {!deck.isReference && (deck.cardCount || 0) > 0 && activeDeckId === deck.id && (
            <div className="flex gap-1.5 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
              {deck.docUrl && onRegenerate && confirmRegenDeckId !== deck.id && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmRegenDeckId(deck.id);
                  }}
                  disabled={generating}
                  className="flex-1 px-2 py-1.5 text-[11px] font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/50 transition-all"
                >
                  <i className="fa-solid fa-arrows-rotate mr-1" />Regen
                </button>
              )}
              {deck.docUrl && onAddMore && (
                <button
                  onClick={(e) => { e.stopPropagation(); onAddMore(); }}
                  disabled={generating}
                  className="flex-1 px-2 py-1.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-all"
                >
                  <i className="fa-solid fa-plus mr-1" />More Cards
                </button>
              )}
              {onManageCards && (
                <button
                  onClick={(e) => { e.stopPropagation(); onManageCards(); }}
                  className="flex-1 px-2 py-1.5 text-[11px] font-medium text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600/50 transition-all"
                >
                  <i className="fa-solid fa-pen-to-square mr-1" />Manage
                </button>
              )}
            </div>
          )}
        </div>

        {/* Active indicator */}
        {activeDeckId === deck.id && (
          <div className="absolute top-3 right-3 w-6 h-6 bg-white rounded-full flex items-center justify-center shadow">
            <i className="fa-solid fa-check text-indigo-600 text-xs" />
          </div>
        )}
      </div>
    );
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
        <div className="flex gap-2">
          <button
            onClick={handleBrowse}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-all shadow-md"
          >
            <i className="fa-solid fa-globe" />
            Browse Community
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-all shadow-md"
          >
            <i className="fa-solid fa-plus" />
            New Deck
          </button>
        </div>
      </div>

      {/* Generation progress */}
      {generating && generatingStatus && (
        <div className="mb-4 p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl">
          <div className="flex items-center gap-3">
            <i className="fa-solid fa-spinner fa-spin text-indigo-600 dark:text-indigo-400" />
            <div className="flex-1">
              <p className="text-sm font-medium text-indigo-700 dark:text-indigo-300">{generatingStatus}</p>
            </div>
          </div>
        </div>
      )}

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

      {/* Deck grid — with test grouping */}
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
      ) : hasGroups ? (
        <div className="space-y-6">
          {/* Test groups */}
          {testGroups.map(({ test, decks: groupDecks, totalCards }) => {
            const tc = getTestColors(test.color);
            const isCollapsed = collapsedGroups[test.id];
            const days = daysUntil(test.examDate);
            const dateLabel = formatDate(test.examDate);

            return (
              <div key={test.id} className={`rounded-2xl border ${tc.border} overflow-hidden`}>
                {/* Group header */}
                <div
                  onClick={() => toggleGroup(test.id)}
                  className={`${tc.light} px-5 py-4 cursor-pointer select-none transition-colors hover:brightness-95`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-3 h-3 rounded-full ${tc.dot} flex-shrink-0`} />
                      <h3 className={`text-lg font-bold ${tc.text} truncate`}>
                        {test.name}
                      </h3>
                      <i className={`fa-solid fa-chevron-${isCollapsed ? "right" : "down"} text-xs ${tc.text} opacity-60 flex-shrink-0`} />
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {dateLabel && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 hidden sm:inline">
                          {dateLabel}
                          {days !== null && days >= 0 && (
                            <span className="ml-1.5 font-semibold">
                              {days === 0 ? "Today!" : `${days}d left`}
                            </span>
                          )}
                          {days !== null && days < 0 && (
                            <span className="ml-1.5 font-semibold text-red-500">
                              {Math.abs(days)}d ago
                            </span>
                          )}
                        </span>
                      )}
                      {onStudyGroup && totalCards > 0 && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onStudyGroup(test.id);
                          }}
                          className={`px-3 py-1.5 ${tc.btn} text-white rounded-lg text-xs font-semibold transition-all shadow-sm`}
                        >
                          <i className="fa-solid fa-play mr-1.5" />
                          Study All
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 ml-6">
                    {totalCards.toLocaleString()} cards across {groupDecks.length} {groupDecks.length === 1 ? "deck" : "decks"}
                  </p>
                </div>

                {/* Group decks */}
                {!isCollapsed && (
                  <div className="p-4 bg-white/50 dark:bg-gray-800/50">
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 pl-2">
                      {groupDecks.map((deck, i) => renderDeckCard(deck, decks.indexOf(deck)))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {/* Ungrouped decks */}
          {ungroupedDecks.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-3 px-1">
                <div className="w-3 h-3 rounded-full bg-gray-400 dark:bg-gray-500" />
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                  Other Decks
                </h3>
                <span className="text-xs text-gray-400 dark:text-gray-500">
                  ({ungroupedDecks.length})
                </span>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {ungroupedDecks.map((deck) => renderDeckCard(deck, decks.indexOf(deck)))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* No groups — show flat grid as before */
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {decks.map((deck, i) => renderDeckCard(deck, i))}
        </div>
      )}

      {/* Community Browser Modal */}
      {showBrowse && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowBrowse(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-3xl max-h-[80vh] overflow-hidden shadow-2xl" onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div className="p-5 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  <i className="fa-solid fa-globe text-purple-500 mr-2" />
                  Community Decks
                </h3>
                <button onClick={() => setShowBrowse(false)} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                  <i className="fa-solid fa-xmark" />
                </button>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search decks by name, subject, or category..."
                className="w-full border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none"
              />
            </div>

            {/* Deck list */}
            <div className="overflow-y-auto max-h-[60vh] p-5" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
              {loadingPublic ? (
                <div className="text-center py-12">
                  <i className="fa-solid fa-spinner fa-spin text-2xl text-purple-500 mb-3 block" />
                  <p className="text-sm text-gray-500">Loading community decks...</p>
                </div>
              ) : filteredPublicDecks.length === 0 ? (
                <div className="text-center py-12">
                  <i className="fa-solid fa-box-open text-4xl text-gray-300 dark:text-gray-600 mb-3 block" />
                  <h4 className="font-semibold text-gray-900 dark:text-white mb-1">
                    {publicDecks.length === 0 ? "No shared decks yet" : "No results"}
                  </h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {publicDecks.length === 0
                      ? "Be the first to share! Hit the share icon on any deck in your library."
                      : "Try a different search term."}
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredPublicDecks.map((deck, i) => (
                    <div key={deck.id} className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-600 transition-all">
                      {/* Color bar */}
                      <div className={`h-2 w-full rounded-full bg-gradient-to-r sm:h-16 sm:w-2 sm:rounded-full sm:bg-gradient-to-b ${getColor(i)} flex-shrink-0`} />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-gray-900 dark:text-white break-words">{deck.name}</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          <i className="fa-solid fa-clone mr-1" />{deck.cardCount} cards
                          {deck.categories?.length > 0 && (
                            <span className="ml-2"><i className="fa-solid fa-tag mr-1" />{deck.categories.slice(0, 3).join(", ")}</span>
                          )}
                        </p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                          <i className="fa-solid fa-user mr-1" />
                          {deck.author?.name || "Anonymous"}
                          <span className="ml-3"><i className="fa-solid fa-arrow-up mr-1" />{deck.upvotes || 0}</span>
                          <span className="ml-3"><i className="fa-solid fa-copy mr-1" />{deck.copies || 0} copies</span>
                        </p>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 flex-shrink-0">
                        <button
                          onClick={() => handleUpvote(deck.id)}
                          className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-purple-500 hover:bg-purple-50 dark:hover:bg-purple-900/30 transition-all"
                          title="Upvote"
                        >
                          <i className="fa-solid fa-arrow-up" />
                        </button>
                        <button
                          onClick={() => handleSubscribe(deck.id)}
                          disabled={copying === deck.id}
                          className="px-3 py-2 bg-purple-600 text-white rounded-lg text-xs font-medium hover:bg-purple-700 transition-all disabled:opacity-50"
                          title="Add to library — stays synced with the original"
                        >
                          {copying === deck.id ? (
                            <><i className="fa-solid fa-spinner fa-spin mr-1" /></>
                          ) : (
                            <><i className="fa-solid fa-plus mr-1" />Add</>
                          )}
                        </button>
                        <button
                          onClick={() => handleClone(deck.id)}
                          disabled={copying === deck.id}
                          className="px-3 py-2 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-medium hover:bg-gray-300 dark:hover:bg-gray-500 transition-all disabled:opacity-50"
                          title="Clone to edit — makes your own copy"
                        >
                          <i className="fa-solid fa-copy mr-1" />Clone
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-xl shadow-2xl text-sm font-medium flex items-center gap-2 animate-[slideUp_0.3s_ease-out] ${
          toast.type === "error"
            ? "bg-red-600 text-white"
            : "bg-green-600 text-white"
        }`}>
          <i className={`fa-solid ${toast.type === "error" ? "fa-circle-exclamation" : "fa-circle-check"}`} />
          {toast.msg}
        </div>
      )}
    </div>
  );
}
