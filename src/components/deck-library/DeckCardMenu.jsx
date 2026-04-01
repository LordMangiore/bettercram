import { useState, useEffect, useRef } from "react";

export default function DeckCardMenu({
  deck, deckGroups,
  onRename, onManageCards, onExport, onShare, onAssignGroup,
  onRegenerate, onAddMore, onGenerateFromDoc,
  onSuggestCard, onReviewSuggestions, suggestionCount,
  onDelete, onOpenChange, onCollaborators, onLeaveDeck,
}) {
  const [open, setOpen] = useState(false);

  function setOpenAndNotify(val) {
    setOpen(val);
    onOpenChange?.(val);
  }
  const [confirmRegen, setConfirmRegen] = useState(false);
  const [showGroupList, setShowGroupList] = useState(false);
  const menuRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenAndNotify(false);
        setConfirmRegen(false);
        setShowGroupList(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const hasDocUrl = !!deck.docUrl;
  const hasCards = deck.cardCount > 0;
  const isReference = deck.isReference;
  const isPublic = deck.isPublic;

  function menuItem(label, icon, onClick, color = "text-gray-700 dark:text-gray-300", extra = null) {
    return (
      <button
        key={label}
        onClick={(e) => { e.stopPropagation(); onClick(); }}
        className={`w-full text-left px-4 py-2.5 text-sm ${color} hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors`}
      >
        <i className={`fa-solid ${icon} w-4 text-center text-xs opacity-60`} />
        {label}
        {extra}
      </button>
    );
  }

  function divider() {
    return <div className="border-t border-gray-100 dark:border-gray-700 my-1" />;
  }

  return (
    <div ref={menuRef} className="relative">
      {/* 3-dot trigger */}
      <button
        onClick={(e) => { e.stopPropagation(); setOpenAndNotify(!open); }}
        className="w-8 h-8 flex items-center justify-center rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-colors"
      >
        <i className="fa-solid fa-ellipsis-vertical text-sm" />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-10 w-52 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 z-40 py-1.5 overflow-hidden">
          {/* Rename */}
          {!isReference && menuItem("Rename", "fa-pen", () => { setOpenAndNotify(false); onRename(); })}

          {/* Manage Cards */}
          {hasCards && menuItem("Manage Cards", "fa-pen-to-square", () => { setOpenAndNotify(false); onManageCards(); })}

          {/* Share/Unshare */}
          {!isReference && hasCards && menuItem(
            isPublic ? "Unshare" : "Share",
            isPublic ? "fa-globe" : "fa-share-nodes",
            () => { setOpenAndNotify(false); onShare(); }
          )}

          {/* Assign to Group */}
          {deckGroups.length > 0 && (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); setShowGroupList(!showGroupList); }}
                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 transition-colors"
              >
                <i className="fa-solid fa-folder w-4 text-center text-xs opacity-60" />
                Group
                <i className={`fa-solid fa-chevron-${showGroupList ? "up" : "down"} ml-auto text-[10px] text-gray-400`} />
              </button>
              {showGroupList && (
                <div className="bg-gray-100 dark:bg-gray-900/50 py-1">
                  <button
                    onClick={(e) => { e.stopPropagation(); onAssignGroup(null); setOpenAndNotify(false); }}
                    className={`w-full text-left px-8 py-2 text-xs ${!deck.group ? "text-indigo-600 dark:text-indigo-400 font-medium" : "text-gray-500 dark:text-gray-400"} hover:bg-gray-200 dark:hover:bg-gray-700`}
                  >
                    No group
                  </button>
                  {deckGroups.map(g => (
                    <button
                      key={g.id}
                      onClick={(e) => { e.stopPropagation(); onAssignGroup(g.id); setOpenAndNotify(false); }}
                      className={`w-full text-left px-8 py-2 text-xs ${deck.group === g.id ? "text-indigo-600 dark:text-indigo-400 font-medium" : "text-gray-500 dark:text-gray-400"} hover:bg-gray-200 dark:hover:bg-gray-700`}
                    >
                      {g.name}
                    </button>
                  ))}
                </div>
              )}
            </>
          )}

          {/* Collaborators — for owned decks */}
          {!isReference && !deck.isCollab && onCollaborators && menuItem(
            "Collaborators",
            "fa-user-group",
            () => { setOpenAndNotify(false); onCollaborators(); },
            "text-indigo-600 dark:text-indigo-400",
            deck.collaborators && Object.keys(deck.collaborators).length > 0
              ? <span className="ml-auto text-[10px] font-bold bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-300 px-1.5 py-0.5 rounded-full">{Object.keys(deck.collaborators).length}</span>
              : null
          )}

          {/* Leave — for collab decks */}
          {deck.isCollab && onLeaveDeck && menuItem("Leave Deck", "fa-right-from-bracket", () => { setOpenAndNotify(false); onLeaveDeck(); }, "text-orange-600 dark:text-orange-400")}

          {/* Export */}
          {hasCards && menuItem("Export", "fa-download", () => { setOpenAndNotify(false); onExport(); })}

          {/* Suggestions - for subscribed decks */}
          {isReference && menuItem("Suggest Card", "fa-lightbulb", () => { setOpenAndNotify(false); onSuggestCard(); }, "text-amber-600 dark:text-amber-400")}

          {/* Review Suggestions - for published decks */}
          {isPublic && !isReference && menuItem(
            "Review Suggestions",
            "fa-inbox",
            () => { setOpenAndNotify(false); onReviewSuggestions(); },
            "text-amber-600 dark:text-amber-400",
            suggestionCount > 0 ? <span className="ml-auto text-[10px] font-bold bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 px-1.5 py-0.5 rounded-full">{suggestionCount}</span> : null
          )}

          {/* Add more cards — available for any deck with cards */}
          {hasCards && !isReference && (
            <>
              {divider()}
              {menuItem("Add More Cards", "fa-plus", () => { setOpenAndNotify(false); onAddMore(); }, "text-emerald-600 dark:text-emerald-400")}
            </>
          )}

          {/* Doc-linked actions — regenerate needs the original source */}
          {hasDocUrl && hasCards && !isReference && (
            <>
              {!confirmRegen
                ? menuItem("Regenerate Cards", "fa-rotate", () => setConfirmRegen(true), "text-orange-600 dark:text-orange-400")
                : (
                  <div className="px-4 py-2.5 space-y-2">
                    <p className="text-xs text-red-600 dark:text-red-400 font-medium">Replace all cards? Can't undo.</p>
                    <div className="flex gap-2">
                      <button onClick={(e) => { e.stopPropagation(); setOpenAndNotify(false); setConfirmRegen(false); onRegenerate(); }} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium">Yes</button>
                      <button onClick={(e) => { e.stopPropagation(); setConfirmRegen(false); }} className="px-3 py-1.5 text-xs text-gray-500">Cancel</button>
                    </div>
                  </div>
                )
              }
            </>
          )}

          {/* Generate from doc (empty deck with URL) */}
          {hasDocUrl && !hasCards && !isReference && (
            <>
              {divider()}
              {menuItem("Generate Cards", "fa-wand-magic-sparkles", () => { setOpenAndNotify(false); onGenerateFromDoc(); }, "text-indigo-600 dark:text-indigo-400")}
            </>
          )}

          {/* Delete */}
          {divider()}
          {menuItem("Delete", "fa-trash", () => { setOpenAndNotify(false); onDelete(); }, "text-red-500 dark:text-red-400")}
        </div>
      )}
    </div>
  );
}
