import { useEffect, useRef, useCallback } from "react";

// All valid modes that map to URL paths
const VALID_MODES = ["study", "flip", "quiz", "tutor", "deepdive", "audio", "voice", "library", "manage", "planner"];
// Static pages (no auth required)
const VALID_PAGES = ["privacy", "terms", "contact", "about"];

/**
 * Converts app state (mode, page, showPricing, showSettings) into a URL path.
 */
function stateToPath(state) {
  if (state.page) return `/${state.page}`;
  if (state.showPricing) return "/pricing";
  if (state.showSettings) return "/settings";
  if (state.mode && state.mode !== "study") return `/${state.mode}`;
  return "/";
}

/**
 * Parses the current URL path into app state.
 */
function pathToState(pathname) {
  const path = pathname.replace(/^\//, "").toLowerCase() || "";

  if (!path || path === "study") {
    return { mode: "study", page: null, showPricing: false, showSettings: false };
  }
  if (path === "pricing") {
    return { mode: null, page: null, showPricing: true, showSettings: false };
  }
  if (path === "settings") {
    return { mode: null, page: null, showPricing: false, showSettings: true };
  }
  if (VALID_PAGES.includes(path)) {
    return { mode: null, page: path, showPricing: false, showSettings: false };
  }
  if (VALID_MODES.includes(path)) {
    return { mode: path, page: null, showPricing: false, showSettings: false };
  }
  // Unknown path — default to study
  return { mode: "study", page: null, showPricing: false, showSettings: false };
}

/**
 * Syncs app navigation state with the browser History API.
 *
 * - Pushes history entries when mode/page/pricing/settings changes
 * - Restores state on popstate (back/forward button)
 * - Reads initial state from URL on mount
 *
 * @param {Object} state - Current app state
 * @param {Function} onNavigate - Callback to apply state changes: ({ mode, page, showPricing, showSettings }) => void
 */
export function useHistoryNav({ mode, page, showPricing, showSettings }, onNavigate) {
  const isPopstateRef = useRef(false);
  const lastPathRef = useRef(window.location.pathname);

  // On mount: read initial state from URL (supports deep linking)
  useEffect(() => {
    const initial = pathToState(window.location.pathname);
    // Only apply if URL suggests a different state than defaults
    if (window.location.pathname !== "/" && window.location.pathname !== "") {
      onNavigate(initial);
    }
    // Replace current history entry with proper state
    window.history.replaceState(initial, "", stateToPath(initial));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Push history when state changes (but not during popstate handling)
  useEffect(() => {
    if (isPopstateRef.current) {
      isPopstateRef.current = false;
      return;
    }

    const currentState = { mode, page, showPricing, showSettings };
    const newPath = stateToPath(currentState);

    // Don't push duplicate entries
    if (newPath === lastPathRef.current) return;

    lastPathRef.current = newPath;
    window.history.pushState(currentState, "", newPath);
  }, [mode, page, showPricing, showSettings]);

  // Listen for popstate (back/forward buttons)
  useEffect(() => {
    function handlePopstate(e) {
      isPopstateRef.current = true;

      // Use saved state if available, otherwise parse from URL
      const state = e.state || pathToState(window.location.pathname);
      lastPathRef.current = window.location.pathname;
      onNavigate(state);
    }

    window.addEventListener("popstate", handlePopstate);
    return () => window.removeEventListener("popstate", handlePopstate);
  }, [onNavigate]);
}
