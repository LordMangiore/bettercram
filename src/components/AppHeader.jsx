import NotificationCenter from "./NotificationCenter";
import { manageSubscription } from "../api";

export default function AppHeader({
  user,
  activeDeck,
  mode,
  cards,
  dark,
  setDark,
  showSearch,
  setShowSearch,
  searchQuery,
  setSearchQuery,
  filteredCards,
  notifications,
  unreadCount,
  setNotifications,
  subscription,
  decks,
  setMode,
  setShowPricing,
  setShowMenu,
  showMenu,
  setShowSettings,
  setShowNotificationSettings,
  setShowDeleteAccountModal,
  login,
  logout,
}) {
  return (
    <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
      <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
        <div
          onClick={() => { setMode("study"); setShowPricing(false); window.scrollTo(0, 0); }}
          className="cursor-pointer hover:opacity-80 transition-opacity min-w-0"
        >
          <h1 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <i className="fa-solid fa-bolt text-indigo-600 dark:text-indigo-400 mr-2" />
            BetterCram
          </h1>
          {activeDeck && mode !== "library" && (
            <p className="text-xs text-gray-400 dark:text-gray-500 truncate pl-7">
              {activeDeck.name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* Search toggle */}
          <button
            onClick={() => setShowSearch(!showSearch)}
            className={`w-9 h-9 flex items-center justify-center rounded-lg transition-colors ${
              showSearch
                ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300"
                : "text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700"
            }`}
          >
            <i className="fa-solid fa-magnifying-glass" />
          </button>
          {/* Notification center */}
          <NotificationCenter
            notifications={notifications}
            unreadCount={unreadCount}
            onMarkRead={async (id) => {
              setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
              try {
                await fetch("/.netlify/functions/notifications", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "X-User-Id": user?.id },
                  body: JSON.stringify({ action: "markRead", notificationId: id }),
                });
              } catch {}
            }}
            onMarkAllRead={async () => {
              setNotifications(prev => prev.map(n => ({ ...n, read: true })));
              try {
                await fetch("/.netlify/functions/notifications", {
                  method: "POST",
                  headers: { "Content-Type": "application/json", "X-User-Id": user?.id },
                  body: JSON.stringify({ action: "markAllRead" }),
                });
              } catch {}
            }}
          />
          {/* User menu */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setShowMenu(!showMenu)}
                className="flex items-center gap-1.5 rounded-full hover:ring-2 hover:ring-indigo-300 dark:hover:ring-indigo-600 transition-all"
              >
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover flex-shrink-0 border-2 border-indigo-300 dark:border-indigo-600"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-900 flex items-center justify-center text-indigo-600 dark:text-indigo-300">
                    <i className="fa-solid fa-user text-sm" />
                  </div>
                )}
              </button>

              {/* Dropdown menu */}
              {showMenu && (
                <>
                  {/* Backdrop to close menu */}
                  <div
                    className="fixed inset-0 z-20"
                    onClick={() => setShowMenu(false)}
                  />
                  <div className="absolute right-0 top-12 w-56 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-30 py-2 overflow-hidden">
                    {/* User info */}
                    <div className="px-4 py-2 border-b border-gray-100 dark:border-gray-700">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {user.name || user.email}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 truncate">
                        {cards.length} cards
                        {subscription?.active && (
                          <span className="ml-1.5 inline-flex items-center gap-1 px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 rounded text-[10px] font-medium">
                            {subscription.plan === "pro" ? "PRO" : "STARTER"}
                            {subscription.source === "whitelist" && " \u2726"}
                          </span>
                        )}
                      </p>
                    </div>

                    {/* Study tools */}
                    <div className="px-3 pt-2 pb-1">
                      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Tools</p>
                    </div>

                    <button
                      onClick={() => { setShowMenu(false); setMode("library"); setShowPricing(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
                    >
                      <i className="fa-solid fa-book-open-reader w-4 text-center text-indigo-500" />
                      Deck Library
                      <span className="ml-auto text-[10px] text-gray-400">{decks.length}</span>
                    </button>

                    <button
                      onClick={() => { setShowMenu(false); setMode("flip"); setShowPricing(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
                    >
                      <i className="fa-solid fa-clone w-4 text-center text-indigo-500" />
                      Browse Cards
                    </button>

                    <button
                      onClick={() => { setShowMenu(false); setMode("manage"); setShowPricing(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
                    >
                      <i className="fa-solid fa-pen-to-square w-4 text-center text-blue-500" />
                      Manage Cards
                    </button>

                    <button
                      onClick={() => { setShowMenu(false); setMode("planner"); setShowPricing(false); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
                    >
                      <i className="fa-solid fa-calendar-check w-4 text-center text-orange-500" />
                      Study Plan
                    </button>

                    <button
                      onClick={() => { setShowMenu(false); setShowSettings(true); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
                    >
                      <i className="fa-solid fa-gear w-4 text-center text-gray-500" />
                      Settings
                    </button>

                    <button
                      onClick={() => { setShowMenu(false); setShowNotificationSettings(true); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
                    >
                      <i className="fa-solid fa-bell w-4 text-center text-amber-500" />
                      Notifications
                    </button>

                    <button
                      onClick={() => { setDark(!dark); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
                    >
                      <i className={`fa-solid ${dark ? "fa-sun" : "fa-moon"} w-4 text-center text-sky-500`} />
                      {dark ? "Light Mode" : "Dark Mode"}
                    </button>

                    <div className="border-t border-gray-100 dark:border-gray-700 my-1" />

                    {/* Account */}
                    <div className="px-3 pt-2 pb-1">
                      <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Account</p>
                    </div>

                    <button
                      onClick={() => { setShowMenu(false); setShowPricing(true); }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
                    >
                      <i className="fa-solid fa-crown w-4 text-center text-yellow-500" />
                      {subscription?.active ? "My Plan" : "Upgrade to Pro"}
                      {subscription?.active && (
                        <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 rounded">
                          {subscription.plan === "pro" ? "PRO" : "STARTER"}
                        </span>
                      )}
                    </button>

                    {subscription?.active && subscription?.source !== "whitelist" && (
                      <button
                        onClick={async () => {
                          setShowMenu(false);
                          try {
                            const { url } = await manageSubscription(user.email);
                            window.location.href = url;
                          } catch (err) {
                            // No Stripe customer yet — show pricing to subscribe
                            setShowPricing(true);
                          }
                        }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
                      >
                        <i className="fa-solid fa-credit-card w-4 text-center text-purple-500" />
                        Manage Subscription
                      </button>
                    )}

                    <div className="border-t border-gray-100 dark:border-gray-700 my-1" />

                    <button
                      onClick={() => {
                        setShowMenu(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3"
                    >
                      <i className="fa-solid fa-right-from-bracket w-4 text-center" />
                      Sign out
                    </button>

                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowDeleteAccountModal(true);
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-red-400 dark:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3"
                    >
                      <i className="fa-solid fa-trash w-4 text-center" />
                      Delete account
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <button
              onClick={login}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
            >
              <i className="fa-brands fa-google text-sm" />
              <span className="hidden sm:inline">Sign in</span>
            </button>
          )}
        </div>
      </div>

      {/* Search bar */}
      {showSearch && (
        <div className="max-w-4xl mx-auto px-4 pb-3">
          <div className="relative">
            <i className="fa-solid fa-magnifying-glass absolute left-3 top-2.5 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search cards..."
              autoFocus
              className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg pl-10 pr-10 py-2 text-sm text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                <i className="fa-solid fa-xmark" />
              </button>
            )}
          </div>
          {searchQuery && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {filteredCards.length} cards match "{searchQuery}"
            </p>
          )}
        </div>
      )}
    </header>
  );
}
