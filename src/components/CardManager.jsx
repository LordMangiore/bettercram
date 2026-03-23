import { useState } from "react";

const DIFFICULTY_OPTIONS = ["easy", "medium", "hard"];
const difficultyColors = {
  easy: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  hard: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export default function CardManager({ cards, allCards, categories, onAddCard, onEditCard, onDeleteCard }) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [newCard, setNewCard] = useState({ front: "", back: "", category: categories[0] || "General", difficulty: "medium" });
  const [editCard, setEditCard] = useState(null);

  function handleAdd() {
    if (!newCard.front.trim() || !newCard.back.trim()) return;
    const card = {
      ...newCard,
      id: Date.now().toString(36) + Math.random().toString(36).slice(2),
      custom: true,
      createdAt: new Date().toISOString(),
    };
    onAddCard(card);
    setNewCard({ front: "", back: "", category: categories[0] || "General", difficulty: "medium" });
    setShowAddForm(false);
  }

  function startEdit(card) {
    setEditingId(card.id);
    setEditCard({ ...card });
  }

  function saveEdit() {
    if (!editCard.front.trim() || !editCard.back.trim()) return;
    onEditCard(editCard.id, editCard);
    setEditingId(null);
    setEditCard(null);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditCard(null);
  }

  function confirmDelete(card) {
    setDeleteConfirm(card.id);
  }

  function doDelete(cardId) {
    onDeleteCard(cardId);
    setDeleteConfirm(null);
  }

  return (
    <div className="space-y-4">
      {/* Add card button / form */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="w-full px-6 py-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors"
        >
          <span className="flex items-center gap-3 font-medium text-gray-800 dark:text-gray-200">
            <i className={`fa-solid ${showAddForm ? "fa-minus" : "fa-plus"} text-indigo-600 dark:text-indigo-400`} />
            Create custom card
          </span>
          <i className={`fa-solid fa-chevron-${showAddForm ? "up" : "down"} text-gray-400 text-xs`} />
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
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Category</label>
                <select
                  value={newCard.category}
                  onChange={(e) => setNewCard({ ...newCard, category: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 outline-none"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Difficulty</label>
                <select
                  value={newCard.difficulty}
                  onChange={(e) => setNewCard({ ...newCard, difficulty: e.target.value })}
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 outline-none"
                >
                  {DIFFICULTY_OPTIONS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowAddForm(false)}
                className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={handleAdd}
                disabled={!newCard.front.trim() || !newCard.back.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <i className="fa-solid fa-plus mr-1.5" />
                Add Card
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Card count */}
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {cards.length} cards {cards.filter(c => c.custom).length > 0 && `(${cards.filter(c => c.custom).length} custom)`}
      </p>

      {/* Card list */}
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        {cards.map((card) => (
          <div
            key={card.id}
            className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden transition-all"
          >
            {editingId === card.id ? (
              /* Edit mode */
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Question</label>
                  <textarea
                    value={editCard.front}
                    onChange={(e) => setEditCard({ ...editCard, front: e.target.value })}
                    rows={2}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Answer</label>
                  <textarea
                    value={editCard.back}
                    onChange={(e) => setEditCard({ ...editCard, back: e.target.value })}
                    rows={2}
                    className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
                  />
                </div>
                <div className="flex gap-3">
                  <select
                    value={editCard.category}
                    onChange={(e) => setEditCard({ ...editCard, category: e.target.value })}
                    className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-800 dark:text-gray-200 outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <select
                    value={editCard.difficulty}
                    onChange={(e) => setEditCard({ ...editCard, difficulty: e.target.value })}
                    className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-800 dark:text-gray-200 outline-none"
                  >
                    {DIFFICULTY_OPTIONS.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={cancelEdit} className="px-3 py-1.5 text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                    Cancel
                  </button>
                  <button
                    onClick={saveEdit}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              /* View mode */
              <div className="p-4 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/50 px-2 py-0.5 rounded-full">
                      {card.category}
                    </span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${difficultyColors[card.difficulty] || ""}`}>
                      {card.difficulty}
                    </span>
                    {card.custom && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                        Custom
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2 font-medium">
                    {card.front}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-1 mt-1">
                    {card.back}
                  </p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => startEdit(card)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:text-indigo-400 dark:hover:bg-indigo-900/30 transition-colors"
                    title="Edit card"
                  >
                    <i className="fa-solid fa-pen text-xs" />
                  </button>
                  {deleteConfirm === card.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => doDelete(card.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30"
                        title="Confirm delete"
                      >
                        <i className="fa-solid fa-check text-xs" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600"
                        title="Cancel"
                      >
                        <i className="fa-solid fa-xmark text-xs" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => confirmDelete(card)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/30 transition-colors"
                      title="Delete card"
                    >
                      <i className="fa-solid fa-trash text-xs" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
