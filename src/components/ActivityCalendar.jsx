import { useState, useEffect, useMemo } from "react";

const DAY_LABELS = ["", "Mon", "", "Wed", "", "Fri", ""];
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/**
 * GitHub-style study activity heatmap.
 * Shows 52 weeks of daily study activity with streak count.
 */
export default function ActivityCalendar({ activity = [], streak = 0 }) {
  // Build a map of date → review count
  const activityMap = useMemo(() => {
    const map = new Map();
    activity.forEach(a => {
      if (a.date && a.reviews) map.set(a.date, a.reviews);
    });
    return map;
  }, [activity]);

  // Generate 364 days (52 weeks), ending today, aligned to start on Monday
  const { cells, monthLabels, maxReviews } = useMemo(() => {
    const today = new Date();
    const cells = [];
    let max = 0;

    // Find the Monday 51 weeks ago
    const start = new Date(today);
    start.setDate(start.getDate() - 363 - ((start.getDay() + 6) % 7));

    for (let i = 0; i < 371; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      if (d > today) break;

      const dateStr = d.toISOString().split("T")[0];
      const reviews = activityMap.get(dateStr) || 0;
      if (reviews > max) max = reviews;

      cells.push({
        date: dateStr,
        reviews,
        dayOfWeek: (d.getDay() + 6) % 7, // Monday=0
        week: Math.floor(i / 7),
        month: d.getMonth(),
        day: d.getDate(),
      });
    }

    // Compute month labels (show at the start of each month)
    const months = [];
    let lastMonth = -1;
    cells.forEach(c => {
      if (c.month !== lastMonth && c.dayOfWeek === 0) {
        months.push({ label: MONTH_LABELS[c.month], week: c.week });
        lastMonth = c.month;
      }
    });

    return { cells, monthLabels: months, maxReviews: max };
  }, [activityMap]);

  // Color intensity based on quartiles
  function getCellColor(reviews) {
    if (reviews === 0) return "bg-gray-100 dark:bg-gray-800";
    const ratio = maxReviews > 0 ? reviews / maxReviews : 0;
    if (ratio <= 0.25) return "bg-green-200 dark:bg-green-900";
    if (ratio <= 0.5) return "bg-green-400 dark:bg-green-700";
    if (ratio <= 0.75) return "bg-green-500 dark:bg-green-600";
    return "bg-green-600 dark:bg-green-500";
  }

  // Count total study days and reviews
  const totalDays = activity.filter(a => a.reviews > 0).length;
  const totalReviews = activity.reduce((sum, a) => sum + (a.reviews || 0), 0);

  // Group cells into columns (weeks)
  const weeks = useMemo(() => {
    const w = [];
    cells.forEach(c => {
      if (!w[c.week]) w[c.week] = [];
      w[c.week].push(c);
    });
    return w;
  }, [cells]);

  return (
    <div>
      {/* Streak + stats bar */}
      <div className="flex items-center gap-4 mb-4">
        {streak > 0 && (
          <div className="flex items-center gap-1.5">
            <i className="fa-solid fa-fire text-orange-500" />
            <span className="text-lg font-bold text-gray-900 dark:text-white">{streak}</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">day streak</span>
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{totalDays}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">study days</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">{totalReviews.toLocaleString()}</span>
          <span className="text-xs text-gray-500 dark:text-gray-400">reviews</span>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="overflow-x-auto -mx-2 px-2 hide-scrollbar">
        <div className="inline-block">
          {/* Month labels */}
          <div className="flex ml-8 mb-1">
            {monthLabels.map((m, i) => (
              <div
                key={i}
                className="text-[10px] text-gray-400 dark:text-gray-500"
                style={{ position: "relative", left: `${m.week * 14}px` }}
              >
                {m.label}
              </div>
            ))}
          </div>

          <div className="flex gap-0">
            {/* Day labels */}
            <div className="flex flex-col gap-[2px] mr-1.5 mt-0">
              {DAY_LABELS.map((label, i) => (
                <div key={i} className="h-[12px] w-6 text-[9px] text-gray-400 dark:text-gray-500 text-right pr-1 leading-[12px]">
                  {label}
                </div>
              ))}
            </div>

            {/* Week columns */}
            {weeks.map((week, wi) => (
              <div key={wi} className="flex flex-col gap-[2px]">
                {Array.from({ length: 7 }).map((_, di) => {
                  const cell = week?.find(c => c.dayOfWeek === di);
                  if (!cell) return <div key={di} className="w-[12px] h-[12px]" />;
                  return (
                    <div
                      key={di}
                      className={`w-[12px] h-[12px] rounded-sm ${getCellColor(cell.reviews)} transition-colors`}
                      title={`${cell.date}: ${cell.reviews} reviews`}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend */}
          <div className="flex items-center gap-1 mt-2 ml-8">
            <span className="text-[10px] text-gray-400 dark:text-gray-500 mr-1">Less</span>
            <div className="w-[10px] h-[10px] rounded-sm bg-gray-100 dark:bg-gray-800" />
            <div className="w-[10px] h-[10px] rounded-sm bg-green-200 dark:bg-green-900" />
            <div className="w-[10px] h-[10px] rounded-sm bg-green-400 dark:bg-green-700" />
            <div className="w-[10px] h-[10px] rounded-sm bg-green-500 dark:bg-green-600" />
            <div className="w-[10px] h-[10px] rounded-sm bg-green-600 dark:bg-green-500" />
            <span className="text-[10px] text-gray-400 dark:text-gray-500 ml-1">More</span>
          </div>
        </div>
      </div>
    </div>
  );
}
