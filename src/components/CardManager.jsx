import { useState, useMemo, useEffect, useRef } from "react";
import SuggestEditModal from "./SuggestEditModal";
import CardToolbar from "./card-manager/CardToolbar";
import CardRow from "./card-manager/CardRow";
import BulkActionBar from "./card-manager/BulkActionBar";
import CardEditPanel from "./card-manager/CardEditPanel";
import MediaUploadField from "./card-manager/MediaUploadField";

const DIFFICULTY_OPTIONS = ["easy", "medium", "hard"];
const PAGE_SIZE = 50;

export default function CardManager({ cards, allCards, categories, onAddCard, onEditCard, onDeleteCard, isReference, subscribedTo }) {
  // --- Suggest edit (subscribed decks) ---
  const [suggestModal, setSuggestModal] = useState(null);

  // --- Add card form ---
  const [showAddForm, setShowAddForm] = useState(false);
  const [newCard, setNewCard] = useState({ front: "", back: "", category: categories[0] || "General", difficulty: "medium", frontImages: [], backImages: [], frontAudio: [], backAudio: [] });
  const [addReversed, setAddReversed] = useState(false);

  // --- Edit panel ---
  const [editCard, setEditCard] = useState(null);

  // --- Delete confirmation ---
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  // --- Search, sort, filter ---
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [filterDifficulty, setFilterDifficulty] = useState("all");
  const [filterType, setFilterType] = useState("all");

  // --- Bulk selection ---
  const [selectedIds, setSelectedIds] = useState(new Set());

  // --- Progressive rendering ---
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef(null);

  // Reset visible count and selection when filters change
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
    setSelectedIds(new Set());
  }, [searchQuery, sortBy, filterDifficulty, filterType]);

  // Prune stale selections when cards change
  useEffect(() => {
    const cardIds = new Set(cards.map(c => c.id));
    setSelectedIds(prev => {
      const pruned = new Set([...prev].filter(id => cardIds.has(id)));
      return pruned.size !== prev.size ? pruned : prev;
    });
  }, [cards]);

  // --- Filtering + sorting ---
  const processedCards = useMemo(() => {
    let result = cards;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c =>
        (c.front || "").toLowerCase().includes(q) || (c.back || "").toLowerCase().includes(q)
      );
    }

    if (filterDifficulty !== "all") {
      result = result.filter(c => c.difficulty === filterDifficulty);
    }

    if (filterType === "custom") result = result.filter(c => c.custom);
    if (filterType === "imported") result = result.filter(c => !c.custom);

    switch (sortBy) {
      case "oldest":
        result = [...result].sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
        break;
      case "newest":
        result = [...result].sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
        break;
      case "category":
        result = [...result].sort((a, b) => (a.category || "").localeCompare(b.category || ""));
        break;
      case "difficulty": {
        const order = { easy: 0, medium: 1, hard: 2 };
        result = [...result].sort((a, b) => (order[a.difficulty] ?? 1) - (order[b.difficulty] ?? 1));
        break;
      }
    }

    return result;
  }, [cards, searchQuery, sortBy, filterDifficulty, filterType]);

  const visibleCards = processedCards.slice(0, visibleCount);
  const hasMore = visibleCount < processedCards.length;

  // Infinite scroll
  useEffect(() => {
    if (!sentinelRef.current || !hasMore) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) setVisibleCount(v => v + PAGE_SIZE);
    }, { threshold: 0.1 });
    observer.observe(sentinelRef.current);
    return () => observer.disconnect();
  }, [hasMore, visibleCount]);

  // --- Selection handlers ---
  function toggleSelect(cardId) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(cardId) ? next.delete(cardId) : next.add(cardId);
      return next;
    });
  }

  function selectAll() {
    setSelectedIds(new Set(processedCards.map(c => c.id)));
  }

  function deselectAll() {
    setSelectedIds(new Set());
  }

  // --- Bulk operations ---
  function handleBulkCategory(category) {
    for (const id of selectedIds) {
      const card = cards.find(c => c.id === id);
      if (card) onEditCard(id, { ...card, category });
    }
    deselectAll();
  }

  function handleBulkDifficulty(difficulty) {
    for (const id of selectedIds) {
      const card = cards.find(c => c.id === id);
      if (card) onEditCard(id, { ...card, difficulty });
    }
    deselectAll();
  }

  function handleBulkDelete() {
    for (const id of selectedIds) {
      onDeleteCard(id);
    }
    deselectAll();
  }

  // --- Add card ---
  function handleAdd() {
    if (!newCard.front.trim() || !newCard.back.trim()) return;
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2);
    const card = {
      ...newCard,
      id,
      custom: true,
      createdAt: new Date().toISOString(),
    };
    onAddCard(card);

    if (addReversed) {
      onAddCard({
        ...card,
        id: id + "-rev",
        front: newCard.back.trim(),
        back: newCard.front.trim(),
        frontImages: newCard.backImages || [],
        backImages: newCard.frontImages || [],
        frontAudio: newCard.backAudio || [],
        backAudio: newCard.frontAudio || [],
      });
    }

    setNewCard({ front: "", back: "", category: categories[0] || "General", difficulty: "medium", frontImages: [], backImages: [], frontAudio: [], backAudio: [] });
    setShowAddForm(false);
  }

  // --- Edit ---
  function startEdit(card) {
    setEditCard({ ...card });
  }

  function saveEdit() {
    if (!editCard?.front?.trim() || !editCard?.back?.trim()) return;
    onEditCard(editCard.id, editCard);
    setEditCard(null);
  }

  return (
    <div className="space-y-3">
      {/* Add card button / form */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          onClick={() => isReference && subscribedTo ? setSuggestModal({ type: "new" }) : setShowAddForm(!showAddForm)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
        >
          <span className="flex items-center gap-3 font-medium text-gray-800 dark:text-gray-200">
            <i className={`fa-solid ${isReference ? "fa-lightbulb" : showAddForm ? "fa-minus" : "fa-plus"} text-indigo-600 dark:text-indigo-400`} />
            {isReference ? "Suggest new card" : "Create custom card"}
          </span>
          {!isReference && <i className={`fa-solid fa-chevron-${showAddForm ? "up" : "down"} text-gray-400 text-xs`} />}
        </button>

        {showAddForm && (
          <div className="px-6 pb-6 space-y-4 border-t border-gray-100 dark:border-gray-700 pt-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Question</label>
              <textarea
                value={newCard.front}
                onChange={(e) => setNewCard({ ...newCard, front: e.target.value })}
                placeholder="Enter the question..."
                rows={3}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Answer</label>
              <textarea
                value={newCard.back}
                onChange={(e) => setNewCard({ ...newCard, back: e.target.value })}
                placeholder="Enter the answer..."
                rows={3}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <MediaUploadField label="Image" accept="image/*" icon="fa-image" currentUrls={newCard.frontImages || []} onUrlsChange={(urls) => setNewCard({ ...newCard, frontImages: urls })} />
              <MediaUploadField label="Audio" accept="audio/*" icon="fa-music" currentUrls={newCard.frontAudio || []} onUrlsChange={(urls) => setNewCard({ ...newCard, frontAudio: urls })} />
            </div>
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Category</label>
                <select value={newCard.category} onChange={(e) => setNewCard({ ...newCard, category: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 outline-none">
                  {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Difficulty</label>
                <select value={newCard.difficulty} onChange={(e) => setNewCard({ ...newCard, difficulty: e.target.value })} className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 outline-none">
                  {DIFFICULTY_OPTIONS.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={addReversed} onChange={e => setAddReversed(e.target.checked)} className="w-4 h-4 text-indigo-600 border-gray-300 rounded" />
                <span className="text-xs text-gray-500 dark:text-gray-400">Also create reversed card</span>
              </label>
              <div className="flex gap-2">
                <button onClick={() => setShowAddForm(false)} className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">Cancel</button>
                <button onClick={handleAdd} disabled={!newCard.front.trim() || !newCard.back.trim()} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-sm font-medium transition-colors">
                  <i className="fa-solid fa-plus mr-1.5" />Add Card{addReversed ? "s" : ""}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Search / Sort / Filter toolbar */}
      <CardToolbar
        searchQuery={searchQuery} setSearchQuery={setSearchQuery}
        sortBy={sortBy} setSortBy={setSortBy}
        filterDifficulty={filterDifficulty} setFilterDifficulty={setFilterDifficulty}
        filterType={filterType} setFilterType={setFilterType}
        totalCards={cards.length}
        visibleCards={processedCards.length}
      />

      {/* Card list */}
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1 relative">
        {visibleCards.length === 0 ? (
          <div className="text-center py-12 text-gray-400 dark:text-gray-500">
            <i className="fa-solid fa-magnifying-glass text-2xl mb-3 block" />
            <p className="text-sm">No cards match your filters</p>
          </div>
        ) : (
          visibleCards.map((card) => (
            <CardRow
              key={card.id}
              card={card}
              isReference={isReference}
              showCheckbox={!isReference}
              selected={selectedIds.has(card.id)}
              onToggleSelect={toggleSelect}
              onStartEdit={startEdit}
              onDelete={(c) => setDeleteConfirm(c.id)}
              deleteConfirm={deleteConfirm}
              onConfirmDelete={(id) => { onDeleteCard(id); setDeleteConfirm(null); }}
              onCancelDelete={() => setDeleteConfirm(null)}
              onSuggestEdit={(c) => setSuggestModal({ card: c, type: "edit" })}
            />
          ))
        )}

        {/* Infinite scroll sentinel */}
        {hasMore && <div ref={sentinelRef} className="h-8 flex items-center justify-center text-xs text-gray-400"><i className="fa-solid fa-spinner fa-spin mr-2" />Loading more...</div>}

        {/* Bulk action bar */}
        <BulkActionBar
          selectedCount={selectedIds.size}
          totalVisible={processedCards.length}
          onSelectAll={selectAll}
          onDeselectAll={deselectAll}
          onBulkCategory={handleBulkCategory}
          onBulkDifficulty={handleBulkDifficulty}
          onBulkDelete={handleBulkDelete}
          categories={categories}
        />
      </div>

      {/* Slide-out edit panel */}
      <CardEditPanel
        card={editCard}
        categories={categories}
        onChange={setEditCard}
        onSave={saveEdit}
        onCancel={() => setEditCard(null)}
      />

      {/* Suggest edit modal for subscribed decks */}
      {suggestModal && subscribedTo && (
        <SuggestEditModal
          open={true}
          onClose={() => setSuggestModal(null)}
          publicDeckId={subscribedTo}
          card={suggestModal.card}
          type={suggestModal.type}
        />
      )}
    </div>
  );
}
