import { useState, useMemo } from "react";

const DEFAULT_MILESTONES = [
  { id: "content-review", label: "Content Review Complete", weeksBefore: 12, completed: false },
  { id: "practice-passages", label: "Start Practice Passages", weeksBefore: 8, completed: false },
  { id: "practice-tests", label: "Full Practice Tests Begin", weeksBefore: 6, completed: false },
  { id: "weak-areas", label: "Review Weak Areas", weeksBefore: 4, completed: false },
  { id: "final-review", label: "Final Review Phase", weeksBefore: 2, completed: false },
  { id: "exam-day", label: "Exam Day", weeksBefore: 0, completed: false },
];

function generateMilestones(examDate) {
  const exam = new Date(examDate + "T00:00:00");
  return DEFAULT_MILESTONES.map((m) => {
    const date = new Date(exam);
    date.setDate(date.getDate() - m.weeksBefore * 7);
    return { ...m, date: date.toISOString().split("T")[0] };
  });
}

function getDaysUntil(dateStr) {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + "T00:00:00");
  return Math.ceil((target - now) / (1000 * 60 * 60 * 24));
}

function getWeeksUntil(dateStr) {
  return Math.ceil(getDaysUntil(dateStr) / 7);
}

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

function getWeekStart() {
  const d = new Date();
  d.setDate(d.getDate() - d.getDay());
  d.setHours(0, 0, 0, 0);
  return d;
}

export default function PlannerMode({ cards, progress, studyPlan, onUpdatePlan }) {
  const [examDateInput, setExamDateInput] = useState(studyPlan?.examDate || "");
  const [dailyGoalInput, setDailyGoalInput] = useState(studyPlan?.dailyGoal || 20);
  const [editingGoals, setEditingGoals] = useState(false);

  // Derive today's study count from progress
  const todayStudied = useMemo(() => {
    if (!progress) return 0;
    const today = getTodayStr();
    let count = 0;
    for (const key of Object.keys(progress)) {
      const p = progress[key];
      if (p?.lastSeen && p.lastSeen.startsWith(today)) count++;
    }
    return count;
  }, [progress]);

  // Weekly stats by category
  const weeklyStats = useMemo(() => {
    if (!progress) return {};
    const weekStart = getWeekStart();
    const stats = {};
    for (const key of Object.keys(progress)) {
      const p = progress[key];
      if (!p?.lastSeen) continue;
      const seen = new Date(p.lastSeen);
      if (seen >= weekStart) {
        const cat = p.category || "General";
        stats[cat] = (stats[cat] || 0) + 1;
      }
    }
    return stats;
  }, [progress]);

  // Category card counts
  const categoryCounts = useMemo(() => {
    const counts = {};
    cards.forEach((c) => {
      counts[c.category] = (counts[c.category] || 0) + 1;
    });
    return counts;
  }, [cards]);

  function handleSetExamDate() {
    if (!examDateInput) return;
    const milestones = generateMilestones(examDateInput);
    const plan = {
      ...studyPlan,
      examDate: examDateInput,
      dailyGoal: dailyGoalInput,
      milestones,
      weeklyGoalsByCategory: studyPlan?.weeklyGoalsByCategory || Object.fromEntries(
        Object.keys(categoryCounts).map((cat) => [cat, Math.ceil(categoryCounts[cat] / 8)])
      ),
    };
    onUpdatePlan(plan);
  }

  function toggleMilestone(id) {
    if (!studyPlan) return;
    const milestones = studyPlan.milestones.map((m) =>
      m.id === id ? { ...m, completed: !m.completed } : m
    );
    onUpdatePlan({ ...studyPlan, milestones });
  }

  function updateDailyGoal(goal) {
    setDailyGoalInput(goal);
    if (studyPlan) {
      onUpdatePlan({ ...studyPlan, dailyGoal: goal });
    }
  }

  function updateWeeklyGoal(category, goal) {
    if (!studyPlan) return;
    onUpdatePlan({
      ...studyPlan,
      weeklyGoalsByCategory: { ...studyPlan.weeklyGoalsByCategory, [category]: goal },
    });
  }

  const daysUntilExam = studyPlan?.examDate ? getDaysUntil(studyPlan.examDate) : null;
  const weeksUntilExam = studyPlan?.examDate ? getWeeksUntil(studyPlan.examDate) : null;
  const dailyGoal = studyPlan?.dailyGoal || 20;
  const dailyPct = Math.min(100, Math.round((todayStudied / dailyGoal) * 100));

  // Behind schedule check
  const isBehind = todayStudied < dailyGoal && daysUntilExam !== null && daysUntilExam > 0;

  return (
    <div className="space-y-6">
      {/* No plan set yet */}
      {!studyPlan?.examDate ? (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 border border-gray-200 dark:border-gray-700 shadow-sm text-center">
          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-900 rounded-full flex items-center justify-center mx-auto mb-4">
            <i className="fa-solid fa-calendar-check text-2xl text-indigo-600 dark:text-indigo-400" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            Set Your Exam Date
          </h2>
          <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
            Enter your exam date and we'll create a study plan with milestones, daily goals, and progress tracking.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
            <input
              type="date"
              value={examDateInput}
              onChange={(e) => setExamDateInput(e.target.value)}
              min={getTodayStr()}
              className="border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-4 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-500 dark:text-gray-400">Daily goal:</label>
              <input
                type="number"
                value={dailyGoalInput}
                onChange={(e) => setDailyGoalInput(Number(e.target.value))}
                min={1}
                max={200}
                className="w-20 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-800 dark:text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <span className="text-sm text-gray-400">cards/day</span>
            </div>
            <button
              onClick={handleSetExamDate}
              disabled={!examDateInput}
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white rounded-lg font-medium text-sm transition-colors"
            >
              Create Study Plan
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* Countdown header */}
          <div className={`rounded-2xl p-6 border shadow-sm ${
            daysUntilExam <= 7
              ? "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800"
              : daysUntilExam <= 30
              ? "bg-yellow-50 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-800"
              : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700"
          }`}>
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Exam Day</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {new Date(studyPlan.examDate + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </p>
              </div>
              <div className="text-right">
                <p className={`text-3xl font-bold ${
                  daysUntilExam <= 7 ? "text-red-600 dark:text-red-400" :
                  daysUntilExam <= 30 ? "text-yellow-600 dark:text-yellow-400" :
                  "text-indigo-600 dark:text-indigo-400"
                }`}>
                  {daysUntilExam > 0 ? daysUntilExam : 0}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  days left ({weeksUntilExam} weeks)
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                onUpdatePlan(null);
                setExamDateInput("");
              }}
              className="mt-3 text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <i className="fa-solid fa-pen mr-1" /> Change exam date
            </button>
          </div>

          {/* Daily progress */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                <i className="fa-solid fa-fire text-orange-500 mr-2" />
                Today's Progress
              </h3>
              <button
                onClick={() => setEditingGoals(!editingGoals)}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800"
              >
                <i className="fa-solid fa-sliders mr-1" />
                {editingGoals ? "Done" : "Edit goals"}
              </button>
            </div>

            {/* Daily goal ring */}
            <div className="flex items-center gap-6">
              <div className="relative w-24 h-24 flex-shrink-0">
                <svg className="w-24 h-24 -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor"
                    className="text-gray-200 dark:text-gray-700" strokeWidth="8" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor"
                    className={dailyPct >= 100 ? "text-green-500" : "text-indigo-600 dark:text-indigo-400"}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={`${dailyPct * 2.64} 264`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-gray-900 dark:text-white">{dailyPct}%</span>
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {todayStudied} <span className="text-sm font-normal text-gray-400">/ {dailyGoal}</span>
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">cards studied today</p>
                {dailyPct >= 100 && (
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium mt-1">
                    <i className="fa-solid fa-check-circle mr-1" /> Daily goal reached!
                  </p>
                )}
              </div>
            </div>

            {editingGoals && (
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <label className="text-sm text-gray-600 dark:text-gray-300">Daily goal:</label>
                  <input
                    type="number"
                    value={dailyGoal}
                    onChange={(e) => updateDailyGoal(Number(e.target.value))}
                    min={1}
                    max={200}
                    className="w-20 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded-lg px-3 py-1.5 text-sm text-gray-800 dark:text-gray-200 outline-none"
                  />
                  <span className="text-sm text-gray-400">cards/day</span>
                </div>
              </div>
            )}
          </div>

          {/* Behind schedule warning */}
          {isBehind && todayStudied === 0 && (
            <div className="bg-amber-50 dark:bg-amber-950 rounded-xl p-4 border border-amber-200 dark:border-amber-800 flex items-center gap-3">
              <i className="fa-solid fa-triangle-exclamation text-amber-600 dark:text-amber-400" />
              <div>
                <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  You haven't studied any cards today
                </p>
                <p className="text-xs text-amber-600 dark:text-amber-400">
                  Your daily goal is {dailyGoal} cards. Get started to stay on track!
                </p>
              </div>
            </div>
          )}

          {/* Category breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
              <i className="fa-solid fa-chart-bar text-indigo-500 mr-2" />
              Weekly by Category
            </h3>
            <div className="space-y-3">
              {Object.keys(categoryCounts).map((cat) => {
                const studied = weeklyStats[cat] || 0;
                const goal = studyPlan.weeklyGoalsByCategory?.[cat] || Math.ceil(categoryCounts[cat] / 8);
                const pct = Math.min(100, Math.round((studied / goal) * 100));
                return (
                  <div key={cat}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-gray-700 dark:text-gray-300">{cat}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">
                          {studied}/{editingGoals ? (
                            <input
                              type="number"
                              value={goal}
                              onChange={(e) => updateWeeklyGoal(cat, Number(e.target.value))}
                              min={1}
                              className="w-12 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 rounded px-1 py-0.5 text-xs text-gray-800 dark:text-gray-200 outline-none inline"
                            />
                          ) : goal}
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full transition-all ${pct >= 100 ? "bg-green-500" : "bg-indigo-500"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Milestone timeline */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-6">
              <i className="fa-solid fa-flag-checkered text-indigo-500 mr-2" />
              Milestones
            </h3>
            <div className="space-y-0">
              {studyPlan.milestones?.map((m, i) => {
                const days = getDaysUntil(m.date);
                const isPast = days < 0;
                const isToday = days === 0;
                const isNext = !m.completed && days > 0 && (i === 0 || studyPlan.milestones[i - 1]?.completed);
                return (
                  <div key={m.id} className="flex gap-4">
                    {/* Timeline line */}
                    <div className="flex flex-col items-center">
                      <button
                        onClick={() => toggleMilestone(m.id)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                          m.completed
                            ? "bg-green-500 text-white"
                            : isToday || isNext
                            ? "bg-indigo-100 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-400"
                            : isPast
                            ? "bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-400"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-400"
                        }`}
                      >
                        {m.completed ? (
                          <i className="fa-solid fa-check text-xs" />
                        ) : m.id === "exam-day" ? (
                          <i className="fa-solid fa-star text-xs" />
                        ) : (
                          <span className="text-xs font-bold">{i + 1}</span>
                        )}
                      </button>
                      {i < studyPlan.milestones.length - 1 && (
                        <div className={`w-0.5 h-12 ${m.completed ? "bg-green-300 dark:bg-green-700" : "bg-gray-200 dark:bg-gray-700"}`} />
                      )}
                    </div>
                    {/* Content */}
                    <div className="pb-8">
                      <p className={`font-medium ${
                        m.completed ? "text-green-700 dark:text-green-300 line-through" : "text-gray-900 dark:text-white"
                      }`}>
                        {m.label}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {new Date(m.date + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        {isToday && <span className="text-indigo-600 dark:text-indigo-400 font-medium ml-2">Today!</span>}
                        {!isToday && days > 0 && <span className="ml-2">{days} days away</span>}
                        {isPast && !m.completed && <span className="text-red-500 font-medium ml-2">Overdue</span>}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
