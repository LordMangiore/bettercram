import { useState, useMemo, useCallback } from "react";

// ─── Helpers ────────────────────────────────────────────────

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

function getEndOfToday() {
  const d = new Date();
  d.setHours(23, 59, 59, 999);
  return d;
}

function getDaysUntil(dateStr) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function getWeekKey(d = new Date()) {
  const jan1 = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function formatMins(secs) {
  if (secs < 60) return "< 1 min";
  const m = Math.round(secs / 60);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
}

function uid() {
  return "m" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// ─── Color palette ────────────────────────────────────────────

const COLOR_PALETTE = [
  { id: "indigo", label: "Indigo", bg: "bg-indigo-500", light: "bg-indigo-100 dark:bg-indigo-900/40", text: "text-indigo-600 dark:text-indigo-400", border: "border-indigo-300 dark:border-indigo-700", ring: "ring-indigo-400", gradient: "from-indigo-600 to-indigo-700" },
  { id: "emerald", label: "Emerald", bg: "bg-emerald-500", light: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-600 dark:text-emerald-400", border: "border-emerald-300 dark:border-emerald-700", ring: "ring-emerald-400", gradient: "from-emerald-600 to-emerald-700" },
  { id: "orange", label: "Orange", bg: "bg-orange-500", light: "bg-orange-100 dark:bg-orange-900/40", text: "text-orange-600 dark:text-orange-400", border: "border-orange-300 dark:border-orange-700", ring: "ring-orange-400", gradient: "from-orange-600 to-orange-700" },
  { id: "pink", label: "Pink", bg: "bg-pink-500", light: "bg-pink-100 dark:bg-pink-900/40", text: "text-pink-600 dark:text-pink-400", border: "border-pink-300 dark:border-pink-700", ring: "ring-pink-400", gradient: "from-pink-600 to-pink-700" },
  { id: "cyan", label: "Cyan", bg: "bg-cyan-500", light: "bg-cyan-100 dark:bg-cyan-900/40", text: "text-cyan-600 dark:text-cyan-400", border: "border-cyan-300 dark:border-cyan-700", ring: "ring-cyan-400", gradient: "from-cyan-600 to-cyan-700" },
  { id: "amber", label: "Amber", bg: "bg-amber-500", light: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-600 dark:text-amber-400", border: "border-amber-300 dark:border-amber-700", ring: "ring-amber-400", gradient: "from-amber-600 to-amber-700" },
  { id: "violet", label: "Violet", bg: "bg-violet-500", light: "bg-violet-100 dark:bg-violet-900/40", text: "text-violet-600 dark:text-violet-400", border: "border-violet-300 dark:border-violet-700", ring: "ring-violet-400", gradient: "from-violet-600 to-violet-700" },
  { id: "rose", label: "Rose", bg: "bg-rose-500", light: "bg-rose-100 dark:bg-rose-900/40", text: "text-rose-600 dark:text-rose-400", border: "border-rose-300 dark:border-rose-700", ring: "ring-rose-400", gradient: "from-rose-600 to-rose-700" },
];

function getColorObj(colorId) {
  return COLOR_PALETTE.find(c => c.id === colorId) || COLOR_PALETTE[0];
}

// ─── Progress helpers (handles FSRS + legacy SM-2) ──────────

function getFSRSDue(prog) {
  if (prog?.fsrs?.due) return new Date(prog.fsrs.due);
  if (prog?.nextReview) return new Date(prog.nextReview);
  return null;
}

function getFSRSState(prog) {
  if (prog?.fsrs) return prog.fsrs.state;
  return null;
}

function getFSRSReps(prog) {
  if (prog?.fsrs) return prog.fsrs.reps || 0;
  if (prog?.repetitions != null) return prog.repetitions;
  return 0;
}

function getFSRSInterval(prog) {
  if (prog?.fsrs?.scheduled_days) return prog.fsrs.scheduled_days;
  if (prog?.interval) return prog.interval;
  return 0;
}

function getLastReview(prog) {
  if (prog?.fsrs?.last_review) return new Date(prog.fsrs.last_review);
  if (prog?.lastSeen) return new Date(prog.lastSeen);
  return null;
}

function isNew(prog) {
  return !prog || (!prog.fsrs && !prog.nextReview && !prog.repetitions);
}

function isDueToday(prog) {
  const due = getFSRSDue(prog);
  if (!due) return true;
  return due <= getEndOfToday();
}

function isLearning(prog) {
  const st = getFSRSState(prog);
  if (st === 1 || st === 3) return true;
  if (st == null && getFSRSReps(prog) > 0 && getFSRSReps(prog) < 2) return true;
  return false;
}

function isYoung(prog) {
  if (isNew(prog) || isLearning(prog)) return false;
  const interval = getFSRSInterval(prog);
  const st = getFSRSState(prog);
  return (st === 2 || st == null) && interval > 0 && interval < 21;
}

function isMature(prog) {
  if (isNew(prog) || isLearning(prog)) return false;
  return getFSRSInterval(prog) >= 21;
}

function wasReviewedInLast7Days(prog) {
  const lr = getLastReview(prog);
  if (!lr) return false;
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  return lr >= sevenDaysAgo;
}

function wasReviewedToday(prog) {
  if (!prog) return false;
  const lr = getLastReview(prog);
  if (!lr) return false;
  const today = getTodayStr();
  return lr.toISOString().startsWith(today);
}

// ─── Compute stats for a set of cards ────────────────────────

function computeStats(cards, progress) {
  const total = cards.length;
  let newCount = 0, learningCount = 0, youngCount = 0, matureCount = 0;
  let dueToday = 0, studiedToday = 0, studiedThisWeek = 0;
  let newCards = 0;
  const categoryMap = {};

  cards.forEach((card) => {
    const key = card.front?.slice(0, 60) || card.id;
    const prog = progress?.[key] || progress?.[card.id];
    const cat = card.category || "General";

    if (!categoryMap[cat]) {
      categoryMap[cat] = { total: 0, mature: 0, due: 0, new: 0, learning: 0, young: 0 };
    }
    categoryMap[cat].total++;

    if (isNew(prog)) {
      newCount++;
      newCards++;
      dueToday++;
      categoryMap[cat].new++;
    } else {
      if (isMature(prog)) { matureCount++; categoryMap[cat].mature++; }
      else if (isYoung(prog)) { youngCount++; categoryMap[cat].young++; }
      else if (isLearning(prog)) { learningCount++; categoryMap[cat].learning++; }
      if (isDueToday(prog)) { dueToday++; categoryMap[cat].due++; }
    }

    if (wasReviewedToday(prog)) studiedToday++;
    if (wasReviewedInLast7Days(prog)) studiedThisWeek++;
  });

  const masteryPct = total > 0 ? Math.round((matureCount / total) * 100) : 0;

  return {
    total, newCount, learningCount, youngCount, matureCount,
    dueToday, studiedToday, studiedThisWeek, newCards, masteryPct,
    categoryMap,
  };
}

function computeWeeklyForecast(cards, progress) {
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    d.setHours(23, 59, 59, 999);
    const dateStr = d.toISOString().split("T")[0];

    let count = 0;
    cards.forEach((card) => {
      const key = card.front?.slice(0, 60) || card.id;
      const prog = progress?.[key] || progress?.[card.id];
      if (isNew(prog)) {
        if (i === 0) count++;
        return;
      }
      const due = getFSRSDue(prog);
      if (due && due <= d) count++;
    });

    days.push({
      date: d,
      dateStr,
      dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
      dayNum: d.getDate(),
      count,
      isToday: i === 0,
    });
  }
  return days;
}

// ─── Migration helper ────────────────────────────────────────

function migratePlan(plan, decks, activeDeckId) {
  if (!plan) return { tests: [], streak: 0, lastStudyDate: null, weeklyStats: {} };
  if (plan.tests) return plan;
  // Old format: has examDate at root — migrate to a default test
  const migrated = {
    tests: [],
    streak: plan.streak || 0,
    lastStudyDate: plan.lastStudyDate || null,
    weeklyStats: plan.weeklyStats || {},
  };
  if (plan.examDate) {
    migrated.tests.push({
      id: "test-" + uid(),
      name: "My Exam",
      examDate: plan.examDate,
      startDate: getTodayStr(),
      deckIds: activeDeckId ? [activeDeckId] : [],
      milestones: plan.milestones || [],
      dailyGoal: plan.dailyGoal || 30,
      color: "indigo",
    });
  }
  return migrated;
}

// ═══════════════════════════════════════════════════════════════
// Main component
// ═══════════════════════════════════════════════════════════════

export default function PlannerMode({ cards, progress, studyPlan, onUpdatePlan, onStartStudy, decks = [], activeDeckId }) {
  const plan = useMemo(() => migratePlan(studyPlan, decks, activeDeckId), [studyPlan, decks, activeDeckId]);

  // Save migrated plan back if it was transformed
  useMemo(() => {
    if (studyPlan && !studyPlan.tests && plan.tests) {
      onUpdatePlan(plan);
    }
  }, []);

  const [activeTab, setActiveTab] = useState("overview");
  const [showNewTestForm, setShowNewTestForm] = useState(false);
  const [editingTestId, setEditingTestId] = useState(null);

  // New test form state
  const [newTestName, setNewTestName] = useState("");
  const [newTestDate, setNewTestDate] = useState("");
  const [newTestDeckIds, setNewTestDeckIds] = useState([]);
  const [newTestGoal, setNewTestGoal] = useState(30);
  const [newTestColor, setNewTestColor] = useState("indigo");

  // Milestone form state (per test)
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDate, setMilestoneDate] = useState("");
  const [milestoneMastery, setMilestoneMastery] = useState("");
  const [showMilestoneForm, setShowMilestoneForm] = useState(false);

  const tests = plan.tests || [];

  // ─── Stats for active deck's cards ────────────────────────

  const activeStats = useMemo(() => computeStats(cards, progress), [cards, progress]);
  const weeklyForecast = useMemo(() => computeWeeklyForecast(cards, progress), [cards, progress]);

  // ─── Streak ────────────────────────────────────────────────

  const streak = useMemo(() => {
    if (plan.streak != null && plan.lastStudyDate) {
      const today = getTodayStr();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      if (plan.lastStudyDate === today) return plan.streak;
      if (plan.lastStudyDate === yesterdayStr) {
        if (activeStats.studiedToday > 0) return plan.streak + 1;
        return plan.streak;
      }
      if (activeStats.studiedToday > 0) return 1;
      return 0;
    }
    return activeStats.studiedToday > 0 ? 1 : 0;
  }, [plan.streak, plan.lastStudyDate, activeStats.studiedToday]);

  const weeklyAccuracy = useMemo(() => {
    const wk = getWeekKey();
    const ws = plan.weeklyStats?.[wk];
    if (!ws || (ws.correct + ws.wrong) === 0) return null;
    return Math.round((ws.correct / (ws.correct + ws.wrong)) * 100);
  }, [plan.weeklyStats]);

  // ─── Per-test stats (only for the active deck) ─────────────

  const testStatsMap = useMemo(() => {
    const map = {};
    tests.forEach(test => {
      const isActiveInTest = test.deckIds.includes(activeDeckId);
      if (isActiveInTest) {
        map[test.id] = activeStats;
      } else {
        // For non-active decks, compute rough totals from deck metadata
        let totalCards = 0;
        test.deckIds.forEach(did => {
          const deck = decks.find(d => d.id === did);
          if (deck) totalCards += deck.cardCount || 0;
        });
        map[test.id] = {
          total: totalCards,
          dueToday: 0,
          masteryPct: 0,
          newCount: totalCards,
          learningCount: 0,
          youngCount: 0,
          matureCount: 0,
          studiedToday: 0,
          studiedThisWeek: 0,
          newCards: totalCards,
          categoryMap: {},
        };
      }
    });
    return map;
  }, [tests, activeDeckId, activeStats, decks]);

  // Total due across all tests
  const totalDueAllTests = useMemo(() => {
    let total = 0;
    tests.forEach(test => {
      const s = testStatsMap[test.id];
      if (s) {
        // Only count active deck stats to avoid double-counting
        if (test.deckIds.includes(activeDeckId)) {
          total += s.dueToday;
        }
      }
    });
    // If no tests include the active deck, just use active stats
    const anyTestHasActiveDeck = tests.some(t => t.deckIds.includes(activeDeckId));
    if (!anyTestHasActiveDeck && tests.length > 0) return activeStats.dueToday;
    if (tests.length === 0) return activeStats.dueToday;
    return total;
  }, [tests, testStatsMap, activeDeckId, activeStats]);

  const totalDailyGoal = useMemo(() => {
    if (tests.length === 0) return 30;
    return tests.reduce((sum, t) => sum + (t.dailyGoal || 30), 0);
  }, [tests]);

  const estimatedTime = formatMins(Math.max(totalDueAllTests, activeStats.dueToday) * 15);

  // ─── Handlers ─────────────────────────────────────────────

  const savePlan = useCallback((updates) => {
    const updated = { ...plan, ...updates };
    onUpdatePlan(updated);
  }, [plan, onUpdatePlan]);

  function handleCreateTest(e) {
    e.preventDefault();
    if (!newTestName || !newTestDate) return;
    const newTest = {
      id: "test-" + uid(),
      name: newTestName,
      examDate: newTestDate,
      startDate: getTodayStr(),
      deckIds: newTestDeckIds,
      milestones: [],
      dailyGoal: newTestGoal,
      color: newTestColor,
    };
    savePlan({ tests: [...tests, newTest] });
    setNewTestName("");
    setNewTestDate("");
    setNewTestDeckIds([]);
    setNewTestGoal(30);
    setNewTestColor("indigo");
    setShowNewTestForm(false);
    setActiveTab(newTest.id);
  }

  function handleUpdateTest(testId, updates) {
    const updated = tests.map(t => t.id === testId ? { ...t, ...updates } : t);
    savePlan({ tests: updated });
  }

  function handleDeleteTest(testId) {
    const updated = tests.filter(t => t.id !== testId);
    savePlan({ tests: updated });
    setActiveTab("overview");
    setEditingTestId(null);
  }

  function handleToggleDeck(deckId) {
    setNewTestDeckIds(prev =>
      prev.includes(deckId) ? prev.filter(d => d !== deckId) : [...prev, deckId]
    );
  }

  function handleAddMilestone(e, testId) {
    e.preventDefault();
    if (!milestoneTitle || !milestoneDate) return;
    const test = tests.find(t => t.id === testId);
    if (!test) return;
    const m = {
      id: uid(),
      title: milestoneTitle,
      date: milestoneDate,
      completed: false,
    };
    if (milestoneMastery) m.targetMastery = Number(milestoneMastery);
    const milestones = [...(test.milestones || []), m].sort((a, b) => a.date.localeCompare(b.date));
    handleUpdateTest(testId, { milestones });
    setMilestoneTitle("");
    setMilestoneDate("");
    setMilestoneMastery("");
    setShowMilestoneForm(false);
  }

  function toggleMilestone(testId, milestoneId) {
    const test = tests.find(t => t.id === testId);
    if (!test) return;
    const milestones = (test.milestones || []).map(m =>
      m.id === milestoneId ? { ...m, completed: !m.completed } : m
    );
    handleUpdateTest(testId, { milestones });
  }

  function removeMilestone(testId, milestoneId) {
    const test = tests.find(t => t.id === testId);
    if (!test) return;
    const milestones = (test.milestones || []).filter(m => m.id !== milestoneId);
    handleUpdateTest(testId, { milestones });
  }

  // ─── Edit test form state ──────────────────────────────────

  const [editName, setEditName] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editStartDate, setEditStartDate] = useState("");
  const [editDeckIds, setEditDeckIds] = useState([]);
  const [editGoal, setEditGoal] = useState(30);
  const [editColor, setEditColor] = useState("indigo");

  function startEditingTest(test) {
    setEditingTestId(test.id);
    setEditName(test.name);
    setEditDate(test.examDate);
    setEditStartDate(test.startDate || getTodayStr());
    setEditDeckIds([...test.deckIds]);
    setEditGoal(test.dailyGoal || 30);
    setEditColor(test.color || "indigo");
  }

  function saveEditingTest() {
    if (!editName || !editDate) return;
    handleUpdateTest(editingTestId, {
      name: editName,
      examDate: editDate,
      startDate: editStartDate,
      deckIds: editDeckIds,
      dailyGoal: editGoal,
      color: editColor,
    });
    setEditingTestId(null);
  }

  function toggleEditDeck(deckId) {
    setEditDeckIds(prev =>
      prev.includes(deckId) ? prev.filter(d => d !== deckId) : [...prev, deckId]
    );
  }

  // ─── Active test ──────────────────────────────────────────

  const activeTest = tests.find(t => t.id === activeTab);

  // ═══════════════════════════════════════════════════════════
  // RENDER
  // ═══════════════════════════════════════════════════════════

  return (
    <div className="space-y-5">
      {/* ═══════════════ DAILY DASHBOARD ═══════════════ */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 rounded-2xl p-5 sm:p-6 text-white shadow-lg shadow-indigo-500/20">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold">{getGreeting()}!</h1>
            <p className="text-indigo-200 text-sm mt-0.5">
              {streak > 0 && (
                <span className="inline-flex items-center gap-1 bg-white/15 rounded-full px-2.5 py-0.5 mr-2 text-xs font-medium">
                  <i className="fa-solid fa-fire text-orange-300" /> {streak} day streak
                </span>
              )}
              {getTodayStr() === plan.lastStudyDate ? "Keep it up!" : "Ready to study?"}
            </p>
          </div>
          {tests.length > 0 && (
            <div className="text-right">
              <p className="text-3xl font-bold">{Math.max(totalDueAllTests, activeStats.dueToday)}</p>
              <p className="text-indigo-200 text-xs">cards due</p>
            </div>
          )}
        </div>

        {/* Per-test mini cards */}
        {tests.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {tests.map(test => {
              const col = getColorObj(test.color);
              const testStats = testStatsMap[test.id];
              const due = test.deckIds.includes(activeDeckId) ? (testStats?.dueToday || 0) : "—";
              return (
                <button
                  key={test.id}
                  onClick={() => setActiveTab(test.id)}
                  className="flex items-center gap-2 bg-white/10 hover:bg-white/20 backdrop-blur rounded-lg px-3 py-1.5 text-xs transition-all"
                >
                  <span className={`w-2 h-2 rounded-full ${col.bg}`} />
                  <span className="font-medium">{test.name}:</span>
                  <span className="text-white/80">{due} due</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Aggregate stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <DashCard label="Due Today" value={activeStats.dueToday} icon="fa-solid fa-clock" />
          <DashCard label="New Cards" value={activeStats.newCards} icon="fa-solid fa-sparkles" />
          <DashCard label="Est. Time" value={estimatedTime} icon="fa-solid fa-hourglass-half" />
          <DashCard label="Studied" value={activeStats.studiedToday} icon="fa-solid fa-check-circle" />
        </div>

        {onStartStudy && activeStats.dueToday > 0 && (
          <button
            onClick={() => {
              const test = tests.find(t => t.id === activeTab);
              const deckId = test?.deckIds?.[0] || activeDeckId;
              onStartStudy(deckId);
            }}
            className="mt-4 w-full py-3 bg-white/20 hover:bg-white/30 backdrop-blur rounded-xl font-semibold text-sm transition-all border border-white/20"
          >
            <i className="fa-solid fa-play mr-2" />
            Start Today's Review
          </button>
        )}
      </div>

      {/* ═══════════════ TEST SELECTOR TABS ═══════════════ */}
      <div className="flex items-center gap-1 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
        <TabButton
          active={activeTab === "overview"}
          onClick={() => { setActiveTab("overview"); setShowNewTestForm(false); }}
          label="Overview"
          icon="fa-solid fa-chart-line"
        />
        {tests.map(test => {
          const col = getColorObj(test.color);
          return (
            <TabButton
              key={test.id}
              active={activeTab === test.id}
              onClick={() => { setActiveTab(test.id); setShowNewTestForm(false); }}
              label={test.name}
              colorDot={col.bg}
            />
          );
        })}
        <TabButton
          active={showNewTestForm}
          onClick={() => { setShowNewTestForm(true); setActiveTab("new"); }}
          label="New Test"
          icon="fa-solid fa-plus"
          accent
        />
      </div>

      {/* ═══════════════ NEW TEST FORM ═══════════════ */}
      {showNewTestForm && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">
            <i className="fa-solid fa-plus-circle text-indigo-500 mr-2" />
            Create New Test
          </h3>
          <form onSubmit={handleCreateTest} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Test Name</label>
                <input
                  type="text"
                  value={newTestName}
                  onChange={e => setNewTestName(e.target.value)}
                  placeholder="e.g., MCAT, Orgo Final"
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Exam Date</label>
                <input
                  type="date"
                  value={newTestDate}
                  onChange={e => setNewTestDate(e.target.value)}
                  min={getTodayStr()}
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-2">Assign Decks</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {decks.map(deck => (
                  <label
                    key={deck.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      newTestDeckIds.includes(deck.id)
                        ? "border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={newTestDeckIds.includes(deck.id)}
                      onChange={() => handleToggleDeck(deck.id)}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{deck.name}</p>
                      <p className="text-[10px] text-gray-400">{deck.cardCount || 0} cards</p>
                    </div>
                  </label>
                ))}
                {decks.length === 0 && (
                  <p className="text-sm text-gray-400 col-span-2 text-center py-4">No decks available. Create a deck first.</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Daily Goal</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={newTestGoal}
                    onChange={e => setNewTestGoal(Math.max(1, Math.min(500, Number(e.target.value))))}
                    min={1} max={500}
                    className="w-24 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-400">cards/day</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PALETTE.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setNewTestColor(c.id)}
                      className={`w-7 h-7 rounded-full ${c.bg} transition-all ${
                        newTestColor === c.id ? "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 " + c.ring : "opacity-60 hover:opacity-100"
                      }`}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                disabled={!newTestName || !newTestDate}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-xl font-medium text-sm transition-colors"
              >
                <i className="fa-solid fa-rocket mr-2" />
                Create Test
              </button>
              <button
                type="button"
                onClick={() => { setShowNewTestForm(false); setActiveTab("overview"); }}
                className="px-6 py-2.5 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ═══════════════ OVERVIEW TAB ═══════════════ */}
      {activeTab === "overview" && !showNewTestForm && (
        <div className="space-y-5">
          {tests.length === 0 ? (
            /* Empty state */
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
              <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900/50 rounded-full flex items-center justify-center mx-auto mb-4">
                <i className="fa-solid fa-calendar-check text-2xl text-indigo-600 dark:text-indigo-400" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
                Plan Your Studies
              </h2>
              <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto text-sm">
                Create tests to organize your study schedule. Assign decks, set goals, and track your progress toward each exam.
              </p>
              <button
                onClick={() => { setShowNewTestForm(true); setActiveTab("new"); }}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm transition-colors"
              >
                <i className="fa-solid fa-plus mr-2" />
                Create Your First Test
              </button>
            </div>
          ) : (
            <>
              {/* Test cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {tests.map(test => {
                  const col = getColorObj(test.color);
                  const daysLeft = getDaysUntil(test.examDate);
                  const testStats = testStatsMap[test.id];
                  const isActive = test.deckIds.includes(activeDeckId);
                  const assignedDecks = test.deckIds.map(did => decks.find(d => d.id === did)).filter(Boolean);
                  const mastery = isActive ? testStats.masteryPct : 0;

                  return (
                    <button
                      key={test.id}
                      onClick={() => setActiveTab(test.id)}
                      className={`bg-white dark:bg-gray-800 rounded-2xl p-5 border shadow-sm text-left transition-all hover:shadow-md ${col.border}`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-3 h-3 rounded-full ${col.bg}`} />
                          <h3 className="font-semibold text-gray-900 dark:text-white">{test.name}</h3>
                        </div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          daysLeft <= 7 ? "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400" :
                          daysLeft <= 30 ? "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400" :
                          col.light + " " + col.text
                        }`}>
                          {daysLeft > 0 ? `${daysLeft}d left` : daysLeft === 0 ? "Today" : "Past"}
                        </span>
                      </div>

                      {/* Progress ring */}
                      <div className="flex items-center gap-4 mb-3">
                        <div className="relative w-14 h-14 flex-shrink-0">
                          <svg className="w-14 h-14 -rotate-90" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor"
                              className="text-gray-200 dark:text-gray-700" strokeWidth="10" />
                            <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor"
                              className={mastery >= 80 ? "text-green-500" : mastery >= 40 ? "text-blue-500" : col.text}
                              strokeWidth="10" strokeLinecap="round"
                              strokeDasharray={`${mastery * 2.64} 264`} />
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-xs font-bold text-gray-900 dark:text-white">{mastery}%</span>
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">
                            {assignedDecks.length} {assignedDecks.length === 1 ? "deck" : "decks"}
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {assignedDecks.slice(0, 3).map(d => (
                              <span key={d.id} className="text-[10px] bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-1.5 py-0.5 rounded-full truncate max-w-[100px]">
                                {d.name}
                              </span>
                            ))}
                            {assignedDecks.length > 3 && (
                              <span className="text-[10px] text-gray-400">+{assignedDecks.length - 3}</span>
                            )}
                          </div>
                          {isActive && (
                            <p className="text-xs text-orange-500 font-medium mt-1">
                              {testStats.dueToday} due today
                            </p>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-gray-400">
                        {new Date(test.examDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        {" "}&middot;{" "}
                        {test.dailyGoal} cards/day goal
                      </p>
                    </button>
                  );
                })}
              </div>

              {/* Combined weekly forecast */}
              <WeeklyForecastCard forecast={weeklyForecast} />

              {/* Category breakdown (active deck) */}
              <CategoryBreakdown stats={activeStats} />
            </>
          )}
        </div>
      )}

      {/* ═══════════════ INDIVIDUAL TEST TAB ═══════════════ */}
      {activeTest && !showNewTestForm && (
        <TestDetailView
          test={activeTest}
          testStats={testStatsMap[activeTest.id]}
          decks={decks}
          activeDeckId={activeDeckId}
          cards={cards}
          progress={progress}
          weeklyAccuracy={weeklyAccuracy}
          weeklyForecast={weeklyForecast}
          onUpdateTest={(updates) => handleUpdateTest(activeTest.id, updates)}
          onDeleteTest={() => handleDeleteTest(activeTest.id)}
          onStartStudy={onStartStudy}
          editingTestId={editingTestId}
          onStartEdit={() => startEditingTest(activeTest)}
          onCancelEdit={() => setEditingTestId(null)}
          editState={{ editName, setEditName, editDate, setEditDate, editStartDate, setEditStartDate, editDeckIds, toggleEditDeck, editGoal, setEditGoal, editColor, setEditColor }}
          onSaveEdit={saveEditingTest}
          milestoneState={{ milestoneTitle, setMilestoneTitle, milestoneDate, setMilestoneDate, milestoneMastery, setMilestoneMastery, showMilestoneForm, setShowMilestoneForm }}
          onAddMilestone={(e) => handleAddMilestone(e, activeTest.id)}
          onToggleMilestone={(mid) => toggleMilestone(activeTest.id, mid)}
          onRemoveMilestone={(mid) => removeMilestone(activeTest.id, mid)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// TestDetailView
// ═══════════════════════════════════════════════════════════════

function TestDetailView({
  test, testStats, decks, activeDeckId, cards, progress,
  weeklyAccuracy, weeklyForecast,
  onUpdateTest, onDeleteTest, onStartStudy,
  editingTestId, onStartEdit, onCancelEdit,
  editState, onSaveEdit,
  milestoneState, onAddMilestone, onToggleMilestone, onRemoveMilestone,
}) {
  const col = getColorObj(test.color);
  const daysLeft = getDaysUntil(test.examDate);
  const isActive = test.deckIds.includes(activeDeckId);
  const assignedDecks = test.deckIds.map(did => decks.find(d => d.id === did)).filter(Boolean);
  const isEditing = editingTestId === test.id;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Exam projection
  const examProjection = useMemo(() => {
    if (daysLeft <= 0) return null;
    const dailyRate = testStats.studiedThisWeek > 0 ? Math.round(testStats.studiedThisWeek / 7) : (test.dailyGoal || 30);
    const totalCardsToStudy = testStats.total - testStats.matureCount;
    const projectedMastered = Math.min(testStats.total, testStats.matureCount + Math.round(daysLeft * (dailyRate || 1) * 0.15));
    const projectedRetention = testStats.total > 0 ? Math.min(99, Math.round((projectedMastered / testStats.total) * 100)) : 0;
    const recommendedDaily = totalCardsToStudy > 0 ? Math.max(10, Math.ceil(totalCardsToStudy / daysLeft * 1.5)) : test.dailyGoal || 30;
    return { daysLeft, projectedMastered, projectedRetention, recommendedDaily };
  }, [daysLeft, testStats, test.dailyGoal]);

  // Category breakdown for this test's decks
  const sortedCategories = useMemo(() => {
    return Object.entries(testStats.categoryMap || {})
      .map(([name, data]) => ({
        name,
        ...data,
        masteryPct: data.total > 0 ? Math.round((data.mature / data.total) * 100) : 0,
      }))
      .sort((a, b) => a.masteryPct - b.masteryPct);
  }, [testStats.categoryMap]);

  const dailyGoal = test.dailyGoal || 30;
  const dailyPct = Math.min(100, Math.round((testStats.studiedToday / dailyGoal) * 100));

  return (
    <div className="space-y-5">
      {/* ── Edit form ── */}
      {isEditing ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">
            <i className="fa-solid fa-pen text-indigo-500 mr-2" />
            Edit Test
          </h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Test Name</label>
                <input
                  type="text"
                  value={editState.editName}
                  onChange={e => editState.setEditName(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Start Date</label>
                <input
                  type="date"
                  value={editState.editStartDate}
                  onChange={e => editState.setEditStartDate(e.target.value)}
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Exam Date</label>
                <input
                  type="date"
                  value={editState.editDate}
                  onChange={e => editState.setEditDate(e.target.value)}
                  min={getTodayStr()}
                  className="w-full border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-gray-500 dark:text-gray-400 block mb-2">Assign Decks</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                {decks.map(deck => (
                  <label
                    key={deck.id}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      editState.editDeckIds.includes(deck.id)
                        ? "border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30"
                        : "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={editState.editDeckIds.includes(deck.id)}
                      onChange={() => editState.toggleEditDeck(deck.id)}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{deck.name}</p>
                      <p className="text-[10px] text-gray-400">{deck.cardCount || 0} cards</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-1">Daily Goal</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={editState.editGoal}
                    onChange={e => editState.setEditGoal(Math.max(1, Math.min(500, Number(e.target.value))))}
                    min={1} max={500}
                    className="w-24 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-400">cards/day</span>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 dark:text-gray-400 block mb-2">Color</label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PALETTE.map(c => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => editState.setEditColor(c.id)}
                      className={`w-7 h-7 rounded-full ${c.bg} transition-all ${
                        editState.editColor === c.id ? "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-gray-800 " + c.ring : "opacity-60 hover:opacity-100"
                      }`}
                      title={c.label}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={onSaveEdit}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium text-sm transition-colors"
              >
                Save Changes
              </button>
              <button
                onClick={onCancelEdit}
                className="px-5 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm transition-colors"
              >
                Cancel
              </button>
              <div className="flex-1" />
              {showDeleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-500">Delete this test?</span>
                  <button
                    onClick={onDeleteTest}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-medium"
                  >
                    Yes, Delete
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-3 py-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 text-xs"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-red-400 hover:text-red-600 text-sm"
                >
                  <i className="fa-solid fa-trash-can mr-1" /> Delete
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {/* ── Exam Countdown ── */}
          <div className={`rounded-2xl p-5 border shadow-sm ${
            daysLeft <= 7
              ? "bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800"
              : daysLeft <= 30
              ? "bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800"
              : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          }`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${col.bg}`} />
                <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                  {test.name}
                </h3>
              </div>
              <button
                onClick={onStartEdit}
                className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <i className="fa-solid fa-pen mr-1" /> Edit
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {new Date(test.examDate + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "long", month: "long", day: "numeric", year: "numeric",
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-3xl font-bold ${
                  daysLeft <= 7 ? "text-red-600 dark:text-red-400" :
                  daysLeft <= 30 ? "text-amber-600 dark:text-amber-400" :
                  col.text
                }`}>
                  {Math.max(0, daysLeft)}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">days left</p>
              </div>
            </div>

            {daysLeft > 0 && (
              <div className="mt-3">
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full transition-all ${
                      daysLeft <= 7 ? "bg-red-500" : daysLeft <= 30 ? "bg-amber-500" : "bg-green-500"
                    }`}
                    style={{ width: `${(() => {
                      const start = new Date((test.startDate || getTodayStr()) + "T00:00:00");
                      const end = new Date(test.examDate + "T00:00:00");
                      const now = new Date();
                      now.setHours(0, 0, 0, 0);
                      const totalDays = Math.max(1, (end - start) / (1000 * 60 * 60 * 24));
                      const elapsed = Math.max(0, (now - start) / (1000 * 60 * 60 * 24));
                      return Math.min(100, Math.max(2, (elapsed / totalDays) * 100));
                    })()}%` }}
                  />
                </div>
              </div>
            )}

            {/* Projections */}
            {examProjection && isActive && (
              <div className="grid grid-cols-3 gap-3 mt-4">
                <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{examProjection.projectedMastered}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Projected mastered</p>
                </div>
                <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-3 text-center">
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{examProjection.projectedRetention}%</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Est. retention</p>
                </div>
                <div className="bg-white/60 dark:bg-gray-800/60 rounded-xl p-3 text-center">
                  <p className={`text-lg font-bold ${col.text}`}>{examProjection.recommendedDaily}</p>
                  <p className="text-[10px] text-gray-500 dark:text-gray-400">Rec. daily cards</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Study Goals ── */}
      {!isEditing && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
              <i className="fa-solid fa-bullseye mr-2" style={{ color: `var(--tw-${test.color}-500, #6366f1)` }} />
              Daily Goal
            </h3>
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={dailyGoal}
                onChange={(e) => onUpdateTest({ dailyGoal: Math.max(1, Math.min(500, Number(e.target.value))) })}
                min={1} max={500}
                className="w-16 border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 rounded-lg px-2 py-1 text-xs text-gray-800 dark:text-gray-200 outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <span className="text-xs text-gray-400">cards/day</span>
            </div>
          </div>

          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-500 dark:text-gray-400">Today's progress</span>
            <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {testStats.studiedToday} / {dailyGoal}
              {dailyPct >= 100 && <i className="fa-solid fa-check-circle text-green-500 ml-1.5" />}
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all duration-500 ${dailyPct >= 100 ? "bg-green-500" : "bg-indigo-500"}`}
              style={{ width: `${dailyPct}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Assigned Decks ── */}
      {!isEditing && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">
            <i className="fa-solid fa-layer-group text-indigo-500 mr-2" />
            Assigned Decks
          </h3>
          {assignedDecks.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              No decks assigned.{" "}
              <button onClick={onStartEdit} className="text-indigo-500 hover:underline">
                Edit test
              </button>{" "}
              to add decks.
            </p>
          ) : (
            <div className="space-y-3">
              {assignedDecks.map(deck => {
                const isActiveDeck = deck.id === activeDeckId;
                const deckMastery = isActiveDeck ? testStats.masteryPct : 0;
                return (
                  <div key={deck.id} className={`flex items-center gap-3 p-3 rounded-xl border ${
                    isActiveDeck
                      ? col.border + " " + col.light
                      : "border-gray-200 dark:border-gray-700"
                  }`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{deck.name}</p>
                        {isActiveDeck && (
                          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${col.light} ${col.text}`}>
                            Active
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400">{deck.cardCount || 0} cards</span>
                        {isActiveDeck && (
                          <span className="text-xs text-gray-400">{deckMastery}% mastered</span>
                        )}
                      </div>
                      {isActiveDeck && (
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5 mt-2">
                          <div
                            className={`h-1.5 rounded-full transition-all ${
                              deckMastery >= 80 ? "bg-green-500" : deckMastery >= 40 ? "bg-blue-500" : "bg-indigo-500"
                            }`}
                            style={{ width: `${Math.max(deckMastery > 0 ? 2 : 0, deckMastery)}%` }}
                          />
                        </div>
                      )}
                    </div>
                    {isActiveDeck && testStats.dueToday > 0 && onStartStudy && (
                      <button
                        onClick={() => onStartStudy(deck.id)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium flex-shrink-0 transition-colors"
                      >
                        <i className="fa-solid fa-play mr-1" /> Study
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Progress Overview ── */}
      {!isEditing && isActive && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
          <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">
            <i className="fa-solid fa-chart-pie text-indigo-500 mr-2" />
            Progress Overview
          </h3>

          <div className="flex items-center gap-6 mb-5">
            <div className="relative w-24 h-24 flex-shrink-0">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor"
                  className="text-gray-200 dark:text-gray-700" strokeWidth="8" />
                <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor"
                  className={testStats.masteryPct >= 80 ? "text-green-500" : testStats.masteryPct >= 40 ? "text-blue-500" : "text-indigo-500"}
                  strokeWidth="8" strokeLinecap="round"
                  strokeDasharray={`${testStats.masteryPct * 2.64} 264`} />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-lg font-bold text-gray-900 dark:text-white">{testStats.masteryPct}%</span>
                <span className="text-[10px] text-gray-400">mastery</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 flex-1 min-w-0">
              <MiniStat label="Studied this week" value={testStats.studiedThisWeek} />
              <MiniStat label="Total cards" value={testStats.total} />
              {weeklyAccuracy != null && <MiniStat label="Accuracy" value={`${weeklyAccuracy}%`} />}
              <MiniStat label="Mature cards" value={testStats.matureCount} />
            </div>
          </div>

          <div className="space-y-2.5">
            <ProgressRow label="New" count={testStats.newCount} total={testStats.total} color="bg-gray-400" />
            <ProgressRow label="Learning" count={testStats.learningCount} total={testStats.total} color="bg-orange-500" />
            <ProgressRow label="Young" count={testStats.youngCount} total={testStats.total} color="bg-blue-500" />
            <ProgressRow label="Mature" count={testStats.matureCount} total={testStats.total} color="bg-green-500" />
          </div>
        </div>
      )}

      {/* ── Weekly Forecast ── */}
      {!isEditing && isActive && (
        <WeeklyForecastCard forecast={weeklyForecast} />
      )}

      {/* ── Category Breakdown ── */}
      {!isEditing && isActive && sortedCategories.length > 0 && (
        <CategoryBreakdown stats={testStats} />
      )}

      {/* ── Milestones ── */}
      {!isEditing && (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
              <i className="fa-solid fa-flag-checkered text-indigo-500 mr-2" />
              Milestones
            </h3>
            <button
              onClick={() => milestoneState.setShowMilestoneForm(!milestoneState.showMilestoneForm)}
              className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-medium"
            >
              <i className={`fa-solid ${milestoneState.showMilestoneForm ? "fa-times" : "fa-plus"} mr-1`} />
              {milestoneState.showMilestoneForm ? "Cancel" : "Add"}
            </button>
          </div>

          {milestoneState.showMilestoneForm && (
            <form onSubmit={onAddMilestone} className="mb-4 p-3 bg-gray-50 dark:bg-gray-750 rounded-xl border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <input
                  type="text"
                  placeholder="Milestone title..."
                  value={milestoneState.milestoneTitle}
                  onChange={(e) => milestoneState.setMilestoneTitle(e.target.value)}
                  className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500 sm:col-span-1"
                  required
                />
                <input
                  type="date"
                  value={milestoneState.milestoneDate}
                  onChange={(e) => milestoneState.setMilestoneDate(e.target.value)}
                  min={getTodayStr()}
                  className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500"
                  required
                />
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Target %"
                    value={milestoneState.milestoneMastery}
                    onChange={(e) => milestoneState.setMilestoneMastery(e.target.value)}
                    min={0} max={100}
                    className="flex-1 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex-shrink-0"
                  >
                    Add
                  </button>
                </div>
              </div>
            </form>
          )}

          {(test.milestones || []).length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
              No milestones yet. Add one to track your progress!
            </p>
          ) : (
            <div className="space-y-0">
              {(test.milestones || []).map((m, i) => {
                const days = getDaysUntil(m.date);
                const isPast = days < 0;
                const isToday = days === 0;
                return (
                  <div key={m.id} className="flex gap-3 group">
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => onToggleMilestone(m.id)}
                        className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                          m.completed
                            ? "bg-green-500 text-white shadow-sm shadow-green-500/30"
                            : isToday
                            ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-400"
                            : isPast
                            ? "bg-red-100 dark:bg-red-900/50 text-red-500"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
                        }`}
                      >
                        {m.completed ? (
                          <i className="fa-solid fa-check text-xs" />
                        ) : (
                          <span className="text-xs font-bold">{i + 1}</span>
                        )}
                      </button>
                      {i < test.milestones.length - 1 && (
                        <div className={`w-0.5 h-10 ${m.completed ? "bg-green-300 dark:bg-green-700" : "bg-gray-200 dark:bg-gray-700"}`} />
                      )}
                    </div>
                    <div className="pb-6 flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className={`text-sm font-medium ${
                            m.completed ? "text-green-600 dark:text-green-400 line-through" : "text-gray-900 dark:text-white"
                          }`}>
                            {m.title}
                          </p>
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                            {new Date(m.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                            {m.targetMastery && <span className="ml-1.5 text-indigo-500">({m.targetMastery}% target)</span>}
                            {isToday && <span className="text-indigo-600 dark:text-indigo-400 font-medium ml-2">Today</span>}
                            {!isToday && days > 0 && <span className="ml-1.5">{days}d away</span>}
                            {isPast && !m.completed && <span className="text-red-500 font-medium ml-1.5">Overdue</span>}
                          </p>
                        </div>
                        <button
                          onClick={() => onRemoveMilestone(m.id)}
                          className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                          title="Remove milestone"
                        >
                          <i className="fa-solid fa-trash-can text-xs" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Shared sub-components
// ═══════════════════════════════════════════════════════════════

function TabButton({ active, onClick, label, icon, colorDot, accent }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-all flex-shrink-0 ${
        active
          ? "bg-indigo-600 text-white shadow-sm shadow-indigo-500/20"
          : accent
          ? "bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50"
          : "bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
      }`}
    >
      {colorDot && <span className={`w-2 h-2 rounded-full ${colorDot}`} />}
      {icon && <i className={`${icon} text-xs`} />}
      {label}
    </button>
  );
}

function WeeklyForecastCard({ forecast }) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
      <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">
        <i className="fa-solid fa-calendar-week text-indigo-500 mr-2" />
        7-Day Forecast
      </h3>
      <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
        {forecast.map((day) => {
          const load = day.count === 0 ? "none" : day.count <= 15 ? "light" : day.count <= 40 ? "medium" : "heavy";
          return (
            <div
              key={day.dateStr}
              className={`rounded-xl p-2 sm:p-3 text-center transition-all ${
                day.isToday
                  ? "bg-indigo-100 dark:bg-indigo-900/50 ring-2 ring-indigo-400 dark:ring-indigo-500"
                  : "bg-gray-50 dark:bg-gray-750 hover:bg-gray-100 dark:hover:bg-gray-700"
              }`}
            >
              <p className={`text-[10px] font-medium mb-1 ${day.isToday ? "text-indigo-600 dark:text-indigo-400" : "text-gray-400"}`}>
                {day.dayName}
              </p>
              <p className={`text-sm font-bold ${day.isToday ? "text-indigo-700 dark:text-indigo-300" : "text-gray-700 dark:text-gray-300"}`}>
                {day.dayNum}
              </p>
              <div className="mt-1.5">
                <span className={`inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                  load === "none" ? "bg-gray-200 dark:bg-gray-700 text-gray-400" :
                  load === "light" ? "bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400" :
                  load === "medium" ? "bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-400" :
                  "bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400"
                }`}>
                  {day.count}
                </span>
              </div>
            </div>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-4 mt-3">
        {[
          { label: "Light", cls: "bg-green-400" },
          { label: "Medium", cls: "bg-amber-400" },
          { label: "Heavy", cls: "bg-red-400" },
        ].map((l) => (
          <div key={l.label} className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full ${l.cls}`} />
            <span className="text-[10px] text-gray-400">{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function CategoryBreakdown({ stats }) {
  const sortedCategories = useMemo(() => {
    return Object.entries(stats.categoryMap || {})
      .map(([name, data]) => ({
        name,
        ...data,
        masteryPct: data.total > 0 ? Math.round((data.mature / data.total) * 100) : 0,
      }))
      .sort((a, b) => a.masteryPct - b.masteryPct);
  }, [stats.categoryMap]);

  if (sortedCategories.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl p-5 border border-gray-200 dark:border-gray-700 shadow-sm">
      <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">
        <i className="fa-solid fa-chart-bar text-indigo-500 mr-2" />
        Category Breakdown
      </h3>
      <div className="space-y-3">
        {sortedCategories.map((cat) => (
          <div key={cat.name}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm text-gray-700 dark:text-gray-300 truncate mr-3">{cat.name}</span>
              <div className="flex items-center gap-3 flex-shrink-0">
                <span className="text-[10px] text-gray-400">{cat.total} cards</span>
                {cat.due > 0 && (
                  <span className="text-[10px] text-orange-500 font-medium">{cat.due} due</span>
                )}
                <span className={`text-xs font-semibold ${
                  cat.masteryPct >= 80 ? "text-green-600 dark:text-green-400" :
                  cat.masteryPct >= 40 ? "text-blue-600 dark:text-blue-400" :
                  "text-gray-500"
                }`}>
                  {cat.masteryPct}%
                </span>
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full transition-all ${
                  cat.masteryPct >= 80 ? "bg-green-500" :
                  cat.masteryPct >= 40 ? "bg-blue-500" :
                  cat.masteryPct > 0 ? "bg-orange-500" :
                  "bg-gray-300 dark:bg-gray-600"
                }`}
                style={{ width: `${Math.max(1, cat.masteryPct)}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function DashCard({ label, value, icon }) {
  return (
    <div className="bg-white/10 backdrop-blur rounded-xl p-3 text-center">
      <i className={`${icon} text-xs text-white/60 mb-1 block`} />
      <p className="text-lg font-bold">{value}</p>
      <p className="text-[10px] text-white/60">{label}</p>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div>
      <p className="text-lg font-bold text-gray-900 dark:text-white">{value}</p>
      <p className="text-[10px] text-gray-400 dark:text-gray-500">{label}</p>
    </div>
  );
}

function ProgressRow({ label, count, total, color }) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-500 dark:text-gray-400 w-16 text-right">{label}</span>
      <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
        <div
          className={`h-2 rounded-full transition-all ${color}`}
          style={{ width: `${Math.max(pct > 0 ? 2 : 0, pct)}%` }}
        />
      </div>
      <span className="text-xs font-medium text-gray-600 dark:text-gray-300 w-16">
        {count} <span className="text-gray-400 font-normal">({pct}%)</span>
      </span>
    </div>
  );
}
