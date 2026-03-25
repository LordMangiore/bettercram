import { useState, useMemo, useEffect, useRef } from "react";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useDarkMode } from "./hooks/useDarkMode";
import { useAuth } from "./hooks/useAuth";
import { saveCards, loadCards, setAuthToken, setUserId, generateMore, generateCards, scrapeDocument, saveStudyPlan, loadStudyPlan, checkSubscription, manageSubscription, loadDecks, loadDeck, saveDeck, deleteDeck as apiDeleteDeck, seedSampleDecks, resetAccount, precacheFirstPodcast, subscribeToDeck } from "./api";
import PricingPage from "./components/PricingPage";
import DeckLibrary from "./components/DeckLibrary";
import InstallPrompt from "./components/InstallPrompt";
import NotificationSettings from "./components/NotificationSettings";
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
import PrivacyPolicy from "./components/PrivacyPolicy";
import TermsOfService from "./components/TermsOfService";
import ContactPage from "./components/ContactPage";

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

// Plausible analytics helper
function trackEvent(name, props) {
  if (window.plausible) {
    window.plausible(name, props ? { props } : undefined);
  }
}

export default function App() {
  const [cards, setCards] = useLocalStorage("mcat-cards", []);
  const [progress, setProgress] = useLocalStorage("mcat-progress", {});
  const [mode, setMode] = useState("flip");
  const [activeCategory, setActiveCategory] = useState("All");
  const [showSetup, setShowSetup] = useState(false);
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useDarkMode();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [studyPlan, setStudyPlan] = useLocalStorage("mcat-study-plan", null);
  const [subscription, setSubscription] = useLocalStorage("bc-subscription", null);
  const [showPricing, setShowPricing] = useState(false);
  const [decks, setDecks] = useState([]);
  const [activeDeckId, setActiveDeckId] = useLocalStorage("bc-active-deck", null);
  const [autoSeeding, setAutoSeeding] = useState(false);
  const [hasEverLoadedDecks, setHasEverLoadedDecks] = useState(false);
  const [generatingStatus, setGeneratingStatus] = useState("");
  const { user, accessToken, login, logout, handleCallback } = useAuth();

  // Handle Google OAuth callback
  useEffect(() => {
    handleCallback();
  }, [handleCallback]);

  // Set auth token and user ID for API calls when user changes
  useEffect(() => {
    setAuthToken(accessToken);
    if (user?.id) {
      setUserId(user.id);
      console.log("Auth set: userId =", user.id);
    }
  }, [accessToken, user?.id]);


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
    trackEvent("Mode Switch", { mode: modeId });
    if (PRO_MODES.includes(modeId) && !isPro) {
      trackEvent("Paywall Hit", { mode: modeId });
      setShowPricing(true);
      return;
    }
    // Stop any playing audio when switching modes
    window.dispatchEvent(new CustomEvent("bc-stop-audio"));
    setMode(modeId);
  }

  // Load decks from server (single source of truth for cards)
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    async function initDecks() {
      // Ensure userId is set before any API calls
      if (user?.id) setUserId(user.id);
      if (accessToken) setAuthToken(accessToken);

      try {
        // Load study plan
        try {
          const planData = await loadStudyPlan();
          if (planData.plan) setStudyPlan(planData.plan);
        } catch {}

        const { decks: d } = await loadDecks();

        if (d && d.length > 0) {
          setDecks(d);
          setHasEverLoadedDecks(true);
          // Use saved active deck if it exists in the loaded list, otherwise first deck
          const savedExists = activeDeckId && d.some(dk => dk.id === activeDeckId);
          const targetId = savedExists ? activeDeckId : d[0].id;
          setActiveDeckId(targetId);
          // Load the active deck's full cards
          try {
            const { deck: fullDeck } = await loadDeck(targetId);
            if (fullDeck?.cards?.length > 0) {
              setCards(ensureCardIds(fullDeck.cards));
              setProgress(fullDeck.progress || {});
            }
          } catch (e) {
            console.log("Failed to load active deck cards:", e);
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
            // No old cards — autoSeedEffect will handle seeding for new users
            console.log("No legacy cards found, auto-seed will handle new user setup");
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
    trackEvent("Deck Created", { hasDoc: !!docUrl, name });
    const deckId = "deck-" + Date.now();
    const deck = {
      name,
      docUrl: docUrl || null,
      cards: [],
      progress: {},
      cardCount: 0,
      createdAt: new Date().toISOString(),
    };

    // Save the empty deck first
    await saveDeck(deckId, deck);
    setDecks(prev => [...prev, { id: deckId, ...deck }]);
    setActiveDeckId(deckId);
    setCards([]);
    setProgress({});

    if (docUrl) {
      // Generate cards from the doc directly
      setGenerating(true);
      setGeneratingStatus("Scraping document with Firecrawl...");
      try {
        const result = await scrapeDocument(docUrl, (msg) => setGeneratingStatus(msg));
        if (!result.content || result.content.trim().length < 50) {
          throw new Error("Could not extract enough content. Make sure the doc is shared publicly.");
        }

        setGeneratingStatus(`Document scraped (${Math.round(result.content.length / 1000)}k chars). Generating flashcards...`);

        // Chunk and generate
        const chunkSize = 8000;
        const chunks = [];
        for (let i = 0; i < result.content.length; i += chunkSize) {
          chunks.push(result.content.slice(i, i + chunkSize));
        }

        let allCards = [];
        const PARALLEL = 5;
        const totalBatches = Math.ceil(chunks.length / PARALLEL);
        for (let i = 0; i < chunks.length; i += PARALLEL) {
          const batchNum = Math.floor(i / PARALLEL) + 1;
          setGeneratingStatus(`Generating cards... batch ${batchNum}/${totalBatches} — ${allCards.length} cards so far`);
          const batch = chunks.slice(i, i + PARALLEL);
          const results = await Promise.all(
            batch.map(chunk => generateCards(chunk, null))
          );
          for (const { cards: c } of results) {
            allCards = allCards.concat(c);
          }
        }

        const withIds = ensureCardIds(allCards);
        const updatedDeck = { ...deck, cards: withIds, cardCount: withIds.length, docUrl };
        await saveDeck(deckId, updatedDeck);
        setDecks(prev => prev.map(d => d.id === deckId ? { id: deckId, ...updatedDeck } : d));
        setCards(withIds);
        setGeneratingStatus(`Done! ${withIds.length} cards generated.`);
        setMode("flip");

        // Fire-and-forget: precache first card's podcast so Audio mode has something ready
        if (withIds.length > 0) {
          precacheFirstPodcast(withIds[0]);
        }
      } catch (e) {
        console.error("Failed to generate cards:", e);
        alert("Failed to generate cards: " + e.message + "\nYou can add cards manually.");
        setMode("manage");
      } finally {
        setGenerating(false);
        setTimeout(() => setGeneratingStatus(""), 3000);
      }
    } else {
      // No doc URL — go to manage mode to add cards manually
      setMode("manage");
    }
  }

  async function handleDeleteDeck(deckId) {
    await apiDeleteDeck(deckId);
    const remaining = decks.filter(d => d.id !== deckId);
    setDecks(remaining);
    if (activeDeckId === deckId) {
      if (remaining.length > 0) {
        handleSelectDeck(remaining[0].id);
      } else {
        setActiveDeckId(null);
        setCards([]);
        setProgress({});
      }
    }
  }

  async function handleSelectDeck(deckId, { switchMode = true } = {}) {
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
    setCards([]);
    setProgress({});

    // Load the selected deck's full cards from server
    try {
      const { deck: fullDeck } = await loadDeck(deckId);
      if (fullDeck?.cards?.length > 0) {
        setCards(ensureCardIds(fullDeck.cards));
        setProgress(fullDeck.progress || {});
      }
    } catch {
      console.log("Failed to load deck cards");
    }

    if (switchMode) setMode("flip");
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

  async function saveToDeck(updatedCards, updatedProgress) {
    if (!activeDeckId) return;
    const currentDeck = decks.find(d => d.id === activeDeckId);
    if (!currentDeck) return;
    try {
      await saveDeck(activeDeckId, {
        ...currentDeck,
        cards: updatedCards || cards,
        progress: updatedProgress || progress,
        cardCount: (updatedCards || cards).length,
        lastStudied: new Date().toISOString(),
      });
      setDecks(prev => prev.map(d =>
        d.id === activeDeckId ? { ...d, cards: updatedCards || cards, cardCount: (updatedCards || cards).length, lastStudied: new Date().toISOString() } : d
      ));
    } catch (e) {
      console.error("Failed to save to deck:", e);
    }
  }

  async function handleCardsGenerated(newCards) {
    const withIds = ensureCardIds(newCards);
    setCards(withIds);
    setShowSetup(false);
    await saveToDeck(withIds, progress);
    // Precache first podcast in background
    if (withIds.length > 0) precacheFirstPodcast(withIds[0]);
  }

  async function handleAddCard(newCard) {
    const updated = [...cards, newCard];
    setCards(updated);
    await saveToDeck(updated);
  }

  async function handleEditCard(cardId, updatedCard) {
    const updated = cards.map((c) => c.id === cardId ? updatedCard : c);
    setCards(updated);
    await saveToDeck(updated);
  }

  async function handleDeleteCard(cardId) {
    const updated = cards.filter((c) => c.id !== cardId);
    setCards(updated);
    await saveToDeck(updated);
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
      // Debounced save to deck
      clearTimeout(window._progressSaveTimer);
      window._progressSaveTimer = setTimeout(() => {
        saveToDeck(null, updated).catch(() => {});
      }, 2000);
      return updated;
    });
  }

  const [generating, setGenerating] = useState(false);

  async function handleGenerateMore() {
    const docUrl = activeDeck?.docUrl;
    if (!docUrl) {
      alert("No document URL linked to this deck. Edit the deck to add one, or add cards manually.");
      return;
    }
    setGenerating(true);
    setGeneratingStatus("Scraping document for new content...");
    try {
      // Ensure we have the active deck's cards loaded (not stale global state)
      let currentCards = cards;
      if (activeDeckId && currentCards.length === 0) {
        try {
          const { deck: fullDeck } = await loadDeck(activeDeckId);
          if (fullDeck?.cards?.length > 0) {
            currentCards = ensureCardIds(fullDeck.cards);
            setCards(currentCards);
          }
        } catch (e) {
          console.log("Failed to load deck cards for generateMore:", e);
        }
      }

      const result = await scrapeDocument(docUrl, (msg) => setGeneratingStatus(msg));
      const content = result.content;

      setGeneratingStatus(`Document scraped. Analyzing ${currentCards.length} existing cards and finding gaps...`);
      const { cards: newCards } = await generateMore(currentCards, content);
      if (newCards && newCards.length > 0) {
        const merged = [...currentCards, ...ensureCardIds(newCards)];
        setCards(merged);
        await saveToDeck(merged);
        setGeneratingStatus(`Added ${newCards.length} new cards! Total: ${merged.length}`);
      } else {
        setGeneratingStatus("No new cards found — your deck already covers the document well!");
      }
    } catch (e) {
      console.error("Generate more failed:", e);
      alert("Failed to generate more cards: " + e.message);
    } finally {
      setGenerating(false);
      setTimeout(() => setGeneratingStatus(""), 5000);
    }
  }

  // Auto-subscribe new users to onboarding deck (no seed needed)
  const ONBOARDING_DECK_ID = "117269723779356752591-deck-onboarding";
  const subscribingRef = useRef(false);
  useEffect(() => {
    if (decks.length === 0 && !loading && user?.id && !autoSeeding && !hasEverLoadedDecks && !subscribingRef.current) {
      subscribingRef.current = true;
      setAutoSeeding(true);
      (async () => {
        try {
          if (user?.id) setUserId(user.id);
          if (accessToken) setAuthToken(accessToken);
          // Subscribe to the public onboarding deck — no cloning, no seed function
          trackEvent("Signup", { method: "google" });
          await subscribeToDeck(ONBOARDING_DECK_ID);
          const { decks: refreshed } = await loadDecks();
          if (refreshed?.length > 0) {
            setDecks(refreshed);
            setHasEverLoadedDecks(true);
            const firstId = refreshed[0].id;
            setActiveDeckId(firstId);
            const { deck: fullDeck } = await loadDeck(firstId);
            if (fullDeck?.cards?.length > 0) {
              setCards(ensureCardIds(fullDeck.cards));
            }
          }
        } catch (e) {
          console.error("Auto-subscribe failed:", e);
          // Fallback — still mark as loaded so user can create their own deck
        } finally {
          setHasEverLoadedDecks(true);
          setAutoSeeding(false);
        }
      })();
    }
  }, [decks.length, loading, user?.id]);

  // Static pages (accessible regardless of auth)
  if (page === "privacy") {
    return <PrivacyPolicy dark={dark} onBack={() => setPage(null)} />;
  }
  if (page === "terms") {
    return <TermsOfService dark={dark} onBack={() => setPage(null)} />;
  }
  if (page === "contact") {
    return <ContactPage dark={dark} onBack={() => setPage(null)} />;
  }

  // Not logged in — show landing page
  if (!user) {
    return <LandingPage onLogin={login} dark={dark} setDark={setDark} setPage={setPage} />;
  }

  // Show loading screen while: initial load, auto-seeding, or about to auto-seed
  // The last condition (decks empty + never loaded) prevents a flash of the main UI
  // in the single render between initDecks finishing and autoSeedEffect starting.
  const awaitingSeed = decks.length === 0 && !hasEverLoadedDecks && user?.id;
  if (loading || autoSeeding || awaitingSeed) {
    const seedingMessage = autoSeeding || awaitingSeed;
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center space-y-4">
          <i className="fa-solid fa-bolt text-5xl text-indigo-600 dark:text-indigo-400 animate-pulse" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            {seedingMessage ? "Welcome to BetterCram!" : ""}
          </h2>
          <p className="text-gray-500 dark:text-gray-400">
            <i className="fa-solid fa-spinner fa-spin mr-2" />
            {seedingMessage ? "Setting up your study library..." : "Loading your flashcards..."}
          </p>
        </div>
      </div>
    );
  }

  // Note: removed dead-end "Welcome" screen that showed when decks.length === 0 && !loading.
  // That screen had no escape mechanism — if auto-seeding finished but state updates
  // didn't propagate (race condition), users were stuck until refresh.
  // Now we fall through to the DeckLibrary which handles the empty-decks case properly.

  // Show setup screen only when explicitly triggered (e.g. regenerate)
  if (showSetup) {
    return (
      <SetupScreen
        onCardsGenerated={handleCardsGenerated}
        onSkip={() => setShowSetup(false)}
        existingCards={cards.length > 0 ? cards : null}
        dark={dark}
        setDark={setDark}
        initialUrl={activeDeck?.docUrl || ""}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 transition-colors">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div
            onClick={() => { setMode("flip"); setShowPricing(false); window.scrollTo(0, 0); }}
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
            {/* Dark mode and notifications moved to user menu */}
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
                        onClick={() => { setShowMenu(false); setMode("planner"); setShowPricing(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 flex items-center gap-3"
                      >
                        <i className="fa-solid fa-calendar-check w-4 text-center text-orange-500" />
                        Study Plan
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
        <div className="relative">
          <div className="absolute left-0 top-0 bottom-0 w-6 bg-gradient-to-r from-indigo-50 dark:from-gray-900 to-transparent z-10 pointer-events-none sm:hidden" />
          <div className="absolute right-0 top-0 bottom-0 w-6 bg-gradient-to-l from-indigo-50 dark:from-gray-900 to-transparent z-10 pointer-events-none sm:hidden" />
          <div className="flex gap-1.5 sm:flex-wrap sm:justify-center overflow-x-auto hide-scrollbar px-1 pb-1" style={{ WebkitOverflowScrolling: "touch" }}>
            {MODES.map((m) => {
              const locked = PRO_MODES.includes(m.id) && !isPro;
              return (
                <button
                  key={m.id}
                  onClick={() => handleModeChange(m.id)}
                  className={`min-w-[44px] min-h-[44px] shrink-0 px-3 py-2 sm:px-4 sm:py-2 rounded-xl font-medium text-sm transition-colors whitespace-nowrap flex items-center justify-center gap-1.5 ${
                    mode === m.id
                      ? "bg-indigo-600 text-white shadow-md"
                      : locked
                      ? "bg-gray-100 dark:bg-gray-800/50 text-gray-400 dark:text-gray-500 border border-gray-200 dark:border-gray-700"
                      : "bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700"
                  }`}
                >
                  <i className={`${m.icon} text-lg sm:text-sm`} />
                  <span className="hidden sm:inline">{m.label}</span>
                  {locked && <i className="fa-solid fa-lock text-[10px] ml-0.5" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Category filter — only in study modes, not library/manage/planner */}
        {!["library", "manage", "planner"].includes(mode) && !showPricing && (
          <div className="relative">
            <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-indigo-50 dark:from-gray-900 to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-indigo-50 dark:from-gray-900 to-transparent z-10 pointer-events-none" />
            <div className="flex gap-2 overflow-x-auto pb-1 px-2" style={{ scrollbarWidth: "none", msOverflowStyle: "none", WebkitOverflowScrolling: "touch" }}>
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
          </div>
        )}

        {/* Active mode */}
        {mode === "library" && (
          <DeckLibrary
            decks={decks}
            activeDeckId={activeDeckId}
            user={user}
            onSelectDeck={handleSelectDeck}
            onCreateDeck={handleCreateDeck}
            onDeleteDeck={handleDeleteDeck}
            generating={generating}
            generatingStatus={generatingStatus}
            onGenerateFromDoc={async (deckId, docUrl) => {
              setGenerating(true);
              setGeneratingStatus("Scraping document with Firecrawl...");
              try {
                const result = await scrapeDocument(docUrl, (msg) => setGeneratingStatus(msg));
                if (!result.content || result.content.trim().length < 50) {
                  throw new Error("Could not extract enough content. Make sure the doc is shared publicly.");
                }
                setGeneratingStatus(`Document scraped (${Math.round(result.content.length / 1000)}k chars). Generating flashcards...`);
                const chunkSize = 8000;
                const chunks = [];
                for (let i = 0; i < result.content.length; i += chunkSize) {
                  chunks.push(result.content.slice(i, i + chunkSize));
                }
                let allCards = [];
                const PARALLEL = 5;
                const totalBatches = Math.ceil(chunks.length / PARALLEL);
                for (let i = 0; i < chunks.length; i += PARALLEL) {
                  const batchNum = Math.floor(i / PARALLEL) + 1;
                  setGeneratingStatus(`Generating cards... batch ${batchNum}/${totalBatches} — ${allCards.length} cards so far`);
                  const batch = chunks.slice(i, i + PARALLEL);
                  const results = await Promise.all(
                    batch.map(chunk => generateCards(chunk, null))
                  );
                  for (const { cards: c } of results) {
                    allCards = allCards.concat(c);
                  }
                }
                const withIds = ensureCardIds(allCards);
                setGeneratingStatus(`Done! ${withIds.length} cards generated.`);
                const deck = decks.find(d => d.id === deckId);
                const updatedDeck = { ...deck, cards: withIds, cardCount: withIds.length, docUrl };
                await saveDeck(deckId, updatedDeck);
                setDecks(prev => prev.map(d => d.id === deckId ? { id: deckId, ...updatedDeck } : d));
                setActiveDeckId(deckId);
                setCards(withIds);
                setProgress({});
                setMode("flip");
                if (withIds.length > 0) precacheFirstPodcast(withIds[0]);
              } catch (e) {
                alert("Failed to generate cards: " + e.message);
              } finally {
                setGenerating(false);
                setTimeout(() => setGeneratingStatus(""), 3000);
              }
            }}
            onRefreshDecks={async () => {
              try {
                const { decks: fresh } = await loadDecks();
                if (fresh) setDecks(fresh);
              } catch {}
            }}
            onRegenerate={async () => {
              const deck = decks.find(d => d.id === activeDeckId);
              const docUrl = deck?.docUrl;
              if (!docUrl) {
                alert("No document URL linked to this deck.");
                return;
              }
              setGenerating(true);
              setGeneratingStatus("Scraping document for regeneration...");
              try {
                const result = await scrapeDocument(docUrl, (msg) => setGeneratingStatus(msg));
                if (!result.content || result.content.trim().length < 50) {
                  throw new Error("Could not extract enough content. Make sure the doc is shared publicly.");
                }
                setGeneratingStatus(`Document scraped (${Math.round(result.content.length / 1000)}k chars). Regenerating flashcards...`);
                const chunkSize = 8000;
                const chunks = [];
                for (let i = 0; i < result.content.length; i += chunkSize) {
                  chunks.push(result.content.slice(i, i + chunkSize));
                }
                let allCards = [];
                const PARALLEL = 5;
                const totalBatches = Math.ceil(chunks.length / PARALLEL);
                for (let i = 0; i < chunks.length; i += PARALLEL) {
                  const batchNum = Math.floor(i / PARALLEL) + 1;
                  setGeneratingStatus(`Regenerating cards... batch ${batchNum}/${totalBatches} — ${allCards.length} cards so far`);
                  const batch = chunks.slice(i, i + PARALLEL);
                  const results = await Promise.all(
                    batch.map(chunk => generateCards(chunk, null))
                  );
                  for (const { cards: c } of results) {
                    allCards = allCards.concat(c);
                  }
                }
                const withIds = ensureCardIds(allCards);
                const updatedDeck = { ...deck, cards: withIds, cardCount: withIds.length, progress: {} };
                await saveDeck(activeDeckId, updatedDeck);
                setDecks(prev => prev.map(d => d.id === activeDeckId ? { id: activeDeckId, ...updatedDeck } : d));
                setCards(withIds);
                setProgress({});
                setGeneratingStatus(`Done! Regenerated ${withIds.length} cards.`);
                if (withIds.length > 0) precacheFirstPodcast(withIds[0]);
              } catch (e) {
                console.error("Regen failed:", e);
                alert("Failed to regenerate cards: " + e.message);
              } finally {
                setGenerating(false);
                setTimeout(() => setGeneratingStatus(""), 3000);
              }
            }}
            onAddMore={handleGenerateMore}
            onManageCards={() => setMode("manage")}
            onShowPlanner={() => setMode("planner")}
            studyPlan={studyPlan}
            onStudyGroup={async (testId) => {
              const plan = studyPlan;
              if (!plan?.tests) return;
              const test = plan.tests.find(t => t.id === testId);
              if (!test?.deckIds?.length) return;
              // Load cards from all decks in the group
              let allCards = [];
              for (const deckId of test.deckIds) {
                const existing = decks.find(d => d.id === deckId);
                if (existing?.cards?.length) {
                  allCards = allCards.concat(existing.cards);
                } else {
                  try {
                    const { deck: fullDeck } = await loadDeck(deckId);
                    if (fullDeck?.cards?.length) {
                      allCards = allCards.concat(fullDeck.cards);
                    }
                  } catch {
                    console.log("Failed to load deck", deckId);
                  }
                }
              }
              if (allCards.length === 0) return;
              const withIds = ensureCardIds(allCards);
              setCards(withIds);
              setActiveDeckId(test.deckIds[0]);
              setMode("flip");
            }}
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
        {mode === "tutor" && <TutorMode cards={filteredCards} deckName={activeDeck?.name} />}
        {mode === "deepdive" && <DeepDiveMode cards={filteredCards} deckName={activeDeck?.name} />}
        {mode === "audio" && <AudioMode cards={filteredCards} />}
        {mode === "voice" && <VoiceTutorMode cards={filteredCards} deckName={activeDeck?.name} />}
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
            onStartStudy={(deckId) => {
              if (deckId && deckId !== activeDeckId) {
                setActiveDeckId(deckId);
              }
              handleModeChange("study");
            }}
            decks={decks}
            activeDeckId={activeDeckId}
          />
        )}
        </>
        )}
      </div>

      {/* Install Prompt Banner */}
      <InstallPrompt />

      {/* Notification Settings Modal */}
      <NotificationSettings
        open={showNotificationSettings}
        onClose={() => setShowNotificationSettings(false)}
      />

      {/* Delete Account Modal */}
      {showDeleteAccountModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowDeleteAccountModal(false)}>
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
                onClick={() => setShowDeleteAccountModal(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  setShowDeleteAccountModal(false);
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
      )}
    </div>
  );
}
