import MediaUploadField from "./MediaUploadField";

const DIFFICULTY_OPTIONS = ["easy", "medium", "hard"];

export default function CardEditPanel({ card, categories, onChange, onSave, onCancel }) {
  if (!card) return null;

  function update(field, value) {
    onChange({ ...card, [field]: value });
  }

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-30" onClick={onCancel} />

      {/* Panel */}
      <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white dark:bg-gray-800 shadow-2xl z-40 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Card</h3>
          <button
            onClick={onCancel}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:text-gray-300 dark:hover:bg-gray-700 transition-colors"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Front section */}
          <div className="bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wide">
              <i className="fa-solid fa-circle-question mr-1.5" />Front (Question)
            </h4>
            <textarea
              value={card.front}
              onChange={(e) => update("front", e.target.value)}
              rows={4}
              className="w-full border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            />
            <div className="grid grid-cols-2 gap-3">
              <MediaUploadField
                label="Images"
                accept="image/*"
                icon="fa-image"
                currentUrls={card.frontImages || []}
                onUrlsChange={(urls) => update("frontImages", urls)}
              />
              <MediaUploadField
                label="Audio"
                accept="audio/*"
                icon="fa-music"
                currentUrls={card.frontAudio || []}
                onUrlsChange={(urls) => update("frontAudio", urls)}
              />
            </div>
          </div>

          {/* Back section */}
          <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-xl p-4 space-y-3">
            <h4 className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wide">
              <i className="fa-solid fa-circle-check mr-1.5" />Back (Answer)
            </h4>
            <textarea
              value={card.back}
              onChange={(e) => update("back", e.target.value)}
              rows={4}
              className="w-full border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
            />
            <div className="grid grid-cols-2 gap-3">
              <MediaUploadField
                label="Images"
                accept="image/*"
                icon="fa-image"
                currentUrls={card.backImages || []}
                onUrlsChange={(urls) => update("backImages", urls)}
              />
              <MediaUploadField
                label="Audio"
                accept="audio/*"
                icon="fa-music"
                currentUrls={card.backAudio || []}
                onUrlsChange={(urls) => update("backAudio", urls)}
              />
            </div>
          </div>

          {/* Category + Difficulty */}
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5">Category</label>
              <select
                value={card.category}
                onChange={(e) => update("category", e.target.value)}
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
                value={card.difficulty}
                onChange={(e) => update("difficulty", e.target.value)}
                className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 outline-none"
              >
                {DIFFICULTY_OPTIONS.map((d) => (
                  <option key={d} value={d}>{d.charAt(0).toUpperCase() + d.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={!card.front?.trim() || !card.back?.trim()}
              className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 rounded-xl transition-colors"
            >
              Save Changes
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
