export default function MobileNav({ tabs, activeTab, onTabChange }) {
  return (
    <>
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg border-t border-gray-200 dark:border-gray-700 z-40 pb-[env(safe-area-inset-bottom)]">
        <div className="flex justify-around items-center h-16">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-colors ${
                activeTab === tab.id
                  ? "text-indigo-600 dark:text-indigo-400"
                  : "text-gray-400 dark:text-gray-500"
              }`}
            >
              <i className={`${tab.icon} text-lg`} />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
      {/* Spacer for mobile bottom nav */}
      <div className="sm:hidden h-16" />
    </>
  );
}
