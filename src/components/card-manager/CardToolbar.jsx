const SORT_OPTIONS = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "category", label: "Category A-Z" },
  { value: "difficulty", label: "Difficulty" },
];

const DIFFICULTY_FILTERS = ["all", "easy", "medium", "hard"];
const TYPE_FILTERS = ["all", "custom", "imported"];

export default function CardToolbar({
  searchQuery, setSearchQuery,
  sortBy, setSortBy,
  filterDifficulty, setFilterDifficulty,
  filterType, setFilterType,
  totalCards, visibleCards,
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Search + Sort row */}
      <div className="flex items-center gap-3 p-3">
        <div className="relative flex-1">
          <i className="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-xs" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search cards..."
            className="w-full pl-9 pr-8 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg text-sm text-gray-800 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <i className="fa-solid fa-xmark text-xs" />
            </button>
          )}
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-xs text-gray-700 dark:text-gray-300 outline-none"
        >
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {/* Filter chips */}
      <div className="flex items-center gap-1.5 px-3 pb-3 flex-wrap">
        {DIFFICULTY_FILTERS.map((d) => (
          <button
            key={d}
            onClick={() => setFilterDifficulty(d)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
              filterDifficulty === d
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            {d === "all" ? "All" : d.charAt(0).toUpperCase() + d.slice(1)}
          </button>
        ))}
        <div className="w-px h-4 bg-gray-200 dark:bg-gray-700 mx-1" />
        {TYPE_FILTERS.map((t) => (
          <button
            key={t}
            onClick={() => setFilterType(t)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
              filterType === t
                ? "bg-indigo-600 text-white"
                : "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600"
            }`}
          >
            {t === "all" ? "All types" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}

        {/* Result count */}
        <span className="ml-auto text-[11px] text-gray-400 dark:text-gray-500">
          {visibleCards === totalCards
            ? `${totalCards} cards`
            : `${visibleCards} of ${totalCards}`
          }
        </span>
      </div>
    </div>
  );
}
