import { useState, useEffect } from "react";
import { manageCollaborators, createInviteLink } from "../api";
import { lookupUser } from "../api";

export default function CollaboratorModal({ deckId, deckName, onClose }) {
  const [collaborators, setCollaborators] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResult, setSearchResult] = useState(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [inviteUrl, setInviteUrl] = useState(null);
  const [copied, setCopied] = useState(false);
  const [addingUser, setAddingUser] = useState(null);

  // Load existing collaborators
  useEffect(() => {
    manageCollaborators(deckId, "list")
      .then(data => setCollaborators(data.collaborators || []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [deckId]);

  async function handleSearch(e) {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setSearching(true);
    setSearchError("");
    setSearchResult(null);
    try {
      const result = await lookupUser(searchQuery.trim());
      if (result.userId) {
        // Check if already a collaborator
        const alreadyAdded = collaborators.some(c => c.userId === result.userId);
        setSearchResult({ ...result, alreadyAdded });
      } else {
        setSearchError("No user found");
      }
    } catch (err) {
      setSearchError(err.message?.includes("not found") ? "No user found with that username or email" : err.message);
    } finally {
      setSearching(false);
    }
  }

  async function handleAdd(targetUserId) {
    setAddingUser(targetUserId);
    try {
      const result = await manageCollaborators(deckId, "add", targetUserId);
      if (result.collaborator) {
        setCollaborators(prev => [...prev, { ...result.collaborator, role: "editor", addedAt: new Date().toISOString() }]);
        setSearchResult(null);
        setSearchQuery("");
      }
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setAddingUser(null);
    }
  }

  async function handleRemove(targetUserId) {
    try {
      await manageCollaborators(deckId, "remove", targetUserId);
      setCollaborators(prev => prev.filter(c => c.userId !== targetUserId));
    } catch (err) {
      alert("Failed to remove: " + err.message);
    }
  }

  async function handleCreateLink() {
    try {
      const { url } = await createInviteLink(deckId);
      setInviteUrl(url);
    } catch (err) {
      alert("Failed to create link: " + err.message);
    }
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const input = document.createElement("input");
      input.value = inviteUrl;
      document.body.appendChild(input);
      input.select();
      document.execCommand("copy");
      document.body.removeChild(input);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">Collaborators</h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{deckName}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700">
            <i className="fa-solid fa-xmark" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Search to add */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-2">Add by username or email</label>
            <form onSubmit={handleSearch} className="flex gap-2">
              <input
                type="text"
                value={searchQuery}
                onChange={e => { setSearchQuery(e.target.value); setSearchError(""); setSearchResult(null); }}
                placeholder="@username or email"
                className="flex-1 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
              <button
                type="submit"
                disabled={searching || !searchQuery.trim()}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {searching ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-magnifying-glass" />}
              </button>
            </form>

            {/* Search result */}
            {searchResult && (
              <div className="mt-2 flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{searchResult.name}</p>
                  {searchResult.username && <p className="text-xs text-gray-500 dark:text-gray-400">@{searchResult.username}</p>}
                </div>
                {searchResult.alreadyAdded ? (
                  <span className="text-xs text-gray-400">Already added</span>
                ) : (
                  <button
                    onClick={() => handleAdd(searchResult.userId)}
                    disabled={addingUser === searchResult.userId}
                    className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    {addingUser === searchResult.userId ? <i className="fa-solid fa-spinner fa-spin" /> : "Add"}
                  </button>
                )}
              </div>
            )}
            {searchError && <p className="text-xs text-red-500 mt-2">{searchError}</p>}
          </div>

          {/* Invite link */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-2">Or share an invite link</label>
            {inviteUrl ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={inviteUrl}
                  readOnly
                  className="flex-1 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-xs text-gray-600 dark:text-gray-300 truncate"
                />
                <button
                  onClick={handleCopy}
                  className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    copied ? "bg-emerald-600 text-white" : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500"
                  }`}
                >
                  {copied ? <><i className="fa-solid fa-check mr-1" />Copied</> : <><i className="fa-solid fa-copy mr-1" />Copy</>}
                </button>
              </div>
            ) : (
              <button
                onClick={handleCreateLink}
                className="w-full py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <i className="fa-solid fa-link" />
                Generate invite link
              </button>
            )}
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1">Link expires in 7 days, max 10 uses</p>
          </div>

          {/* Current collaborators */}
          <div>
            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 block mb-2">
              Current collaborators {collaborators.length > 0 && `(${collaborators.length})`}
            </label>
            {loading ? (
              <div className="text-center py-4">
                <i className="fa-solid fa-spinner fa-spin text-gray-400" />
              </div>
            ) : collaborators.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">No collaborators yet</p>
            ) : (
              <div className="space-y-2">
                {collaborators.map(collab => (
                  <div key={collab.userId} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{collab.name}</p>
                      {collab.username && <p className="text-xs text-gray-500 dark:text-gray-400">@{collab.username}</p>}
                    </div>
                    <button
                      onClick={() => handleRemove(collab.userId)}
                      className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 px-2 py-1"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
