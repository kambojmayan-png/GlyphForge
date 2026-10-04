import { useState, useEffect } from "react";
import { PlanSummary } from "../types/schedule";
import { formatDatePretty } from "../utils/dateUtils";

export interface StatsCardsProps {
  summary: PlanSummary;
  reducedMotion?: boolean;
}

function useCountUp(endValue: number, durationMs = 600, reducedMotion = false): number {
  const [val, setVal] = useState(reducedMotion ? endValue : 0);

  useEffect(() => {
    if (reducedMotion) {
      setVal(endValue);
      return;
    }

    const startTime = performance.now();

    const frame = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / durationMs);
      // easeOutCubic: 1 - Math.pow(1 - progress, 3)
      const easeProgress = 1 - Math.pow(1 - progress, 3);
      setVal(Math.round(easeProgress * endValue));

      if (progress < 1) {
        requestAnimationFrame(frame);
      }
    };

    const animId = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animId);
  }, [endValue, durationMs, reducedMotion]);

  return val;
}

export function StatsCards({ summary, reducedMotion = false }: StatsCardsProps) {
  const animatedActiveDays = useCountUp(summary.activeDays, 600, reducedMotion);
  const animatedContributions = useCountUp(summary.estimatedContributions, 600, reducedMotion);
  const animatedWeeks = useCountUp(summary.weeks, 600, reducedMotion);

  const cards = [
    {
      label: "Active Days",
      value: animatedActiveDays,
      sub: `${summary.activeDays} required days`,
    },
    {
      label: "Total Contributions",
      value: animatedContributions,
      sub: `Max ${summary.maxIntensity} in a day`,
    },
    {
      label: "Duration (Weeks)",
      value: animatedWeeks,
      sub: `${summary.totalDays} total days`,
    },
    {
      label: "Start Date",
      value: formatDatePretty(summary.start),
      sub: `First active: ${summary.firstActiveDay ? formatDatePretty(summary.firstActiveDay) : "None"}`,
      isText: true,
    },
    {
      label: "End Date",
      value: formatDatePretty(summary.end),
      sub: `Last active: ${summary.lastActiveDay ? formatDatePretty(summary.lastActiveDay) : "None"}`,
      isText: true,
    },
    {
      label: "Pattern Size",
      value: `${summary.patternWidth} × 7`,
      sub: `${summary.patternWidth} cols × 7 rows`,
      isText: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card, i) => (
        <div
          key={i}
          className="p-4 rounded-xl bg-gf-surface border border-gf-border shadow-sm flex flex-col justify-between"
        >
          <span className="text-xs font-medium text-gf-text-muted">{card.label}</span>
          <div className="my-2">
            <span
              className={`text-xl sm:text-2xl font-bold text-gf-text ${
                card.isText ? "text-base sm:text-lg" : "tabular-nums font-mono"
              }`}
            >
              {card.value}
            </span>
          </div>
          <span className="text-[11px] text-gf-text-muted/80 truncate">{card.sub}</span>
        </div>
      ))}
    </div>
  );
}
