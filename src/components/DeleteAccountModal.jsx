import { resetAccount } from "../api";

export default function DeleteAccountModal({ onClose, logout }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 w-full max-w-md p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-4">
          <div className="w-14 h-14 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-3">
            <i className="fa-solid fa-triangle-exclamation text-2xl text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">Delete your account?</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
            This will permanently delete <strong>all your data</strong> — decks, cards, progress, and study plans. This action cannot be undone.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              onClose();
              try {
                await resetAccount();
                localStorage.clear();
                logout();
              } catch (err) {
                alert("Failed to delete account: " + err.message);
              }
            }}
            className="flex-1 px-4 py-2.5 text-sm font-bold text-white bg-red-600 rounded-xl hover:bg-red-700 transition-all"
          >
            Yes, delete everything
          </button>
        </div>
      </div>
    </div>
  );
}
