import { useState, useMemo, useEffect, useRef, useCallback, lazy, Suspense } from "react";
import { useLocalStorage } from "./hooks/useLocalStorage";
import { useDarkMode } from "./hooks/useDarkMode";
import { useAuth } from "./hooks/useAuth";
import { useHistoryNav } from "./hooks/useHistoryNav";
import { saveCards, loadCards, setAuthToken, setUserId, generateMore, generateCards, scoreCards, regenCard, scrapeDocument, searchAndScrape, crawlStart, crawlPoll, extractCards, analyzeStructure, saveStudyPlan, loadStudyPlan, checkSubscription, loadDecks, loadDeck, saveDeck, saveDeckV2, deleteDeck as apiDeleteDeck, seedSampleDecks, precacheFirstPodcast, subscribeToDeck, saveDeckProgress, loadAllDeckCards, saveProfile, loadProfile, saveDeckGroups, assignDeckGroup } from "./api";
import { getProfile as fsGetProfile, getDecks as fsGetDecks, getDeckProgress as fsGetProgress, getStudyPlan as fsGetStudyPlan, onDecksChanged, getDeckGroups as fsGetDeckGroups, onDeckGroupsChanged, onNotificationsChanged } from "./lib/firestoreClient";
import AppHeader from "./components/AppHeader";
import MobileNav from "./components/MobileNav";
import DeleteAccountModal from "./components/DeleteAccountModal";
import ErrorBoundary from "./components/ErrorBoundary";
import SubNav from "./components/SubNav";

// Core study mode — loaded eagerly (most common view)
import StudyMode from "./components/StudyMode";

// Lazy-loaded components — split into separate chunks
const PricingPage = lazy(() => import("./components/PricingPage"));
const DeckLibrary = lazy(() => import("./components/DeckLibrary"));
const InstallPrompt = lazy(() => import("./components/InstallPrompt"));
const NotificationSettings = lazy(() => import("./components/NotificationSettings"));
const SetupScreen = lazy(() => import("./components/SetupScreen"));
const FlipMode = lazy(() => import("./components/FlipMode"));
const QuizMode = lazy(() => import("./components/QuizMode"));
const TutorMode = lazy(() => import("./components/TutorMode"));
const DeepDiveMode = lazy(() => import("./components/DeepDiveMode"));
const AudioMode = lazy(() => import("./components/AudioMode"));
const VoiceTutorMode = lazy(() => import("./components/VoiceTutorMode"));
const AboutPage = lazy(() => import("./components/AboutPage"));
const CardManager = lazy(() => import("./components/CardManager"));
const PlannerMode = lazy(() => import("./components/PlannerMode"));
const LandingPage = lazy(() => import("./components/LandingPage"));
const LandingPageV2 = lazy(() => import("./components/LandingPageV2"));
const PrivacyPolicy = lazy(() => import("./components/PrivacyPolicy"));
const TermsOfService = lazy(() => import("./components/TermsOfService"));
const ContactPage = lazy(() => import("./components/ContactPage"));
const Onboarding = lazy(() => import("./components/Onboarding"));
const Settings = lazy(() => import("./components/Settings"));

function LazyFallback() {
  return (
    <div className="flex items-center justify-center py-12">
      <i className="fa-solid fa-spinner fa-spin text-indigo-500 text-xl" />
    </div>
  );
}

import { ensureCardIds } from "./lib/cardUtils";

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

// 4-tab navigation system
const TABS = [
  { id: "study", label: "Study", icon: "fa-solid fa-book-open", subModes: [
    { id: "study", label: "Review" },
  ]},
  { id: "test", label: "Test", icon: "fa-solid fa-brain", subModes: [
    { id: "quiz", label: "Quiz" },
    { id: "tutor", label: "Tutor", pro: true },
    { id: "deepdive", label: "Research", pro: true },
  ]},
  { id: "sage", label: "Sage", icon: "fa-solid fa-podcast", subModes: [
    { id: "audio", label: "Audio", pro: true },
  ]},
  { id: "nova", label: "Nova", icon: "fa-solid fa-headset", subModes: [
    { id: "voice", label: "Voice", pro: true },
  ]},
];

// Map sub-mode IDs to their parent tab
const SUB_MODE_TO_TAB = {};
TABS.forEach(tab => tab.subModes.forEach(sm => { SUB_MODE_TO_TAB[sm.id] = tab.id; }));

// Legacy compatibility — modes accessible from menu only
const MENU_MODES = ["library", "flip", "manage"];

// Plausible analytics helper
function trackEvent(name, props) {
  if (window.plausible) {
    window.plausible(name, props ? { props } : undefined);
  }
}

export default function App() {
  const [cards, setCards] = useState([]);
  const [progress, setProgress] = useState({});
  const [mode, setMode] = useState("study");
  const [activeTab, setActiveTab] = useState("cards");
  const [activeCategory, setActiveCategory] = useState("All");
  const [showSetup, setShowSetup] = useState(false);
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dark, setDark] = useDarkMode();
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [studySessionStats, setStudySessionStats] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [showNotificationSettings, setShowNotificationSettings] = useState(false);
  const [studyPlan, setStudyPlan] = useLocalStorage("mcat-study-plan", null);
  const [subscription, setSubscription] = useLocalStorage("bc-subscription", null);
  const [showPricing, setShowPricing] = useState(false);
  const [decks, setDecks] = useState([]);
  const [deckGroups, setDeckGroups] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);
  const [activeDeckId, setActiveDeckId] = useLocalStorage("bc-active-deck", null);
  const [autoSeeding, setAutoSeeding] = useState(false);
  const [hasEverLoadedDecks, setHasEverLoadedDecks] = useState(false);
  const [generatingStatus, setGeneratingStatus] = useState("");
  const [userProfile, setUserProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const { user, accessToken, authReady, login, loginWithEmail, emailSent, logout, otpStep, otpEmail, otpError, sendOTP, verifyOTP, setOtpStep } = useAuth();

  // Sync browser history with app navigation (back/forward buttons)
  const handleHistoryNav = useCallback((state) => {
    if (state.page) {
      setPage(state.page);
      setShowPricing(false);
      setShowSettings(false);
    } else if (state.showPricing) {
      setPage(null);
      setShowPricing(true);
      setShowSettings(false);
    } else if (state.showSettings) {
      setPage(null);
      setShowPricing(false);
      setShowSettings(true);
    } else {
      setPage(null);
      setShowPricing(false);
      setShowSettings(false);
      if (state.mode) {
        window.dispatchEvent(new CustomEvent("bc-stop-audio"));
        setMode(state.mode);
        const parentTab = SUB_MODE_TO_TAB[state.mode];
        if (parentTab) setActiveTab(parentTab);
      }
    }
  }, []);

  useHistoryNav(
    { mode, page, showPricing, showSettings },
    handleHistoryNav
  );

  // Set auth token and user ID for API calls when user changes
  useEffect(() => {
    setAuthToken(accessToken);
    if (user?.id) {
      setUserId(user.id);
      console.log("Auth set: userId =", user.id);
    }
  }, [accessToken, user?.id]);

  // Initialize native push notification listeners (Capacitor)
  useEffect(() => {
    import("./lib/pushNotifications").then(({ initPushListeners }) => {
      initPushListeners();
    }).catch(() => {});
  }, []);


  // Load user profile — direct Firestore read (instant), API fallback
  useEffect(() => {
    if (!user?.id) {
      setProfileLoaded(false);
      setUserProfile(null);
      setShowOnboarding(false);
      return;
    }
    (async () => {
      try {
        // Try direct Firestore first (instant, cached offline)
        let profile = await fsGetProfile(user.id);
        // Fallback to API if Firestore returns nothing (data may not be migrated yet)
        if (!profile) {
          const res = await loadProfile();
          profile = res.profile;
        }
        setUserProfile(profile);
        if (!profile || !profile.onboardingComplete) {
          setShowOnboarding(true);
        }
      } catch {
        setShowOnboarding(true);
      } finally {
        setProfileLoaded(true);
      }
    })();
  }, [user?.id]);

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
    // Sync active tab
    const parentTab = SUB_MODE_TO_TAB[modeId];
    if (parentTab) setActiveTab(parentTab);
  }

  function handleTabChange(tabId) {
    const tab = TABS.find(t => t.id === tabId);
    if (!tab) return;
    setActiveTab(tabId);
    // Switch to the first non-pro sub-mode, or first sub-mode if user is pro
    const firstAvailable = tab.subModes.find(sm => !sm.pro || isPro) || tab.subModes[0];
    handleModeChange(firstAvailable.id);
  }

  function handleSubModeChange(subModeId) {
    handleModeChange(subModeId);
  }

  // In-memory deck cache (avoids re-downloading 500KB on deck switch)
  const deckCacheRef = useRef(new Map());

  // Load decks — direct Firestore read with API fallback, real-time listener
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    let unsubDecks = null;
    let unsubGroups = null;
    let unsubNotifs = null;

    async function initDecks() {
      if (user?.id) setUserId(user.id);
      if (accessToken) setAuthToken(accessToken);

      try {
        // Load study plan — direct Firestore, API fallback
        try {
          const plan = await fsGetStudyPlan(user.id);
          if (plan) {
            setStudyPlan(plan.plan || plan);
          } else {
            const planData = await loadStudyPlan();
            if (planData.plan) setStudyPlan(planData.plan);
          }
        } catch {}

        // Load deck groups
        try {
          const groupsData = await fsGetDeckGroups(user.id);
          if (groupsData?.groups) setDeckGroups(groupsData.groups);
        } catch {}

        // Load deck list — direct Firestore first (instant)
        let d = await fsGetDecks(user.id);
        if (!d || d.length === 0) {
          // Fallback to API (triggers lazy migration from Blobs)
          const res = await loadDecks();
          d = res.decks;
        }

        if (d && d.length > 0) {
          setDecks(d);
          setHasEverLoadedDecks(true);
          localStorage.setItem("bc-has-had-decks", "true");
          const savedExists = activeDeckId && d.some(dk => dk.id === activeDeckId);
          const targetId = savedExists ? activeDeckId : d[0].id;
          setActiveDeckId(targetId);
          // Load cards + progress for active deck
          try {
            // Try direct Firestore for progress
            const fsProgress = await fsGetProgress(user.id, targetId);
            if (fsProgress) setProgress(fsProgress);
            // Cards still come from API (too large for Firestore docs)
            const { deck: fullDeck } = await loadDeck(targetId);
            if (fullDeck?.cards?.length > 0) {
              setCards(ensureCardIds(fullDeck.cards));
              deckCacheRef.current.set(targetId, { cards: fullDeck.cards, at: Date.now() });
              if (!fsProgress && fullDeck.progress) setProgress(fullDeck.progress);
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
            console.log("No legacy cards found, auto-seed will handle new user setup");
          }
        }

        // Start real-time listeners
        unsubDecks = onDecksChanged(user.id, (updatedDecks) => {
          if (updatedDecks.length > 0) {
            setDecks(updatedDecks);
            setHasEverLoadedDecks(true);
          }
        });
        unsubGroups = onDeckGroupsChanged(user.id, (data) => {
          if (data?.groups) setDeckGroups(data.groups);
        });
        unsubNotifs = onNotificationsChanged(user.id, (notifs) => {
          setNotifications(notifs.slice(0, 50));
        });
      } catch (err) {
        console.log("Failed to load decks:", err);
      } finally {
        setLoading(false);
      }
    }

    initDecks();

    return () => {
      if (unsubDecks) unsubDecks();
      if (unsubGroups) unsubGroups();
      if (unsubNotifs) unsubNotifs();
    };
  }, [user]);

  // Deck management
  // Shared helper: chunk content and batch-generate cards
  async function generateFromContent(content, setStatus, { density = "balanced" } = {}) {
    const densityChunkSize = { concise: 8000, balanced: 4000, comprehensive: 2500 };
    const chunkSize = densityChunkSize[density] || 4000;

    // Helper: generate with retry
    async function generateWithRetry(chunk, category, topics, retries = 2) {
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          return await generateCards(chunk, category || null, topics || undefined, density);
        } catch (e) {
          if (attempt === retries) {
            console.error("Chunk failed after retries:", e.message);
            return { cards: [] };
          }
          await new Promise(r => setTimeout(r, 1000));
        }
      }
      return { cards: [] };
    }

    // Helper: generate cards from a flat chunk array
    async function generateFromChunks(chunks, category, setStatus, startLabel = "") {
      let cards = [];
      let coveredTopics = "";
      const PARALLEL = 5;
      const totalBatches = Math.ceil(chunks.length / PARALLEL);

      for (let i = 0; i < chunks.length; i += PARALLEL) {
        const batchNum = Math.floor(i / PARALLEL) + 1;
        setStatus(`${startLabel}Generating cards... batch ${batchNum}/${totalBatches} — ${cards.length} cards so far`);
        const batch = chunks.slice(i, i + PARALLEL);
        const results = await Promise.allSettled(
          batch.map(chunk => generateWithRetry(chunk, category, coveredTopics))
        );
        for (const r of results) {
          if (r.status === "fulfilled" && r.value?.cards) {
            cards = cards.concat(r.value.cards);
          }
        }
        coveredTopics = cards.map(c => c.front.slice(0, 40)).join(", ");
        if (coveredTopics.length > 500) coveredTopics = coveredTopics.slice(0, 500);
      }
      return cards;
    }

    let allCards = [];

    // For large documents, detect chapter structure first
    if (content.length >= 10000) {
      setStatus("Analyzing document structure...");
      try {
        const { sections, type } = await analyzeStructure(content);

        if (type !== "flat" && sections.length > 1) {
          setStatus(`Found ${sections.length} sections — generating cards by chapter...`);
          console.log("Document structure:", sections.map(s => `${s.title} (${s.content.length} chars)`));

          for (let si = 0; si < sections.length; si++) {
            const section = sections[si];
            const sectionChunks = [];
            for (let i = 0; i < section.content.length; i += chunkSize) {
              sectionChunks.push(section.content.slice(i, i + chunkSize));
            }

            const sectionCards = await generateFromChunks(
              sectionChunks,
              section.title,
              setStatus,
              `[${si + 1}/${sections.length}] ${section.title}: `
            );

            // Ensure all cards from this section have the chapter category
            const taggedCards = sectionCards.map(c => ({ ...c, category: section.title }));
            allCards = allCards.concat(taggedCards);
            setStatus(`${section.title}: ${sectionCards.length} cards — ${allCards.length} total`);
          }
        } else {
          // Flat document — use original chunking
          const chunks = [];
          for (let i = 0; i < content.length; i += chunkSize) {
            chunks.push(content.slice(i, i + chunkSize));
          }
          allCards = await generateFromChunks(chunks, null, setStatus);
        }
      } catch (err) {
        console.error("Structure analysis failed, falling back to flat:", err);
        const chunks = [];
        for (let i = 0; i < content.length; i += chunkSize) {
          chunks.push(content.slice(i, i + chunkSize));
        }
        allCards = await generateFromChunks(chunks, null, setStatus);
      }
    } else {
      // Short content — just chunk and generate
      const chunks = [];
      for (let i = 0; i < content.length; i += chunkSize) {
        chunks.push(content.slice(i, i + chunkSize));
      }
      allCards = await generateFromChunks(chunks, null, setStatus);
    }
    // Quality scoring pass — deduplicate and improve
    if (allCards.length > 5) {
      const totalCards = allCards.length;
      const SCORE_BATCH = 50;
      const totalBatches = Math.ceil(totalCards / SCORE_BATCH);
      let scoredCards = [];
      let totalRemoved = 0;
      let totalImproved = 0;
      let failures = 0;
      for (let i = 0; i < allCards.length; i += SCORE_BATCH) {
        const batchNum = Math.floor(i / SCORE_BATCH) + 1;
        const processed = scoredCards.length + totalRemoved;
        setStatus(`Quality pass: batch ${batchNum}/${totalBatches} — ${processed}/${totalCards} processed, ${totalRemoved} removed, ${totalImproved} improved`);
        const batch = allCards.slice(i, i + SCORE_BATCH);
        try {
          const { cards: scored, removed, improved } = await scoreCards(batch);
          scoredCards = scoredCards.concat(scored);
          totalRemoved += removed || 0;
          totalImproved += improved || 0;
        } catch (e) {
          // On failure, keep the batch as-is rather than losing cards
          scoredCards = scoredCards.concat(batch);
          failures++;
        }
      }
      setStatus(`Quality pass complete: ${scoredCards.length} cards kept, ${totalRemoved} removed, ${totalImproved} improved${failures > 0 ? `, ${failures} batches skipped` : ''}`);
      return ensureCardIds(scoredCards);
    }
    return ensureCardIds(allCards);
  }

  // Shared helper: finalize deck after card generation
  async function finalizeDeck(deckId, deck, generatedCards, extraMeta = {}) {
    const updatedDeck = { ...deck, cards: generatedCards, cardCount: generatedCards.length, ...extraMeta };

    // For large decks, save in chunks to avoid payload size limits
    if (generatedCards.length > 2000) {
      const CHUNK = 2000;
      const { cards, ...meta } = updatedDeck;
      const totalPages = Math.ceil(generatedCards.length / 500); // server pages at 500
      const fullMeta = { ...meta, cardCount: generatedCards.length, totalPages };
      // Save metadata first (no cards)
      await saveDeck(deckId, { ...fullMeta, cards: [] });
      // Then save cards in chunks via v2 with page offsets
      for (let i = 0; i < generatedCards.length; i += CHUNK) {
        const chunk = generatedCards.slice(i, i + CHUNK);
        const pageOffset = Math.floor(i / 500); // align with server's 500-card pages
        await saveDeckV2(deckId, { meta: fullMeta, cards: chunk, progress: i === 0 ? {} : undefined, pageOffset });
        setGeneratingStatus(`Saving cards ${Math.min(i + CHUNK, generatedCards.length)}/${generatedCards.length}...`);
      }
    } else {
      await saveDeck(deckId, updatedDeck);
    }

    deckCacheRef.current.set(deckId, { cards: generatedCards, at: Date.now() });
    setDecks(prev => prev.map(d => d.id === deckId ? { id: deckId, ...updatedDeck } : d));
    setCards(generatedCards);
    setGeneratingStatus(`Done! ${generatedCards.length} cards ready.`);
    setMode("study");
    if (generatedCards.length > 0) precacheFirstPodcast(generatedCards[0]);
  }

  async function handleCreateDeck(name, docUrl, options = {}) {
    const source = options.skipGenerate ? "anki-import" : options.uploadedContent ? "pdf-upload" : options.topic ? "topic-search" : options.crawl ? "site-crawl" : docUrl ? "url" : "manual";
    trackEvent("Deck Created", { source, cardCount: options.directCards?.length || 0 });
    const deckId = "deck-" + Date.now();
    const deck = {
      name,
      docUrl: docUrl || null,
      cards: [],
      progress: {},
      cardCount: 0,
      createdAt: new Date().toISOString(),
    };

    await saveDeck(deckId, deck);
    setDecks(prev => [...prev, { id: deckId, ...deck }]);
    setActiveDeckId(deckId);
    setCards([]);
    setProgress({});

    if (options.skipGenerate && options.directCards) {
      // === DIRECT IMPORT (Anki): Cards are already parsed, just save ===
      const withIds = ensureCardIds(options.directCards);
      await finalizeDeck(deckId, deck, withIds, { sourceType: "anki-import" });
    } else if (options.uploadedContent) {
      // === PDF UPLOAD: Text extracted, generate cards from it ===
      setGenerating(true);
      setGeneratingStatus("PDF text extracted. Generating flashcards...");
      try {
        const withIds = await generateFromContent(options.uploadedContent, setGeneratingStatus, { density: options.density });
        await finalizeDeck(deckId, deck, withIds, { sourceType: "pdf-upload" });
      } catch (e) {
        console.error("PDF card generation failed:", e);
        alert("Failed to generate cards: " + e.message + "\nYou can add cards manually.");
        setMode("manage");
      } finally {
        setGenerating(false);
        setTimeout(() => setGeneratingStatus(""), 3000);
      }
    } else if (options.topic) {
      // === TOPIC SEARCH: Firecrawl Search + Scrape → Generate ===
      setGenerating(true);
      setGeneratingStatus("Searching the web for the best sources...");
      try {
        const { sources, content } = await searchAndScrape(options.topic);
        if (!content || content.trim().length < 50) {
          throw new Error("Could not find enough content on this topic. Try a more specific query.");
        }
        setGeneratingStatus(`Found ${sources.length} sources (${Math.round(content.length / 1000)}k chars). Generating flashcards...`);
        const withIds = await generateFromContent(content, setGeneratingStatus, { density: options.density });
        await finalizeDeck(deckId, deck, withIds, { sourceType: "topic", topic: options.topic, sources });
      } catch (e) {
        console.error("Topic search failed:", e);
        alert("Failed to generate cards: " + e.message + "\nYou can add cards manually.");
        setMode("manage");
      } finally {
        setGenerating(false);
        setTimeout(() => setGeneratingStatus(""), 3000);
      }
    } else if (options.crawl && docUrl) {
      // === SITE CRAWL: Firecrawl Map + Crawl → Generate ===
      setGenerating(true);
      setGeneratingStatus("Mapping site structure...");
      try {
        const { jobId, mappedUrls } = await crawlStart(docUrl, options.pageLimit || 25);
        setGeneratingStatus(`Found ${mappedUrls || "?"} pages. Crawling...`);

        // Poll until complete
        let result;
        while (true) {
          await new Promise(r => setTimeout(r, 3000));
          result = await crawlPoll(jobId);
          if (result.status === "completed") break;
          setGeneratingStatus(result.progress || "Crawling pages...");
        }

        if (!result.content || result.content.trim().length < 50) {
          throw new Error("Could not extract enough content from this site.");
        }
        setGeneratingStatus(`Crawled ${result.pageCount} pages (${Math.round(result.content.length / 1000)}k chars). Generating flashcards...`);
        const withIds = await generateFromContent(result.content, setGeneratingStatus, { density: options.density });
        await finalizeDeck(deckId, deck, withIds, { sourceType: "crawl", docUrl, sources: result.sources, pageCount: result.pageCount });
      } catch (e) {
        console.error("Site crawl failed:", e);
        alert("Failed to crawl site: " + e.message + "\nYou can add cards manually.");
        setMode("manage");
      } finally {
        setGenerating(false);
        setTimeout(() => setGeneratingStatus(""), 3000);
      }
    } else if (docUrl) {
      // === URL SCRAPE: Existing flow ===
      setGenerating(true);
      setGeneratingStatus("Scraping document with Firecrawl...");
      try {
        // Auto-detect study sites for smart extraction
        let content;
        let extraMeta = { docUrl };
        const isStudySite = /quizlet\.com|brainscape\.com|cram\.com|studyblue\.com/.test(docUrl);
        if (isStudySite) {
          setGeneratingStatus("Detected study site — extracting flashcards directly...");
          try {
            const extracted = await extractCards(docUrl);
            if (extracted.cards && extracted.cards.length > 0) {
              const withIds = ensureCardIds(extracted.cards);
              await finalizeDeck(deckId, deck, withIds, { ...extraMeta, sourceType: "extract" });
              setGenerating(false);
              setTimeout(() => setGeneratingStatus(""), 3000);
              return;
            }
          } catch { /* fall through to regular scrape */ }
        }

        const result = await scrapeDocument(docUrl, (msg) => setGeneratingStatus(msg));
        if (!result.content || result.content.trim().length < 50) {
          throw new Error("Could not extract enough content. Make sure the doc is shared publicly.");
        }
        setGeneratingStatus(`Document scraped (${Math.round(result.content.length / 1000)}k chars). Generating flashcards...`);
        const withIds = await generateFromContent(result.content, setGeneratingStatus, { density: options.density });
        await finalizeDeck(deckId, deck, withIds, extraMeta);
      } catch (e) {
        console.error("Failed to generate cards:", e);
        alert("Failed to generate cards: " + e.message + "\nYou can add cards manually.");
        setMode("manage");
      } finally {
        setGenerating(false);
        setTimeout(() => setGeneratingStatus(""), 3000);
      }
    } else {
      setMode("manage");
    }
  }

  async function handleDeleteDeck(deckId) {
    trackEvent("Deck Deleted");
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

    // Check in-memory cache first (avoids re-downloading 500KB)
    const cached = deckCacheRef.current.get(deckId);
    if (cached && (Date.now() - cached.at) < 5 * 60 * 1000) {
      setCards(ensureCardIds(cached.cards));
      // Still load fresh progress from Firestore (fast, small)
      fsGetProgress(user.id, deckId).then(p => { if (p) setProgress(p); }).catch(() => {});
      if (switchMode) setMode("study");
      return;
    }

    // Load the selected deck's full cards from server
    try {
      // Load progress from Firestore directly (instant)
      fsGetProgress(user.id, deckId).then(p => { if (p) setProgress(p); }).catch(() => {});

      const { deck: fullDeck } = await loadDeck(deckId);
      let deckCards = fullDeck?.cards || [];

      // If deck has cards according to metadata but loadDeck returned none,
      // try loading from v2 paginated storage
      if (deckCards.length === 0) {
        const deckMeta = decks.find(d => d.id === deckId);
        if (deckMeta?.cardCount > 0 || fullDeck?.v2) {
          try {
            deckCards = await loadAllDeckCards(deckId);
          } catch (e) {
            console.log("V2 card load failed:", e);
          }
        }
      }

      if (deckCards.length > 0) {
        setCards(ensureCardIds(deckCards));
        deckCacheRef.current.set(deckId, { cards: deckCards, at: Date.now() });
        if (fullDeck?.progress) setProgress(fullDeck.progress);
      } else {
        // Deck exists but no cards yet (blob propagation delay) — retry once after 2s
        setCards([]);
        setProgress({});
        setTimeout(async () => {
          try {
            const { deck: retry } = await loadDeck(deckId);
            if (retry?.cards?.length > 0) {
              setCards(ensureCardIds(retry.cards));
              setProgress(retry.progress || {});
            } else {
              // Try v2 paginated storage
              const v2Cards = await loadAllDeckCards(deckId);
              if (v2Cards.length > 0) {
                setCards(ensureCardIds(v2Cards));
              }
            }
          } catch {}
        }, 2000);
      }
    } catch {
      console.log("Failed to load deck cards — will retry");
      setCards([]);
      setProgress({});
      // Retry after delay for blob propagation
      setTimeout(async () => {
        try {
          const { deck: retry } = await loadDeck(deckId);
          if (retry?.cards?.length > 0) {
            setCards(ensureCardIds(retry.cards));
            setProgress(retry.progress || {});
          }
        } catch {}
      }, 3000);
    }

    if (switchMode) setMode("study");
    setActiveCategory("All");
    setSearchQuery("");
  }

  // Auto-save progress separately (lightweight, no full deck resave)
  const lastProgressSave = useRef(null);
  useEffect(() => {
    if (!activeDeckId || !user || Object.keys(progress).length === 0) return;
    const progressStr = JSON.stringify(progress);
    if (progressStr === lastProgressSave.current) return;
    const timer = setTimeout(() => {
      lastProgressSave.current = progressStr;
      saveDeckProgress(activeDeckId, progress).catch((err) => {
        console.log("Progress save failed:", err);
      });
      setDecks(prev => prev.map(d =>
        d.id === activeDeckId ? { ...d, lastStudied: new Date().toISOString() } : d
      ));
    }, 3000);
    return () => clearTimeout(timer);
  }, [progress, activeDeckId]);

  // Auto-save cards when they change — skip for large v2 decks (cards saved per-operation)
  const lastCardsSave = useRef(null);
  useEffect(() => {
    if (!activeDeckId || !user || cards.length === 0) return;
    // Skip full-deck save for large decks — they use v2 paginated storage
    if (cards.length > 2000) return;
    const cardsLen = cards.length;
    if (cardsLen === lastCardsSave.current) return;
    const timer = setTimeout(() => {
      lastCardsSave.current = cardsLen;
      const currentDeck = decks.find(d => d.id === activeDeckId);
      if (currentDeck) {
        saveDeck(activeDeckId, { ...currentDeck, cards, progress, cardCount: cardsLen, lastStudied: new Date().toISOString() });
      }
    }, 5000);
    return () => clearTimeout(timer);
  }, [cards.length, activeDeckId]);

  const activeDeck = decks.find(d => d.id === activeDeckId);

  // Single-pass filtering + category counting (avoids duplicate iteration on 16K+ decks)
  const { filteredCards, categoryCounts } = useMemo(() => {
    const counts = { All: 0 };
    const filtered = [];
    const q = searchQuery.trim() ? searchQuery.toLowerCase() : "";

    for (const c of cards) {
      if (!c?.front || !(c?.back || c?.occlusion || c?.frontImages?.length > 0)) continue;
      counts.All++;
      const cat = c.category || "General";
      counts[cat] = (counts[cat] || 0) + 1;
      if (activeCategory !== "All" && c.category !== activeCategory) continue;
      if (q && !(c.front || "").toLowerCase().includes(q) && !(c.back || "").toLowerCase().includes(q)) continue;
      filtered.push(c);
    }

    return { filteredCards: filtered, categoryCounts: counts };
  }, [cards, activeCategory, searchQuery]);

  async function saveToDeck(updatedCards, updatedProgress) {
    if (!activeDeckId) return;
    const currentDeck = decks.find(d => d.id === activeDeckId);
    if (!currentDeck) return;
    try {
      const cardsToSave = updatedCards || cards;
      // For large decks, only save metadata + progress (cards already in v2 storage)
      if (cardsToSave.length > 2000) {
        await saveDeck(activeDeckId, {
          ...currentDeck,
          cards: [],
          cardCount: cardsToSave.length,
          lastStudied: new Date().toISOString(),
        });
        if (updatedProgress) {
          await saveDeckProgress(activeDeckId, updatedProgress);
        }
      } else {
        await saveDeck(activeDeckId, {
          ...currentDeck,
          cards: cardsToSave,
          progress: updatedProgress || progress,
          cardCount: cardsToSave.length,
          lastStudied: new Date().toISOString(),
        });
      }
      setDecks(prev => prev.map(d =>
        d.id === activeDeckId ? { ...d, cardCount: cardsToSave.length, lastStudied: new Date().toISOString() } : d
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

  function handleSuspendCard(card) {
    const key = card.front?.slice(0, 60);
    setProgress(prev => ({
      ...prev,
      [key]: { ...prev[key], suspended: true },
    }));
    saveDeckProgress(activeDeckId, { ...progress, [key]: { ...progress[key], suspended: true } }).catch(() => {});
  }

  function handleUnsuspendCard(card) {
    const key = card.front?.slice(0, 60);
    setProgress(prev => {
      const updated = { ...prev[key] };
      delete updated.suspended;
      return { ...prev, [key]: updated };
    });
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

  // Regenerate a single card with a new style
  async function handleRegenCard(card, style) {
    try {
      const result = await regenCard(card, style);
      if (result?.front && result?.back) {
        const updated = cards.map(c =>
          c.id === card.id ? { ...c, front: result.front, back: result.back } : c
        );
        setCards(updated);
        // Invalidate deck cache so switching away and back shows the update
        deckCacheRef.current.delete(activeDeckId);
        // Save to deck
        saveToDeck(updated).catch(() => {});
        return true;
      }
    } catch (e) {
      console.error("Card regen failed:", e);
    }
    return false;
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
    // Only auto-subscribe truly new users — check localStorage flag
    const everHadDecks = localStorage.getItem("bc-has-had-decks");
    if (decks.length === 0 && !loading && user?.id && !autoSeeding && !hasEverLoadedDecks && !subscribingRef.current && !everHadDecks) {
      subscribingRef.current = true;
      setAutoSeeding(true);
      (async () => {
        try {
          if (user?.id) setUserId(user.id);
          if (accessToken) setAuthToken(accessToken);
          // Subscribe to the public onboarding deck — no cloning, no seed function
          trackEvent("New User Onboarded");
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
              // First-time user — take them straight to Audio mode
              setMode("audio");
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

  // Onboarding completion handler
  async function handleOnboardingComplete(profile) {
    await saveProfile(profile);
    setUserProfile(profile);
    setShowOnboarding(false);
    // Reload decks after onboarding (user may have subscribed to community decks)
    try {
      const { decks: refreshed } = await loadDecks();
      if (refreshed?.length > 0) {
        setDecks(refreshed);
        setHasEverLoadedDecks(true);
        localStorage.setItem("bc-has-had-decks", "true");
        const firstId = refreshed[0].id;
        setActiveDeckId(firstId);
        const { deck: fullDeck } = await loadDeck(firstId);
        if (fullDeck?.cards?.length > 0) {
          setCards(ensureCardIds(fullDeck.cards));
          setProgress(fullDeck.progress || {});
        }
      }
    } catch (e) {
      console.error("Post-onboarding deck load failed:", e);
    }
  }

  // --- DeckLibrary handlers (extracted from inline callbacks) ---

  async function handleRefreshDecks() {
    try {
      const { decks: fresh } = await loadDecks();
      if (fresh?.length > 0) setDecks(fresh);
    } catch {}
  }

  async function handleGenerateFromDoc(deckId, docUrl) {
    setGenerating(true);
    setGeneratingStatus("Scraping document with Firecrawl...");
    try {
      const result = await scrapeDocument(docUrl, (msg) => setGeneratingStatus(msg));
      if (!result.content || result.content.trim().length < 50) {
        throw new Error("Could not extract enough content. Make sure the doc is shared publicly.");
      }
      setGeneratingStatus(`Document scraped (${Math.round(result.content.length / 1000)}k chars). Generating flashcards...`);
      const withIds = await generateFromContent(result.content, setGeneratingStatus);
      const deck = decks.find(d => d.id === deckId);
      await finalizeDeck(deckId, deck, withIds, { docUrl });
      setActiveDeckId(deckId);
      setProgress({});
      setMode("study");
    } catch (e) {
      alert("Failed to generate cards: " + e.message);
    } finally {
      setGenerating(false);
      setTimeout(() => setGeneratingStatus(""), 3000);
    }
  }

  async function handleRegenerate() {
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
      const withIds = await generateFromContent(result.content, setGeneratingStatus);
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
  }

  async function handleSaveDeckGroups(groups) {
    setDeckGroups(groups);
    try { await saveDeckGroups(groups); } catch (e) { console.error("Save groups failed:", e); }
  }

  async function handleRenameDeck(deckId, newName) {
    setDecks(prev => prev.map(d => d.id === deckId ? { ...d, name: newName } : d));
    try {
      const deck = decks.find(d => d.id === deckId);
      if (deck) await saveDeck(deckId, { ...deck, name: newName });
    } catch (e) { console.error("Rename deck failed:", e); }
  }

  async function handleAssignDeckGroup(deckId, groupId) {
    setDecks(prev => prev.map(d => d.id === deckId ? { ...d, group: groupId } : d));
    try {
      // Send full deck metadata to avoid overwriting with partial data
      const deck = decks.find(d => d.id === deckId);
      if (deck) {
        await saveDeck(deckId, { ...deck, group: groupId || null });
      }
    } catch (e) { console.error("Assign group failed:", e); }
  }

  async function handleStudyGroup(testId) {
    const plan = studyPlan;
    if (!plan?.tests) return;
    const test = plan.tests.find(t => t.id === testId);
    if (!test?.deckIds?.length) return;
    let allGroupCards = [];
    for (const dkId of test.deckIds) {
      const existing = decks.find(d => d.id === dkId);
      if (existing?.cards?.length) {
        allGroupCards = allGroupCards.concat(existing.cards);
      } else {
        try {
          const { deck: fullDeck } = await loadDeck(dkId);
          if (fullDeck?.cards?.length) {
            allGroupCards = allGroupCards.concat(fullDeck.cards);
          }
        } catch {
          console.log("Failed to load deck", dkId);
        }
      }
    }
    if (allGroupCards.length === 0) return;
    const withIds = ensureCardIds(allGroupCards);
    setCards(withIds);
    setActiveDeckId(test.deckIds[0]);
    setMode("study");
  }

  // Static pages (accessible regardless of auth)
  if (page === "privacy") {
    return <Suspense fallback={<LazyFallback />}><PrivacyPolicy dark={dark} onBack={() => setPage(null)} /></Suspense>;
  }
  if (page === "terms") {
    return <Suspense fallback={<LazyFallback />}><TermsOfService dark={dark} onBack={() => setPage(null)} /></Suspense>;
  }
  if (page === "contact") {
    return <Suspense fallback={<LazyFallback />}><ContactPage dark={dark} onBack={() => setPage(null)} /></Suspense>;
  }
  if (page === "about") {
    return <Suspense fallback={<LazyFallback />}><AboutPage dark={dark} onBack={() => setPage(null)} /></Suspense>;
  }

  // Auth still loading — show brief splash
  if (!authReady && !user) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${dark ? "bg-gray-950" : "bg-gradient-to-br from-indigo-50 via-white to-purple-50"}`}>
        <div className="text-center">
          <i className="fa-solid fa-bolt text-indigo-500 text-4xl mb-3 block animate-pulse" />
          <p className={`text-lg font-semibold ${dark ? "text-white" : "text-gray-900"}`}>BetterCram</p>
        </div>
      </div>
    );
  }

  // Not logged in — show landing page (?v1 param for old version)
  if (!user) {
    const isV1 = typeof window !== "undefined" && window.location.search.includes("v1");
    const LandingComponent = isV1 ? LandingPage : LandingPageV2;
    return <Suspense fallback={<LazyFallback />}><LandingComponent onLogin={login} onLoginWithEmail={loginWithEmail} emailSent={emailSent} dark={dark} setDark={setDark} setPage={setPage} otpStep={otpStep} otpEmail={otpEmail} otpError={otpError} sendOTP={sendOTP} verifyOTP={verifyOTP} setOtpStep={setOtpStep} /></Suspense>;
  }

  // Show onboarding for new users (after profile has loaded)
  if (profileLoaded && showOnboarding) {
    return <Suspense fallback={<LazyFallback />}><Onboarding user={user} onComplete={handleOnboardingComplete} /></Suspense>;
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
      <Suspense fallback={<LazyFallback />}>
        <SetupScreen
          onCardsGenerated={handleCardsGenerated}
          onSkip={() => setShowSetup(false)}
          existingCards={cards.length > 0 ? cards : null}
          dark={dark}
          setDark={setDark}
          initialUrl={activeDeck?.docUrl || ""}
        />
      </Suspense>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 transition-colors">
      <AppHeader
        user={user}
        activeDeck={activeDeck}
        mode={mode}
        cards={cards}
        dark={dark}
        setDark={setDark}
        showSearch={showSearch}
        setShowSearch={setShowSearch}
        searchQuery={searchQuery}
        setSearchQuery={setSearchQuery}
        filteredCards={filteredCards}
        notifications={notifications}
        unreadCount={unreadCount}
        setNotifications={setNotifications}
        subscription={subscription}
        decks={decks}
        setMode={setMode}
        setShowPricing={setShowPricing}
        setShowMenu={setShowMenu}
        showMenu={showMenu}
        setShowSettings={setShowSettings}
        setShowNotificationSettings={setShowNotificationSettings}
        setShowDeleteAccountModal={setShowDeleteAccountModal}
        login={login}
        logout={logout}
        tabs={TABS}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        showPricing={showPricing}
      />

      <Suspense fallback={<LazyFallback />}>
      <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8 space-y-4 sm:space-y-6">
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
        {/* Desktop tabs now live in the header (AppHeader) */}

        {/* Sub-navigation within active tab */}
        {!["library", "flip", "manage", "planner"].includes(mode) && (() => {
          const currentTab = TABS.find(t => t.id === activeTab);
          if (!currentTab || currentTab.subModes.length <= 1) return null;
          return (
            <div className="flex justify-center">
              <SubNav
                items={currentTab.subModes}
                active={mode}
                onChange={handleSubModeChange}
                isPro={isPro}
              />
            </div>
          );
        })()}

        {/* Category filter — only in study modes, not library/manage/planner */}
        {!["library", "manage", "planner", "voice"].includes(mode) && !showPricing && (
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

        {/* Settings page (replaces mode content when open) */}
        {showSettings ? (
          <Settings
            user={user}
            profile={userProfile}
            onBack={() => setShowSettings(false)}
            onProfileUpdate={(updated) => setUserProfile(updated)}
          />
        ) : <ErrorBoundary>
        {/* Active mode */}
        {mode === "library" && (
          <DeckLibrary
            decks={decks}
            activeDeckId={activeDeckId}
            user={user}
            onSelectDeck={handleSelectDeck}
            onCreateDeck={handleCreateDeck}
            onDeleteDeck={handleDeleteDeck}
            onAddDeckOptimistic={(deck) => setDecks(prev => [...prev, deck])}
            onRefreshDecks={handleRefreshDecks}
            generating={generating}
            generatingStatus={generatingStatus}
            onGenerateFromDoc={handleGenerateFromDoc}
            onRegenerate={handleRegenerate}
            onAddMore={handleGenerateMore}
            onManageCards={() => setMode("manage")}
            onShowPlanner={() => setMode("planner")}
            studyPlan={studyPlan}
            deckGroups={deckGroups}
            onSaveDeckGroups={handleSaveDeckGroups}
            onAssignDeckGroup={handleAssignDeckGroup}
            onStudyGroup={handleStudyGroup}
            onRenameDeck={handleRenameDeck}
          />
        )}
        {mode === "flip" && <FlipMode cards={filteredCards} onRegenCard={handleRegenCard} />}
        {mode === "study" && (
          <StudyMode
            cards={filteredCards}
            progress={progress}
            onUpdateProgress={handleUpdateProgress}
            onSessionStatsChange={setStudySessionStats}
            deckId={activeDeckId}
            onRegenCard={handleRegenCard}
            onSuspendCard={handleSuspendCard}
          />
        )}
        {mode === "quiz" && <QuizMode cards={filteredCards} progress={progress} />}
        {mode === "tutor" && <TutorMode cards={filteredCards} deckName={activeDeck?.name} />}
        {mode === "deepdive" && <DeepDiveMode cards={filteredCards} deckName={activeDeck?.name} />}
        {mode === "audio" && <AudioMode cards={filteredCards} />}
        {mode === "voice" && <VoiceTutorMode cards={filteredCards} deckName={activeDeck?.name} deckId={activeDeckId} userId={user?.id} progress={progress} sessionStats={studySessionStats} activeCategory={activeCategory} />}
        {mode === "manage" && (
          <CardManager
            cards={filteredCards}
            allCards={cards}
            categories={CATEGORIES.filter((c) => c !== "All")}
            onAddCard={handleAddCard}
            onEditCard={handleEditCard}
            onDeleteCard={handleDeleteCard}
            isReference={activeDeck?.isReference}
            subscribedTo={activeDeck?.subscribedTo}
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
        </ErrorBoundary>}
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
      </Suspense>

      {/* Delete Account Modal */}
      {showDeleteAccountModal && (
        <DeleteAccountModal
          onClose={() => setShowDeleteAccountModal(false)}
          logout={logout}
        />
      )}

      <MobileNav tabs={TABS} activeTab={activeTab} onTabChange={handleTabChange} />
    </div>
  );
}
