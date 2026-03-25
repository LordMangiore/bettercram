import { useState, useEffect } from "react";

export default function InstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const [showIOSTooltip, setShowIOSTooltip] = useState(false);

  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isInStandaloneMode = window.matchMedia("(display-mode: standalone)").matches
    || window.navigator.standalone === true;

  useEffect(() => {
    // Don't show if already installed
    if (isInStandaloneMode) return;

    // Chrome/Android: listen for beforeinstallprompt
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      // Only show after 30s delay, and if not dismissed before
      if (!localStorage.getItem("bc-install-dismissed")) {
        setTimeout(() => setShowInstallBanner(true), 30000);
      }
    };
    window.addEventListener("beforeinstallprompt", handler);

    // iOS: show after 30s if on Safari and not dismissed
    if (isIOS && !localStorage.getItem("bc-install-dismissed")) {
      const timer = setTimeout(() => setShowInstallBanner(true), 30000);
      return () => {
        clearTimeout(timer);
        window.removeEventListener("beforeinstallprompt", handler);
      };
    }

    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  async function handleInstall() {
    if (installPrompt) {
      installPrompt.prompt();
      const result = await installPrompt.userChoice;
      if (result.outcome === "accepted") {
        setShowInstallBanner(false);
      }
      setInstallPrompt(null);
    } else if (isIOS) {
      setShowIOSTooltip(true);
      setTimeout(() => setShowIOSTooltip(false), 6000);
    }
  }

  function handleDismiss() {
    setShowInstallBanner(false);
    localStorage.setItem("bc-install-dismissed", "1");
  }

  if (!showInstallBanner || isInStandaloneMode) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pointer-events-none">
      <div className="max-w-lg mx-auto pointer-events-auto">
        {/* iOS tooltip */}
        {showIOSTooltip && (
          <div className="mb-2 bg-gray-900 dark:bg-gray-700 text-white text-sm rounded-xl p-3 shadow-lg animate-fade-in">
            <p>
              Tap the <i className="fa-solid fa-arrow-up-from-bracket mx-1" /> share button, then select{" "}
              <strong>"Add to Home Screen"</strong>
            </p>
          </div>
        )}

        {/* Install banner */}
        <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
          <div className="flex-shrink-0 w-10 h-10 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl flex items-center justify-center">
            <span className="text-xl">📱</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 dark:text-white">
              Install BetterCram
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Get the best experience with our app
            </p>
          </div>
          <button
            onClick={handleInstall}
            className="flex-shrink-0 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Install
          </button>
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            aria-label="Dismiss"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      </div>
    </div>
  );
}
