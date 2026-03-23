import { useState, useMemo, useEffect } from "react";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useDarkMode } from "./hooks/useDarkMode";
import { useAuth } from "./hooks/useAuth";
import { saveCards, loadCards, setAuthToken, generateMore, scrapeDocument, saveStudyPlan, loadStudyPlan, checkSubscription, manageSubscription, loadDecks, saveDeck, deleteDeck as apiDeleteDeck, seedSampleDecks, resetAccount } from "./api";
import PricingPage from "./components/PricingPage";
import DeckLibrary from "./components/DeckLibrary";
import SetupScreen from "./components/SetupScreen";
import FlipMode from "./components/FlipMode";
import StudyMode from "./components/StudyMode";
import QuizMode from "./components/QuizMode";
import TutorMode from "./components/TutorMode";
import DeepDiveMode from "./components/DeepDiveMode";
import AudioMode from "./components/AudioMode";
import VoiceTutorMode from "./components/VoiceTutorMode";
import CardManager from "./components/CardManager";
import PlannerMode from "./components/PlannerMode";
import LandingPage from "./components/LandingPage";

function ensureCardIds(cards) {
  return cards.map((c, i) =>
    c.id ? c : { ...c, id: `gen-${i}-${(c.front || "").slice(0, 20).replace(/\W/g, "")}` }
  );
}

const CATEGORIES = [
  "All",
  // Sciences
  "Biology",
  "Biochemistry",
  "Chemistry",
  "Organic Chemistry",
  "Physics",
  "Anatomy",
  "Physiology",
  "Microbiology",
  "Genetics",
  "Pharmacology",
  // Social Sciences
  "Psychology/Sociology",
  "Psychology",
  "Sociology",
  // Humanities
  "History",
  "English",
  "Philosophy",
  // Math
  "Mathematics",
  "Statistics",
  // Health/Medical
  "Pathology",
  "Immunology",
  "Neuroscience",
  "Public Health",
  // Other
  "General",
  "Custom",
];

// Main nav tabs (study modes only)
const MODES = [
  { id: "flip", label: "Cards", icon: "fa-solid fa-clone" },
  { id: "study", label: "Study", icon: "fa-solid fa-book-open" },
  { id: "quiz", label: "Quiz", icon: "fa-solid fa-circle-question" },
  { id: "tutor", label: "Tutor", icon: "fa-solid fa-graduation-cap" },
  { id: "deepdive", label: "Research", icon: "fa-solid fa-microscope" },
  { id: "audio", label: "Audio", icon: "fa-solid fa-headphones" },
  { id: "voice", label: "Voice Tutor", icon: "fa-solid fa-headset" },
];

// These modes are accessed from the user menu
const MENU_MODES = ["library", "manage", "planner"];

export default function App() {
  const [cards, setCards] = useLocalStorage("mcat-cards", []);
  const [progress, setProgress] = useLocalStorage("mcat-progress", {});
  const [mode, setMode] = useState("flip");
  const [activeCategory, setActiveCategory] = useState("All");
  const [showSetup, setShowSetup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useDarkMode();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [studyPlan, setStudyPlan] = useLocalStorage("mcat-study-plan", null);
  const [subscription, setSubscription] = useLocalStorage("bc-subscription", null);
  const [showPricing, setShowPricing] = useState(false);
  const [decks, setDecks] = useState([]);
  const [activeDeckId, setActiveDeckId] = useLocalStorage("bc-active-deck", null);
  const { user, accessToken, login, logout, handleCallback } = useAuth();

  // Handle Google OAuth callback
  useEffect(() => {
    handleCallback();
  }, [handleCallback]);

  // Set auth token for API calls when user changes
  useEffect(() => {
    setAuthToken(accessToken);
  }, [accessToken]);

  // Check subscription status
  useEffect(() => {
    if (!user?.email) return;
    checkSubscription(user.email).then(sub => {
      setSubscription(sub);
    }).catch(err => {
      console.log("Subscription check failed:", err);
    });
  }, [user?.email]);

  // Pro-only modes
  const PRO_MODES = ["tutor", "deepdive", "audio", "voice"];
  const isPro = subscription?.active && subscription?.plan === "pro";

  function handleModeChange(modeId) {
    if (PRO_MODES.includes(modeId) && !isPro) {
      setShowPricing(true);
      return;
    }
    setMode(modeId);
  }

  // Load decks from server (single source of truth for cards)
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function initDecks() {
      try {
        // Load study plan
        try {
          const planData = await loadStudyPlan();
          if (planData.plan) setStudyPlan(planData.plan);
        } catch {}

        const { decks: d } = await loadDecks();

        if (d && d.length > 0) {
          setDecks(d);
          const targetId = activeDeckId || d[0].id;
          setActiveDeckId(targetId);
          // Load the active deck's cards
          const active = d.find(dk => dk.id === targetId);
          if (active?.cards?.length > 0) {
            setCards(ensureCardIds(active.cards));
            setProgress(active.progress || {});
          }
        } else {
          // No decks — try migrating old cards
          try {
            const data = await loadCards();
            if (data.cards && data.cards.length > 0) {
              const migrationDeck = {
                name: "MCAT Prep",
                cardCount: data.cards.length,
                cards: data.cards,
                progress: data.progress || {},
                createdAt: new Date().toISOString(),
              };
              const deckId = "deck-mcat";
              await saveDeck(deckId, migrationDeck);
              setDecks([{ id: deckId, ...migrationDeck }]);
              setActiveDeckId(deckId);
              setCards(ensureCardIds(data.cards));
              setProgress(data.progress || {});
            }
          } catch {
            // No old cards — seed sample decks for new users
            try {
              await seedSampleDecks();
              const { decks: seeded } = await loadDecks();
              if (seeded?.length > 0) {
                setDecks(seeded);
                setActiveDeckId(seeded[0].id);
                if (seeded[0].cards?.length > 0) {
                  setCards(ensureCardIds(seeded[0].cards));
                }
              }
            } catch {
              console.log("Sample deck seeding skipped");
            }
          }
        }
      } catch (err) {
        console.log("Failed to load decks:", err);
      } finally {
        setLoading(false);
      }
    }

    initDecks();
  }, [user]);

  // Deck management
  async function handleCreateDeck(name, docUrl) {
    const deckId = "deck-" + Date.now();
    const deck = {
      name,
      docUrl: docUrl || null,
      cards: [],
      progress: {},
      cardCount: 0,
      createdAt: new Date().toISOString(),
    };

    // If docUrl provided, generate cards from it
    if (docUrl) {
      const result = await scrapeDocument(docUrl);
      if (result.content) {
        // We'll save with empty cards for now, user can generate from setup
        deck.docUrl = docUrl;
      }
    }

    await saveDeck(deckId, deck);
    setDecks(prev => [...prev, { id: deckId, ...deck }]);
    setActiveDeckId(deckId);
    setCards([]);
    setProgress({});
    setMode("flip");

    // If no doc URL, go to manage mode to add cards manually
    if (!docUrl) {
      setMode("manage");
    } else {
      setShowSetup(true);
    }
  }

  async function handleDeleteDeck(deckId) {
    await apiDeleteDeck(deckId);
    setDecks(prev => prev.filter(d => d.id !== deckId));
    if (activeDeckId === deckId) {
      const remaining = decks.filter(d => d.id !== deckId);
      if (remaining.length > 0) {
        handleSelectDeck(remaining[0].id);
      } else {
        setActiveDeckId(null);
        setCards([]);
        setProgress({});
      }
    }
  }

  async function handleSelectDeck(deckId) {
    // Save current deck state first
    if (activeDeckId && cards.length > 0) {
      const currentDeck = decks.find(d => d.id === activeDeckId);
      if (currentDeck) {
        await saveDeck(activeDeckId, {
          ...currentDeck,
          cards,
          progress,
          cardCount: cards.length,
          lastStudied: new Date().toISOString(),
        });
      }
    }

    setActiveDeckId(deckId);

    // Load the selected deck's cards
    const store = decks.find(d => d.id === deckId);
    if (store?.cards && store.cards.length > 0) {
      setCards(ensureCardIds(store.cards));
      setProgress(store.progress || {});
    } else {
      // Try loading from server
      try {
        const { decks: freshDecks } = await loadDecks();
        const freshDeck = freshDecks.find(d => d.id === deckId);
        if (freshDeck?.cards && freshDeck.cards.length > 0) {
          setCards(ensureCardIds(freshDeck.cards));
          setProgress(freshDeck.progress || {});
          setDecks(freshDecks);
        } else {
          setCards([]);
          setProgress({});
        }
      } catch {
        setCards([]);
        setProgress({});
      }
    }

    setMode("flip");
    setActiveCategory("All");
    setSearchQuery("");
  }

  // Auto-save active deck when cards/progress change
  useEffect(() => {
    if (!activeDeckId || !user || cards.length === 0) return;
    const timer = setTimeout(() => {
      const currentDeck = decks.find(d => d.id === activeDeckId);
      if (currentDeck) {
        saveDeck(activeDeckId, {
          ...currentDeck,
          cards,
          progress,
          cardCount: cards.length,
          lastStudied: new Date().toISOString(),
        });
        // Update local decks state
        setDecks(prev => prev.map(d =>
          d.id === activeDeckId ? { ...d, cardCount: cards.length, lastStudied: new Date().toISOString() } : d
        ));
      }
    }, 3000);
    return () => clearTimeout(timer);
  }, [cards, progress, activeDeckId]);

  const activeDeck = decks.find(d => d.id === activeDeckId);

  const filteredCards = useMemo(() => {
    let result = cards;
    if (activeCategory !== "All") {
      result = result.filter((c) => c.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.front.toLowerCase().includes(q) ||
          c.back.toLowerCase().includes(q)
      );
    }
    return result;
  }, [cards, activeCategory, searchQuery]);

  const categoryCounts = useMemo(() => {
    const counts = { All: cards.length };
    cards.forEach((c) => {
      counts[c.category] = (counts[c.category] || 0) + 1;
    });
    return counts;
  }, [cards]);

  async function handleCardsGenerated(newCards) {
    const withIds = ensureCardIds(newCards);
    setCards(withIds);
    setShowSetup(false);
    try {
      await saveCards(withIds, null);
    } catch (e) {
      console.error("Failed to save cards to server:", e);
    }
  }

  async function handleAddCard(newCard) {
    const updated = [...cards, newCard];
    setCards(updated);
    try { await saveCards(updated, null); } catch (e) { console.error(e); }
  }

  async function handleEditCard(cardId, updatedCard) {
    const updated = cards.map((c) => c.id === cardId ? updatedCard : c);
    setCards(updated);
    try { await saveCards(updated, null); } catch (e) { console.error(e); }
  }

  async function handleDeleteCard(cardId) {
    const updated = cards.filter((c) => c.id !== cardId);
    setCards(updated);
    try { await saveCards(updated, null); } catch (e) { console.error(e); }
  }

  function handleUpdateStudyPlan(plan) {
    setStudyPlan(plan);
    clearTimeout(window._planSaveTimer);
    window._planSaveTimer = setTimeout(() => {
      saveStudyPlan(plan).catch(() => {});
    }, 1000);
  }

  function handleUpdateProgress(key, value) {
    setProgress((prev) => {
      const updated = { ...prev, [key]: value };
      // Debounced save to server
      clearTimeout(window._progressSaveTimer);
      window._progressSaveTimer = setTimeout(() => {
        saveCards(null, updated).catch(() => {});
      }, 2000);
      return updated;
    });
  }

  const [generating, setGenerating] = useState(false);

  async function handleGenerateMore() {
    setGenerating(true);
    try {
      const docUrl = "https://docs.google.com/document/d/1p7X3_n9K8sra6fYNUQgYeXcLJi3h9Uh3gGfGgV2N-K8/edit";
      const docId = "1p7X3_n9K8sra6fYNUQgYeXcLJi3h9Uh3gGfGgV2N-K8";

      let content = "";
      const result = await scrapeDocument(docUrl);
      content = result.content;

      const { cards: newCards } = await generateMore(cards, content);
      if (newCards && newCards.length > 0) {
        const merged = [...cards, ...newCards];
        setCards(merged);
        await saveCards(merged, null);
      }
    } catch (e) {
      console.error("Generate more failed:", e);
    } finally {
      setGenerating(false);
    }
  }

  // Not logged in — show landing page
  if (!user) {
    return <LandingPage onLogin={login} dark={dark} setDark={setDark} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <i className="fa-solid fa-spinner fa-spin text-3xl text-indigo-600 dark:text-indigo-400 mb-4 block" />
          <p className="text-gray-500 dark:text-gray-400">Loading your flashcards...</p>
        </div>
      </div>
    );
  }

  if (cards.length === 0 || showSetup) {
    return (
      <SetupScreen
        onCardsGenerated={handleCardsGenerated}
        onSkip={cards.length === 0 ? async () => {
          setLoading(true);
          try {
            // Load default cards without auth token
            const prevToken = accessToken;
            setAuthToken(null);
            const data = await loadCards();
            setAuthToken(prevToken);
            if (data.cards && data.cards.length > 0) {
              setCards(data.cards);
              setShowSetup(false);
            }
          } catch (e) {
            console.error("Failed to load default cards:", e);
          } finally {
            setLoading(false);
          }
        } : null}
        existingCards={cards.length > 0 ? cards : null}
        dark={dark}
        setDark={setDark}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 transition-colors">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1
            onClick={() => { setMode("flip"); setShowPricing(false); window.scrollTo(0, 0); }}
            className="text-xl font-bold text-gray-900 dark:text-white cursor-pointer hover:opacity-80 transition-opacity"
          >
            <i className="fa-solid fa-bolt text-indigo-600 dark:text-indigo-400 mr-2" />
            BetterCram
            {activeDeck && mode !== "library" && (
              <span className="ml-2 text-sm font-normal text-gray-400 dark:text-gray-500">
                / {activeDeck.name}
              </span>
            )}
          </h1>
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
            {/* Dark mode toggle */}
            <button
              onClick={() => setDark(!dark)}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-700 transition-colors"
            >
              <i className={`fa-solid ${dark ? "fa-sun" : "fa-moon"}`} />
            </button>
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
                      className="w-9 h-9 rounded-full border-2 border-indigo-300 dark:border-indigo-600"
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
                              {subscription.source === "whitelist" && " ✦"}
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
                        onClick={() => { setShowMenu(false); setMode("manage"); setShowPricing(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
                      >
                        <i className="fa-solid fa-pen-to-square w-4 text-center text-emerald-500" />
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
                        onClick={() => {
                          setShowMenu(false);
                          handleGenerateMore();
                        }}
                        disabled={generating}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3 disabled:opacity-50"
                      >
                        <i className={`fa-solid ${generating ? "fa-spinner fa-spin" : "fa-plus"} w-4 text-center text-green-500`} />
                        {generating ? "Adding cards..." : "Add More Cards"}
                      </button>

                      <button
                        onClick={() => { setShowMenu(false); setShowSetup(true); }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
                      >
                        <i className="fa-solid fa-arrows-rotate w-4 text-center text-blue-500" />
                        Regenerate Cards
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
                              alert("Failed to open billing portal");
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
                        onClick={async () => {
                          if (!confirm("Are you sure? This will permanently delete ALL your data — decks, cards, progress, and study plans. This cannot be undone.")) return;
                          if (!confirm("Really delete everything? Type your mind is made up?")) return;
                          setShowMenu(false);
                          try {
                            await resetAccount();
                            localStorage.clear();
                            logout();
                          } catch (err) {
                            alert("Failed to delete account: " + err.message);
                          }
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

      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        {/* Mode tabs */}
        {showPricing ? (
          <PricingPage
            email={user?.email}
            dark={dark}
            onBack={() => setShowPricing(false)}
            onSubscribed={(sub) => {
              setSubscription(sub);
              setShowPricing(false);
            }}
          />
        ) : (
        <>
        <div className="flex flex-wrap gap-1.5 justify-center">
          {MODES.map((m) => {
            const locked = PRO_MODES.includes(m.id) && !isPro;
            return (
              <button
                key={m.id}
                onClick={() => handleModeChange(m.id)}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl font-medium text-xs sm:text-sm transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                  mode === m.id
                    ? "bg-indigo-600 text-white shadow-md"
                    : locked
                    ? "bg-gray-100 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700"
                    : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
                }`}
              >
                <i className={m.icon} />
                <span className="hidden sm:inline">{m.label}</span>
                {locked && <i className="fa-solid fa-lock text-[10px] ml-0.5" />}
              </button>
            );
          })}
        </div>

        {/* Category filter */}
        {(
          <div className="flex gap-2 overflow-x-auto pb-2">
            {CATEGORIES.filter(
              (c) => c === "All" || (categoryCounts[c] && categoryCounts[c] > 0)
            ).map((c) => (
              <button
                key={c}
                onClick={() => setActiveCategory(c)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  activeCategory === c
                    ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700"
                    : "bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-gray-300"
                }`}
              >
                {c} {categoryCounts[c] ? `(${categoryCounts[c]})` : ""}
              </button>
            ))}
          </div>
        )}

        {/* Active mode */}
        {mode === "library" && (
          <DeckLibrary
            decks={decks}
            activeDeckId={activeDeckId}
            onSelectDeck={handleSelectDeck}
            onCreateDeck={handleCreateDeck}
            onDeleteDeck={handleDeleteDeck}
          />
        )}
        {mode === "flip" && <FlipMode cards={filteredCards} />}
        {mode === "study" && (
          <StudyMode
            cards={filteredCards}
            progress={progress}
            onUpdateProgress={handleUpdateProgress}
          />
        )}
        {mode === "quiz" && <QuizMode cards={filteredCards} />}
        {mode === "tutor" && <TutorMode cards={filteredCards} />}
        {mode === "deepdive" && <DeepDiveMode cards={filteredCards} />}
        {mode === "audio" && <AudioMode cards={filteredCards} />}
        {mode === "voice" && <VoiceTutorMode cards={filteredCards} />}
        {mode === "manage" && (
          <CardManager
            cards={filteredCards}
            allCards={cards}
            categories={CATEGORIES.filter((c) => c !== "All")}
            onAddCard={handleAddCard}
            onEditCard={handleEditCard}
            onDeleteCard={handleDeleteCard}
          />
        )}
        {mode === "planner" && (
          <PlannerMode
            cards={cards}
            progress={progress}
            studyPlan={studyPlan}
            onUpdatePlan={handleUpdateStudyPlan}
          />
        )}
        </>
        )}
      </div>
    </div>
  );
}
