import { useState } from "react";

const DIFFICULTY_OPTIONS = ["easy", "medium", "hard"];

export default function BulkActionBar({
  selectedCount, totalVisible,
  onSelectAll, onDeselectAll,
  onBulkCategory, onBulkDifficulty, onBulkDelete,
  categories,
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (selectedCount === 0) return null;

  return (
    <div className="sticky bottom-0 z-20 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-700 px-4 py-3 rounded-b-2xl">
      <div className="flex items-center gap-3 flex-wrap">
        <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
          {selectedCount} selected
        </span>

        <button
          onClick={selectedCount === totalVisible ? onDeselectAll : onSelectAll}
          className="text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
        >
          {selectedCount === totalVisible ? "Deselect all" : "Select all"}
        </button>

        <div className="flex-1" />

        {/* Bulk category */}
        <select
          defaultValue=""
          onChange={(e) => { if (e.target.value) { onBulkCategory(e.target.value); e.target.value = ""; } }}
          className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300 outline-none"
        >
          <option value="" disabled>Set category</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        {/* Bulk difficulty */}
        <select
          defaultValue=""
          onChange={(e) => { if (e.target.value) { onBulkDifficulty(e.target.value); e.target.value = ""; } }}
          className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-2 py-1.5 text-xs text-gray-700 dark:text-gray-300 outline-none"
        >
          <option value="" disabled>Set difficulty</option>
          {DIFFICULTY_OPTIONS.map((d) => (
            <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
          ))}
        </select>

        {/* Bulk delete */}
        {confirmDelete ? (
          <div className="flex items-center gap-2">
            <span className="text-xs text-red-600 dark:text-red-400">Delete {selectedCount}?</span>
            <button
              onClick={() => { onBulkDelete(); setConfirmDelete(false); }}
              className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-xs font-medium transition-colors"
          >
            <i className="fa-solid fa-trash" />
            Delete
          </button>
        )}
      </div>
    </div>
  );
}
