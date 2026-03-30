const difficultyColors = {
  easy: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  hard: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export default function CardRow({
  card, isReference, selected, showCheckbox,
  onToggleSelect, onStartEdit, onDelete, onConfirmDelete, onCancelDelete,
  deleteConfirm, onSuggestEdit,
}) {
  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border transition-all ${
      selected
        ? "border-indigo-400 dark:border-indigo-500 ring-1 ring-indigo-400/30"
        : "border-gray-200 dark:border-gray-700"
    }`}>
      <div className="p-4 flex items-start gap-3">
        {/* Checkbox */}
        {showCheckbox && (
          <input
            type="checkbox"
            checked={selected}
            onChange={() => onToggleSelect(card.id)}
            className="w-4 h-4 mt-1 text-indigo-600 border-gray-300 dark:border-gray-600 rounded flex-shrink-0 cursor-pointer"
          />
        )}

        {/* Card content */}
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
            {card.occlusion && (
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300">
                <i className="fa-solid fa-eye-slash mr-1" />IO
              </span>
            )}
          </div>
          <p className="text-sm text-gray-800 dark:text-gray-200 line-clamp-2 font-medium">
            {card.front}
          </p>
          {card.back && (
            <p className="text-xs text-gray-400 dark:text-gray-500 line-clamp-1 mt-1">
              {card.back}
            </p>
          )}
          {/* Thumbnail preview for image cards */}
          {card.frontImages?.length > 0 && (
            <div className="flex gap-1.5 mt-2">
              {card.frontImages.slice(0, 3).map((src, i) => (
                <img key={i} src={src} alt="" className="h-10 w-10 object-cover rounded border border-gray-200 dark:border-gray-700" />
              ))}
              {card.frontImages.length > 3 && (
                <span className="text-[10px] text-gray-400 self-center">+{card.frontImages.length - 3}</span>
              )}
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-1 flex-shrink-0">
          {isReference ? (
            <button
              onClick={() => onSuggestEdit(card)}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:text-amber-400 dark:hover:bg-amber-900/30 transition-colors"
              title="Suggest edit"
            >
              <i className="fa-solid fa-lightbulb text-xs" />
            </button>
          ) : (
            <>
              <button
                onClick={() => onStartEdit(card)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:text-indigo-400 dark:hover:bg-indigo-900/30 transition-colors"
                title="Edit card"
              >
                <i className="fa-solid fa-pen text-xs" />
              </button>
              {deleteConfirm === card.id ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onConfirmDelete(card.id)}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30"
                    title="Confirm delete"
                  >
                    <i className="fa-solid fa-check text-xs" />
                  </button>
                  <button
                    onClick={onCancelDelete}
                    className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600"
                    title="Cancel"
                  >
                    <i className="fa-solid fa-xmark text-xs" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => onDelete(card)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:text-red-400 dark:hover:bg-red-900/30 transition-colors"
                  title="Delete card"
                >
                  <i className="fa-solid fa-trash text-xs" />
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
