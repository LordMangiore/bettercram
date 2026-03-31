import { useState, useMemo, useRef, useEffect } from "react";
import { publishDeck, browsePublicDecks, subscribeToDeck, cloneDeck, upvotePublicDeck, parseUploadedFile, listSuggestions } from "../api";
import { parseAnkiFile, uploadAnkiMedia, resolveCardMedia } from "../lib/ankiParser";
import SuggestEditModal from "./SuggestEditModal";
import SuggestionPanel from "./SuggestionPanel";
import DeckCardMenu from "./deck-library/DeckCardMenu";

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

export default function DeckLibrary({ decks, activeDeckId, onSelectDeck, onCreateDeck, onDeleteDeck, onGenerateFromDoc, generating, generatingStatus, onRefreshDecks, onAddDeckOptimistic, user, onRegenerate, onAddMore, onManageCards, onShowPlanner, studyPlan, deckGroups = [], onSaveDeckGroups, onAssignDeckGroup, onStudyGroup, onRenameDeck }) {
  const [showCreate, setShowCreate] = useState(false);
  const [suggestModal, setSuggestModal] = useState(null); // { publicDeckId, card?, type }
  const [suggestionPanel, setSuggestionPanel] = useState(null); // { publicDeckId, deckName }
  const [createMode, setCreateMode] = useState("url"); // "url" | "topic" | "crawl" | "file"
  const [uploadFile, setUploadFile] = useState(null); // { name, size } for display
  const [uploadReady, setUploadReady] = useState(null); // parsed result, ready to import
  const [uploadParsing, setUploadParsing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const fileInputRef = useRef(null);
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [crawlLimit, setCrawlLimit] = useState(25);
  const [density, setDensity] = useState("balanced");
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
  const [menuOpenDeckId, setMenuOpenDeckId] = useState(null);
  const [renamingDeckId, setRenamingDeckId] = useState(null);
  const [renameValue, setRenameValue] = useState("");
  const [suggestionCounts, setSuggestionCounts] = useState({});
  const renameInputRef = useRef(null);

  // Fetch suggestion counts for published decks
  useEffect(() => {
    const publishedDecks = decks.filter(d => d.isPublic && !d.isReference);
    if (publishedDecks.length === 0) return;
    (async () => {
      const counts = {};
      for (const deck of publishedDecks) {
        try {
          const { suggestions } = await listSuggestions(deck.id, "pending");
          if (suggestions?.length > 0) counts[deck.id] = suggestions.length;
        } catch {}
      }
      setSuggestionCounts(counts);
    })();
  }, [decks]);

  // Focus rename input when it appears
  useEffect(() => {
    if (renamingDeckId && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renamingDeckId]);

  function startRename(deck) {
    setRenamingDeckId(deck.id);
    setRenameValue(deck.name);
  }

  function saveRename() {
    if (renameValue.trim() && renamingDeckId) {
      onRenameDeck(renamingDeckId, renameValue.trim());
    }
    setRenamingDeckId(null);
  }

  // Compute custom groups, test groups, and ungrouped decks
  const { customGroups, testGroups, ungroupedDecks } = useMemo(() => {
    const assignedDeckIds = new Set();

    // Custom deck groups first
    const custom = (deckGroups || []).map(g => {
      const groupDecks = decks.filter(d => d.group === g.id);
      groupDecks.forEach(d => assignedDeckIds.add(d.id));
      const totalCards = groupDecks.reduce((sum, d) => sum + (d.cardCount || 0), 0);
      return { ...g, decks: groupDecks, totalCards };
    }).filter(g => g.decks.length > 0 || true); // show empty groups too

    // Test groups (from study plan)
    const tests = studyPlan?.tests || [];
    const testGrps = [];
    for (const test of tests) {
      if (!test.deckIds || test.deckIds.length === 0) continue;
      const groupDecks = test.deckIds.map(did => decks.find(d => d.id === did)).filter(Boolean).filter(d => !assignedDeckIds.has(d.id));
      if (groupDecks.length === 0) continue;
      groupDecks.forEach(d => assignedDeckIds.add(d.id));
      const totalCards = groupDecks.reduce((sum, d) => sum + (d.cardCount || 0), 0);
      testGrps.push({ test, decks: groupDecks, totalCards });
    }

    const ungrouped = decks.filter(d => !assignedDeckIds.has(d.id));
    return { customGroups: custom, testGroups: testGrps, ungroupedDecks: ungrouped };
  }, [studyPlan, decks, deckGroups]);

  const hasGroups = customGroups.length > 0 || testGroups.length > 0;
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [editingGroup, setEditingGroup] = useState(null);

  function toggleGroup(id) {
    setCollapsedGroups(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function handleCreateGroup(e) {
    e?.preventDefault();
    if (!newGroupName.trim()) return;
    const newGroup = {
      id: "group-" + Date.now(),
      name: newGroupName.trim(),
      color: COLORS[deckGroups.length % COLORS.length],
      order: deckGroups.length,
    };
    onSaveDeckGroups?.([...deckGroups, newGroup]);
    setNewGroupName("");
    setShowNewGroup(false);
  }

  function handleDeleteGroup(groupId) {
    // Remove group and unassign all decks in it
    onSaveDeckGroups?.(deckGroups.filter(g => g.id !== groupId));
    decks.filter(d => d.group === groupId).forEach(d => onAssignDeckGroup?.(d.id, null));
  }

  function handleRenameGroup(groupId, newName) {
    onSaveDeckGroups?.(deckGroups.map(g => g.id === groupId ? { ...g, name: newName } : g));
    setEditingGroup(null);
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
      // Optimistically add to local deck list immediately
      if (onAddDeckOptimistic && result.deckId) {
        onAddDeckOptimistic({
          id: result.deckId,
          name: result.name,
          cardCount: result.cardCount || 0,
          subscribedTo: publicDeckId,
          isReference: true,
        });
      }
      // Also trigger background refresh to get full data eventually
      if (onRefreshDecks) setTimeout(() => onRefreshDecks(), 3000);
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
      if (onAddDeckOptimistic && result.deckId) {
        onAddDeckOptimistic({
          id: result.deckId,
          name: result.name,
          cardCount: result.cardCount || 0,
          isClone: true,
        });
      }
      if (onRefreshDecks) setTimeout(() => onRefreshDecks(), 3000);
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
      const options = { density };
      let url = null;

      if (createMode === "file" && uploadReady) {
        // File was already parsed on selection — just use the results
        if (uploadReady.type === "cards") {
          options.directCards = uploadReady.cards;
          options.skipGenerate = true;
        } else if (uploadReady.type === "text") {
          options.uploadedContent = uploadReady.content;
        }
      } else if (createMode === "topic") {
        options.topic = newTopic.trim();
      } else if (createMode === "crawl") {
        url = newUrl.trim() || null;
        options.crawl = true;
        options.pageLimit = crawlLimit;
      } else {
        url = newUrl.trim() || null;
      }

      await onCreateDeck(newName.trim(), url, options);
      setNewName("");
      setNewUrl("");
      setNewTopic("");
      setUploadFile(null);
      setUploadReady(null);
      setUploadStatus("");
      setDensity("balanced");
      setShowCreate(false);
    } catch (err) {
      alert("Failed to create deck: " + err.message);
    } finally {
      setCreating(false);
    }
  }

  // Renders a single deck card — clean design with 3-dot menu
  function renderDeckCard(deck, colorIndex) {
    const isActive = activeDeckId === deck.id;
    const pendingSuggestions = suggestionCounts[deck.id] || 0;

    function handleExport() {
      const blob = new Blob([JSON.stringify({ name: deck.name, cards: deck.cards || [] }, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = `${deck.name.replace(/[^a-z0-9]/gi, "_")}.json`; a.click();
      URL.revokeObjectURL(url);
    }

    return (
      <div
        key={deck.id}
        onClick={() => onSelectDeck(deck.id)}
        className={`relative rounded-2xl cursor-pointer hover:scale-[1.02] transition-all ${
          isActive ? "ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-gray-900" : ""
        } ${menuOpenDeckId === deck.id ? "z-30" : ""}`}
      >
        {/* Gradient header — clean: name + 3-dot menu only */}
        <div className={`bg-gradient-to-br ${getColor(colorIndex)} p-5 rounded-t-2xl`}>
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              {renamingDeckId === deck.id ? (
                <input
                  ref={renameInputRef}
                  value={renameValue}
                  onChange={(e) => setRenameValue(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") saveRename(); if (e.key === "Escape") setRenamingDeckId(null); }}
                  onBlur={saveRename}
                  onClick={(e) => e.stopPropagation()}
                  className="w-full bg-white/20 text-white font-bold text-lg rounded-lg px-2 py-1 outline-none focus:bg-white/30 placeholder-white/50"
                />
              ) : (
                <h3 className="text-lg font-bold text-white leading-tight">
                  {deck.name}
                </h3>
              )}
            </div>
            <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
              {/* Suggestion count badge */}
              {pendingSuggestions > 0 && (
                <button
                  onClick={() => setSuggestionPanel({ publicDeckId: `${user?.id}-${deck.id}`, deckName: deck.name })}
                  className="w-7 h-7 flex items-center justify-center rounded-full bg-amber-500/30 text-amber-200 text-[10px] font-bold hover:bg-amber-500/50 transition-colors"
                  title={`${pendingSuggestions} pending suggestions`}
                >
                  {pendingSuggestions}
                </button>
              )}
              <DeckCardMenu
                deck={deck}
                deckGroups={deckGroups}
                onOpenChange={(isOpen) => setMenuOpenDeckId(isOpen ? deck.id : null)}
                onRename={() => startRename(deck)}
                onManageCards={() => onManageCards()}
                onExport={handleExport}
                onShare={() => handlePublish(deck.id, deck.isPublic)}
                onAssignGroup={(groupId) => onAssignDeckGroup?.(deck.id, groupId)}
                onRegenerate={() => onRegenerate()}
                onAddMore={() => onAddMore()}
                onGenerateFromDoc={() => onGenerateFromDoc(deck.id, deck.docUrl)}
                onSuggestCard={() => setSuggestModal({ publicDeckId: deck.subscribedTo, type: "new" })}
                onReviewSuggestions={() => setSuggestionPanel({ publicDeckId: deck.isReference ? deck.subscribedTo : `${user?.id}-${deck.id}`, deckName: deck.name })}
                suggestionCount={pendingSuggestions}
                onDelete={() => setConfirmDeleteDeckId(deck.id)}
              />
            </div>
          </div>
        </div>

        {/* Stats — compact */}
        <div className="bg-white dark:bg-gray-800 border border-t-0 border-gray-200 dark:border-gray-700 rounded-b-2xl px-4 py-3 -mt-3 relative">
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
          {/* Status badges */}
          {(deck.isPublic || deck.isReference || deck.isClone) && (
            <div className="flex gap-1.5 mt-2">
              {deck.isPublic && (
                <span className="inline-flex items-center px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-medium rounded-full">
                  <i className="fa-solid fa-globe mr-1" />Shared
                </span>
              )}
              {deck.isReference && (
                <span className="inline-flex items-center px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-medium rounded-full">
                  <i className="fa-solid fa-link mr-1" />Subscribed
                </span>
              )}
              {deck.isClone && (
                <span className="inline-flex items-center px-2 py-0.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-[10px] font-medium rounded-full">
                  <i className="fa-solid fa-copy mr-1" />Cloned
                </span>
              )}
            </div>
          )}
          {/* Empty deck hint */}
          {(deck.cardCount || 0) === 0 && (
            <p className="text-xs text-orange-400 dark:text-orange-500 mt-2">
              <i className="fa-solid fa-pen mr-1" />
              {deck.docUrl ? "Generate cards from linked doc" : "Add cards to get started"}
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">My Library</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {decks.length} {decks.length === 1 ? "deck" : "decks"}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleBrowse}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 transition-all shadow-md"
          >
            <i className="fa-solid fa-globe" />
            Browse Community
          </button>
          <button
            onClick={() => setShowNewGroup(!showNewGroup)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-600 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-all shadow-md"
          >
            <i className="fa-solid fa-folder-plus" />
            Group
          </button>
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-all shadow-md"
          >
            <i className="fa-solid fa-plus" />
            New Deck
          </button>
        </div>
      </div>

      {/* New group form */}
      {showNewGroup && (
        <form onSubmit={handleCreateGroup} className="mb-4 flex gap-2">
          <input
            type="text"
            value={newGroupName}
            onChange={e => setNewGroupName(e.target.value)}
            placeholder="Group name (e.g. MCAT Prep, Semester 2)"
            className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            autoFocus
          />
          <button type="submit" disabled={!newGroupName.trim()} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            Create
          </button>
          <button type="button" onClick={() => { setShowNewGroup(false); setNewGroupName(""); }} className="px-4 py-2.5 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400">
            Cancel
          </button>
        </form>
      )}

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

            {/* Source mode tabs */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Content source
              </label>
              <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-700 rounded-lg mb-3">
                {[
                  { id: "url", icon: "fa-link", label: "URL" },
                  { id: "file", icon: "fa-file-arrow-up", label: "Upload" },
                  { id: "topic", icon: "fa-magnifying-glass", label: "Search" },
                  { id: "crawl", icon: "fa-spider", label: "Crawl" },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setCreateMode(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all ${
                      createMode === tab.id
                        ? "bg-white dark:bg-gray-600 text-indigo-600 dark:text-indigo-300 shadow-sm"
                        : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
                    }`}
                  >
                    <i className={`fa-solid ${tab.icon}`} />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* URL mode */}
              {createMode === "url" && (
                <div>
                  <input
                    type="url"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://docs.google.com/document/d/... or any URL"
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Google Docs, websites, articles, or any public URL
                  </p>
                </div>
              )}

              {/* File upload mode */}
              {createMode === "file" && (
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.apkg"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const meta = { name: file.name, size: file.size };
                      setUploadFile(meta);
                      setUploadReady(null);
                      if (!newName.trim()) setNewName(file.name.replace(/\.(pdf|apkg)$/i, ""));

                      const ext = file.name.toLowerCase().split(".").pop();
                      if (ext === "apkg") {
                        // Parse Anki immediately while File reference is alive
                        setUploadParsing(true);
                        try {
                          const setStatus = (stage, detail) => setUploadStatus(detail || stage);
                          const result = await parseAnkiFile(file, setStatus);
                          // Upload media
                          let resolvedCards = result.cards;
                          if (result.media.size > 0) {
                            const urlMap = await uploadAnkiMedia(result.media, setStatus);
                            resolvedCards = resolveCardMedia(result.cards, urlMap);
                          }
                          setUploadReady({ type: "cards", cards: resolvedCards, title: result.deckName });
                          setUploadStatus(`Ready: ${resolvedCards.length} cards, ${result.media.size} media files`);
                          if (window.plausible) window.plausible("Anki Import", { props: { cards: String(resolvedCards.length), media: String(result.media.size) } });
                          if (result.deckName && (!newName.trim() || newName === meta.name.replace(/\.apkg$/i, ""))) {
                            setNewName(result.deckName);
                          }
                        } catch (err) {
                          console.error("Anki import error:", err);
                          setUploadStatus(`Error: ${err.message}`);
                          setUploadReady(null);
                        } finally {
                          setUploadParsing(false);
                        }
                      } else if (ext === "pdf") {
                        // PDF: read buffer now while reference is fresh
                        setUploadParsing(true);
                        setUploadStatus("Reading PDF...");
                        try {
                          const pdfFile = file; // use immediately
                          const result = await parseUploadedFile(pdfFile);
                          setUploadReady(result);
                          setUploadStatus(`Ready: ${result.chars ? Math.round(result.chars / 1000) + "k chars" : "parsed"}`);
                        } catch (err) {
                          setUploadStatus(`Error: ${err.message}`);
                          setUploadReady(null);
                        } finally {
                          setUploadParsing(false);
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className={`w-full border-2 border-dashed rounded-xl p-6 text-center transition-all ${
                      uploadFile
                        ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                        : "border-gray-300 dark:border-gray-600 hover:border-indigo-400 dark:hover:border-indigo-500"
                    }`}
                  >
                    {uploadFile ? (
                      <div>
                        <i className={`fa-solid ${uploadFile.name.endsWith(".apkg") ? "fa-layer-group text-purple-500" : "fa-file-pdf text-red-500"} text-2xl mb-2`} />
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{uploadFile.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{(uploadFile.size / 1024 / 1024).toFixed(1)} MB</p>
                        <p className="text-xs text-indigo-500 mt-2">Tap to change file</p>
                      </div>
                    ) : (
                      <div>
                        <i className="fa-solid fa-cloud-arrow-up text-2xl text-gray-400 dark:text-gray-500 mb-2" />
                        <p className="text-sm text-gray-600 dark:text-gray-300">Tap to upload a file</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">PDF or Anki (.apkg) — any size</p>
                      </div>
                    )}
                  </button>
                  {uploadStatus && (
                    <div className={`mt-2 flex items-center gap-2 text-xs ${uploadStatus.startsWith("Error") ? "text-red-500" : uploadStatus.startsWith("Ready") ? "text-green-500" : "text-indigo-500"}`}>
                      {uploadParsing ? <i className="fa-solid fa-spinner fa-spin" /> : uploadStatus.startsWith("Error") ? <i className="fa-solid fa-circle-exclamation" /> : uploadStatus.startsWith("Ready") ? <i className="fa-solid fa-circle-check" /> : null}
                      {uploadStatus}
                    </div>
                  )}
                </div>
              )}

              {/* Topic search mode */}
              {createMode === "topic" && (
                <div>
                  <input
                    type="text"
                    value={newTopic}
                    onChange={(e) => setNewTopic(e.target.value)}
                    placeholder="e.g., Krebs cycle, Constitutional law, Python data structures"
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    <i className="fa-solid fa-fire text-orange-400 mr-1" />
                    Powered by Firecrawl — searches the web and generates cards from the best sources
                  </p>
                </div>
              )}

              {/* Crawl site mode */}
              {createMode === "crawl" && (
                <div>
                  <input
                    type="url"
                    value={newUrl}
                    onChange={(e) => setNewUrl(e.target.value)}
                    placeholder="https://courses.example.edu/bio101"
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
                  />
                  <div className="flex items-center gap-3 mt-2">
                    <label className="text-xs text-gray-500 dark:text-gray-400">Page limit:</label>
                    <select
                      value={crawlLimit}
                      onChange={(e) => setCrawlLimit(Number(e.target.value))}
                      className="text-xs border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded px-2 py-1 text-gray-700 dark:text-gray-200"
                    >
                      <option value={10}>10 pages</option>
                      <option value={25}>25 pages</option>
                      <option value={50}>50 pages</option>
                    </select>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      <i className="fa-solid fa-spider text-purple-400 mr-1" />
                      Crawls all linked pages from the starting URL
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Card density selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Card density
              </label>
              <div className="flex gap-1">
                {[
                  { id: "concise", label: "Concise", desc: "Key concepts only" },
                  { id: "balanced", label: "Balanced", desc: "Good coverage" },
                  { id: "comprehensive", label: "Comprehensive", desc: "Everything worth studying" },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setDensity(opt.id)}
                    className={`px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                      density === opt.id
                        ? "bg-indigo-600 text-white"
                        : "bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                {density === "concise" ? "Fewer, high-quality cards" : density === "comprehensive" ? "Most cards — covers everything" : "Default — good coverage"}
              </p>
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="submit"
                disabled={creating || uploadParsing || !newName.trim() || (createMode === "topic" && !newTopic.trim()) || (createMode === "file" && !uploadReady)}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-all disabled:opacity-50"
              >
                {creating || uploadParsing ? (
                  <><i className="fa-solid fa-spinner fa-spin" /> {uploadParsing ? "Parsing file..." : "Creating..."}</>
                ) : createMode === "file" ? (
                  <><i className="fa-solid fa-file-arrow-up" /> {uploadFile?.name?.endsWith(".apkg") ? "Import Anki Deck" : "Upload & Generate"}</>
                ) : createMode === "topic" ? (
                  <><i className="fa-solid fa-magnifying-glass" /> Search & Generate</>
                ) : createMode === "crawl" ? (
                  <><i className="fa-solid fa-spider" /> Crawl & Generate</>
                ) : (
                  <><i className="fa-solid fa-plus" /> Create Deck</>
                )}
              </button>
              <button
                type="button"
                onClick={() => { setShowCreate(false); setNewName(""); setNewUrl(""); setNewTopic(""); setDensity("balanced"); }}
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
          {/* Custom deck groups */}
          {customGroups.map((group) => {
            const isCollapsed = collapsedGroups[group.id];
            return (
              <div key={group.id} className="rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
                <div
                  onClick={() => toggleGroup(group.id)}
                  className="bg-gray-50 dark:bg-gray-800/80 px-5 py-4 cursor-pointer select-none transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-3 h-3 rounded-full bg-gradient-to-br ${group.color} flex-shrink-0`} />
                      {editingGroup === group.id ? (
                        <input
                          type="text"
                          defaultValue={group.name}
                          autoFocus
                          onClick={e => e.stopPropagation()}
                          onBlur={e => handleRenameGroup(group.id, e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") handleRenameGroup(group.id, e.target.value); if (e.key === "Escape") setEditingGroup(null); }}
                          className="text-lg font-bold bg-transparent border-b border-indigo-500 outline-none text-gray-900 dark:text-white"
                        />
                      ) : (
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white truncate">{group.name}</h3>
                      )}
                      <i className={`fa-solid fa-chevron-${isCollapsed ? "right" : "down"} text-xs text-gray-400 flex-shrink-0`} />
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-xs text-gray-400 dark:text-gray-500">
                        {group.totalCards.toLocaleString()} cards · {group.decks.length} {group.decks.length === 1 ? "deck" : "decks"}
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); setEditingGroup(group.id); }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors text-xs"
                        title="Rename group"
                      >
                        <i className="fa-solid fa-pen" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); if (confirm(`Delete group "${group.name}"? Decks won't be deleted.`)) handleDeleteGroup(group.id); }}
                        className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-xs"
                        title="Delete group"
                      >
                        <i className="fa-solid fa-trash" />
                      </button>
                    </div>
                  </div>
                </div>
                {!isCollapsed && (
                  <div className="p-4 bg-white/50 dark:bg-gray-800/50">
                    {group.decks.length > 0 ? (
                      <div className="grid sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 pl-2">
                        {group.decks.map((deck) => renderDeckCard(deck, decks.indexOf(deck)))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                        No decks in this group yet. Assign decks from the menu on each deck card.
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

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
                    <div className="grid sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5 pl-2">
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
              <div className="grid sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
                {ungroupedDecks.map((deck) => renderDeckCard(deck, decks.indexOf(deck)))}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* No groups — show flat grid as before */
        <div className="grid sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
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
      {/* Delete confirmation modal */}
      {confirmDeleteDeckId && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setConfirmDeleteDeckId(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-sm shadow-2xl p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center">
                <i className="fa-solid fa-triangle-exclamation text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete deck?</h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">This cannot be undone</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
              <strong>"{decks.find(d => d.id === confirmDeleteDeckId)?.name}"</strong> and all {decks.find(d => d.id === confirmDeleteDeckId)?.cardCount || 0} cards will be permanently removed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => { onDeleteDeck(confirmDeleteDeckId); setConfirmDeleteDeckId(null); }}
                className="flex-1 py-2.5 bg-red-600 text-white rounded-xl font-semibold text-sm hover:bg-red-700 transition-all"
              >
                Yes, delete
              </button>
              <button
                onClick={() => setConfirmDeleteDeckId(null)}
                className="flex-1 py-2.5 text-sm font-medium text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suggestion modals */}
      <SuggestEditModal
        open={!!suggestModal}
        onClose={() => setSuggestModal(null)}
        publicDeckId={suggestModal?.publicDeckId}
        card={suggestModal?.card}
        type={suggestModal?.type || "new"}
      />
      <SuggestionPanel
        open={!!suggestionPanel}
        onClose={() => setSuggestionPanel(null)}
        publicDeckId={suggestionPanel?.publicDeckId}
        deckName={suggestionPanel?.deckName}
      />
    </div>
  );
}
