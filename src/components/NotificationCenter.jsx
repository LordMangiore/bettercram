import { useState, useRef, useEffect } from "react";

const TYPE_ICONS = {
  suggestion_received: { icon: "fa-lightbulb", color: "text-amber-500", bg: "bg-amber-100 dark:bg-amber-900/30" },
  deck_updated: { icon: "fa-arrows-rotate", color: "text-blue-500", bg: "bg-blue-100 dark:bg-blue-900/30" },
  streak_milestone: { icon: "fa-fire", color: "text-orange-500", bg: "bg-orange-100 dark:bg-orange-900/30" },
  study_reminder: { icon: "fa-clock", color: "text-indigo-500", bg: "bg-indigo-100 dark:bg-indigo-900/30" },
  new_feature: { icon: "fa-sparkles", color: "text-purple-500", bg: "bg-purple-100 dark:bg-purple-900/30" },
  general: { icon: "fa-bell", color: "text-gray-500", bg: "bg-gray-100 dark:bg-gray-800" },
};

function timeAgo(dateStr) {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return `${Math.floor(days / 7)}w ago`;
}

export default function NotificationCenter({ notifications = [], unreadCount = 0, onMarkRead, onMarkAllRead }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on click outside
  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {/* Bell button */}
      <button
        onClick={() => setOpen(!open)}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      >
        <i className="fa-solid fa-bell text-base" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-11 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-2xl z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
            <h3 className="text-sm font-bold text-gray-900 dark:text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={() => { onMarkAllRead?.(); }}
                className="text-xs text-indigo-500 hover:text-indigo-600 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center">
                <i className="fa-solid fa-bell-slash text-2xl text-gray-300 dark:text-gray-600 mb-2" />
                <p className="text-sm text-gray-400 dark:text-gray-500">No notifications yet</p>
              </div>
            ) : (
              notifications.map(n => {
                const typeStyle = TYPE_ICONS[n.type] || TYPE_ICONS.general;
                return (
                  <div
                    key={n.id}
                    onClick={() => { if (!n.read) onMarkRead?.(n.id); }}
                    className={`px-4 py-3 flex gap-3 border-b border-gray-50 dark:border-gray-700/50 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${!n.read ? "bg-indigo-50/50 dark:bg-indigo-900/10" : ""}`}
                  >
                    <div className={`w-8 h-8 rounded-lg ${typeStyle.bg} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                      <i className={`fa-solid ${typeStyle.icon} ${typeStyle.color} text-xs`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`text-sm ${!n.read ? "font-semibold text-gray-900 dark:text-white" : "text-gray-700 dark:text-gray-300"}`}>
                        {n.title}
                      </p>
                      {n.body && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">
                          {n.body}
                        </p>
                      )}
                      <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">
                        {timeAgo(n.createdAt)}
                      </p>
                    </div>
                    {!n.read && (
                      <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-2" />
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
