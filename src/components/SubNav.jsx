export default function SubNav({ items, active, onChange, isPro }) {
  return (
    <div className="flex items-center gap-1.5 mb-4 overflow-x-auto -mx-1 px-1">
      {items.map((item) => {
        const isActive = active === item.id;
        const locked = item.pro && !isPro;
        return (
          <button
            key={item.id}
            onClick={() => onChange(item.id)}
            className={`px-3 py-2 rounded-lg text-xs font-medium transition-all whitespace-nowrap flex-shrink-0 ${
              isActive
                ? "bg-indigo-600 text-white shadow-sm"
                : locked
                ? "bg-gray-100 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500"
                : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
            }`}
          >
            {item.icon && <i className={`${item.icon} mr-1.5`} />}
            {item.label}
            {locked && <i className="fa-solid fa-lock text-[9px] ml-1 opacity-50" />}
          </button>
        );
      })}
    </div>
  );
}
