import { useState } from "react";
import { ChevronLeft, ChevronRight, Check, Pin } from "lucide-react";
import { MonthPlan, CalendarDay } from "../types/calendar";
import { IsoDate } from "../types/pattern";
import { formatDateFull } from "../utils/dateUtils";

export interface CalendarPlannerProps {
  months: MonthPlan[];
  selectedDate: IsoDate | null;
  onSelectDate: (date: IsoDate | null) => void;
  doneDates: Set<IsoDate>;
  onToggleDone: (date: IsoDate) => void;
  platformUnit: string;
}

export function CalendarPlanner({
  months,
  selectedDate,
  onSelectDate,
  doneDates,
  onToggleDone,
  platformUnit,
}: CalendarPlannerProps) {
  const [currentMonthIndex, setCurrentMonthIndex] = useState(() => {
    // Initial month is first non-past active day month, or 0
    const nonPastIdx = months.findIndex((m) => m.remainingCount > 0);
    return nonPastIdx >= 0 ? nonPastIdx : 0;
  });

  const [activeDayDetail, setActiveDayDetail] = useState<CalendarDay | null>(null);

  if (months.length === 0) return null;

  const currentMonth = months[currentMonthIndex] || months[0];

  const handlePrev = () => {
    setCurrentMonthIndex((i) => Math.max(0, i - 1));
  };

  const handleNext = () => {
    setCurrentMonthIndex((i) => Math.min(months.length - 1, i + 1));
  };

  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="rounded-2xl bg-gf-surface border border-gf-border p-6 shadow-sm flex flex-col gap-6">
      {/* Header and Month Navigation */}
      <div className="flex items-center justify-between pb-4 border-b border-gf-border">
        <div>
          <h3 className="text-base font-bold text-gf-text">Monthly Planner</h3>
          <div className="flex items-center gap-3 text-xs text-gf-text-muted mt-1">
            <span>
              Active: <strong className="text-gf-text">{currentMonth.activeCount}</strong>
            </span>
            <span>•</span>
            <span>
              Remaining:{" "}
              <strong className="text-gf-level-3">{currentMonth.remainingCount}</strong>
            </span>
            <span>•</span>
            <span>
              Done:{" "}
              <strong className="text-gf-text font-semibold">{currentMonth.doneCount}</strong>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gf-text hidden sm:inline">
            {currentMonth.label}
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              disabled={currentMonthIndex === 0}
              className="p-1.5 rounded-lg border border-gf-border bg-gf-surface-raised text-gf-text hover:bg-gf-surface disabled:opacity-40"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs font-mono text-gf-text-muted px-1.5">
              {currentMonthIndex + 1} / {months.length}
            </span>
            <button
              onClick={handleNext}
              disabled={currentMonthIndex === months.length - 1}
              className="p-1.5 rounded-lg border border-gf-border bg-gf-surface-raised text-gf-text hover:bg-gf-surface disabled:opacity-40"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Month Calendar Grid */}
      <div className="flex flex-col gap-2">
        {/* Weekday headers */}
        <div className="grid grid-cols-7 gap-1.5 text-center text-xs font-mono font-medium text-gf-text-muted">
          {weekdays.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1.5">
          {currentMonth.weeks.flat().map((day) => {
            const dayNum = parseInt(day.date.slice(8), 10);
            const isDone = doneDates.has(day.date);
            const isSelected = selectedDate === day.date;

            if (!day.inMonth) {
              return (
                <div
                  key={day.date}
                  className="h-12 rounded-lg bg-gf-surface/20 border border-transparent p-1.5 text-xs text-gf-text-muted/30 select-none flex flex-col justify-between"
                >
                  <span>{dayNum}</span>
                </div>
              );
            }

            return (
              <button
                key={day.date}
                type="button"
                onClick={() => {
                  onSelectDate(day.date);
                  if (day.active) {
                    setActiveDayDetail(day);
                  }
                }}
                className={`h-12 rounded-lg p-1.5 text-xs font-mono text-left transition-all flex flex-col justify-between relative border ${
                  isSelected
                    ? "border-gf-focus ring-1 ring-gf-focus bg-gf-surface-raised font-bold"
                    : day.active
                    ? isDone
                      ? "bg-gf-level-1/20 border-gf-level-1/60 text-gf-text"
                      : "bg-gf-level-1/10 border-gf-level-2/50 text-gf-text hover:border-gf-level-3"
                    : "bg-gf-surface border-gf-border/60 text-gf-text-muted/70 hover:border-gf-border"
                }`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className={day.active ? "font-bold text-gf-text" : ""}>
                    {dayNum}
                  </span>
                  {day.active && isDone && (
                    <Check className="w-3 h-3 text-gf-level-3 shrink-0" />
                  )}
                </div>

                {day.active && (
                  <div className="flex items-center justify-between w-full">
                    <span className="text-[10px] text-gf-level-3 font-semibold">
                      ● {day.required}
                    </span>
                    {day.status === "past" && !isDone && (
                      <span className="text-[9px] text-gf-warn">missed</span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active Day Detail Popover / Card */}
      {activeDayDetail && (
        <div className="p-4 rounded-xl bg-gf-surface-raised border border-gf-border shadow-sm flex flex-col gap-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="font-bold text-sm text-gf-text">
              {formatDateFull(activeDayDetail.date)}
            </span>
            <button
              onClick={() => setActiveDayDetail(null)}
              className="text-xs text-gf-text-muted hover:text-gf-text"
            >
              Close
            </button>
          </div>

          <div className="text-xs text-gf-text flex flex-col gap-1.5">
            <p>
              Make <strong>{activeDayDetail.required}</strong> {platformUnit}(s) on this day.
            </p>
            {activeDayDetail.pixel && (
              <p className="font-mono text-gf-text-muted">
                Pixel position: Column {activeDayDetail.pixel.column + 1}, Row{" "}
                {activeDayDetail.pixel.row + 1} of 7.
              </p>
            )}
            {activeDayDetail.glyph && activeDayDetail.glyph.cluster && (
              <p className="text-gf-text-muted">
                Part of: "{activeDayDetail.glyph.cluster}" (Line {activeDayDetail.glyph.line + 1})
              </p>
            )}
          </div>

          <div className="pt-2 border-t border-gf-border flex items-center justify-between">
            <label className="flex items-center gap-2 text-xs font-semibold text-gf-text cursor-pointer select-none">
              <input
                type="checkbox"
                checked={doneDates.has(activeDayDetail.date)}
                onChange={() => onToggleDone(activeDayDetail.date)}
                className="rounded accent-gf-level-3"
              />
              <span>Mark as completed</span>
            </label>

            <button
              onClick={() => {
                onSelectDate(activeDayDetail.date);
                const el = document.querySelector("#generator");
                el?.scrollIntoView({ behavior: "smooth" });
              }}
              className="flex items-center gap-1 text-xs text-gf-focus hover:underline"
            >
              <Pin className="w-3 h-3" />
              <span>Pin in graph</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
