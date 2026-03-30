import { useState, useRef, useEffect } from "react";

/**
 * Combo box for category selection — pick from suggestions or type a custom one.
 * Shows a filtered dropdown as you type. Accepts any text input.
 */
export default function CategoryInput({ value, onChange, categories, className = "" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || "");
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Sync external value changes
  useEffect(() => {
    setQuery(value || "");
  }, [value]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const filtered = categories.filter(c =>
    c.toLowerCase().includes(query.toLowerCase())
  );

  // Show "Create X" option if typed text doesn't exactly match any category
  const exactMatch = categories.some(c => c.toLowerCase() === query.trim().toLowerCase());
  const showCreate = query.trim() && !exactMatch;

  function select(cat) {
    setQuery(cat);
    onChange(cat);
    setOpen(false);
  }

  function handleInputChange(e) {
    const val = e.target.value;
    setQuery(val);
    setOpen(true);
    // Commit the value as they type (so it's saved even without selecting from list)
    if (val.trim()) onChange(val.trim());
  }

  function handleKeyDown(e) {
    if (e.key === "Enter") {
      e.preventDefault();
      if (query.trim()) {
        onChange(query.trim());
        setOpen(false);
      }
    }
    if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={handleInputChange}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder="Type or select..."
        className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
      <i className="fa-solid fa-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-[10px] pointer-events-none" />

      {open && (filtered.length > 0 || showCreate) && (
        <div className="absolute z-30 top-full left-0 right-0 mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-48 overflow-y-auto">
          {showCreate && (
            <button
              onClick={() => select(query.trim())}
              className="w-full text-left px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 flex items-center gap-2"
            >
              <i className="fa-solid fa-plus text-xs" />
              Create "{query.trim()}"
            </button>
          )}
          {filtered.map((cat) => (
            <button
              key={cat}
              onClick={() => select(cat)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 ${
                cat === value
                  ? "text-indigo-600 dark:text-indigo-400 font-medium"
                  : "text-gray-700 dark:text-gray-300"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
