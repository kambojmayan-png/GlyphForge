import { Copy, Calendar } from "lucide-react";
import { ScheduleEntry } from "../types/schedule";
import { IsoDate } from "../types/pattern";
import { toUtcDate } from "../utils/dateUtils";
import { format } from "date-fns";
import { copyDatesGrouped, copyToClipboard } from "../utils/exportUtils";

export interface ActiveDaysListProps {
  schedule: ScheduleEntry[];
  selectedDate: IsoDate | null;
  onSelectDate: (date: IsoDate) => void;
  onCopySuccess: () => void;
}

export function ActiveDaysList({
  schedule,
  selectedDate,
  onSelectDate,
  onCopySuccess,
}: ActiveDaysListProps) {
  const activeEntries = schedule.filter((e) => e.active);

  // Group by month
  const byMonth = new Map<string, ScheduleEntry[]>();
  for (const entry of activeEntries) {
    const d = toUtcDate(entry.date);
    const m = format(d, "MMMM yyyy");
    if (!byMonth.has(m)) byMonth.set(m, []);
    byMonth.get(m)!.push(entry);
  }

  const handleCopyAll = async () => {
    const text = copyDatesGrouped(schedule);
    const res = await copyToClipboard(text);
    if (res.ok) onCopySuccess();
  };

  const handleCopyMonth = async (monthEntries: ScheduleEntry[]) => {
    const text = copyDatesGrouped(monthEntries);
    const res = await copyToClipboard(text);
    if (res.ok) onCopySuccess();
  };

  return (
    <div className="rounded-2xl bg-gf-surface border border-gf-border p-6 shadow-sm flex flex-col gap-6">
      <div className="flex items-center justify-between pb-4 border-b border-gf-border">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gf-level-3" />
          <h3 className="text-base font-bold text-gf-text">Active Days</h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-gf-surface-raised border border-gf-border font-mono text-gf-text-muted">
            {activeEntries.length} total
          </span>
        </div>

        <button
          onClick={handleCopyAll}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gf-surface-raised border border-gf-border text-gf-text hover:bg-gf-surface hover:border-gf-text-muted transition-colors"
        >
          <Copy className="w-3.5 h-3.5" />
          <span>Copy Dates</span>
        </button>
      </div>

      {/* Month sections */}
      <div className="flex flex-col gap-6 max-h-[460px] overflow-y-auto pr-2 custom-scrollbar">
        {Array.from(byMonth.entries()).map(([monthName, entries]) => (
          <div key={monthName} className="flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gf-text">
                {monthName}{" "}
                <span className="text-xs font-normal text-gf-text-muted">
                  ({entries.length})
                </span>
              </span>
              <button
                onClick={() => handleCopyMonth(entries)}
                className="text-[11px] text-gf-text-muted hover:text-gf-text flex items-center gap-1"
                aria-label={`Copy dates for ${monthName}`}
              >
                <Copy className="w-3 h-3" />
                <span>Copy month</span>
              </button>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {entries.map((entry) => {
                const d = toUtcDate(entry.date);
                const dayLabel = format(d, "d MMM");
                const weekdayShort = format(d, "EEE");
                const isSelected = selectedDate === entry.date;
                const isPast = entry.status === "past";

                return (
                  <button
                    key={entry.date}
                    onClick={() => onSelectDate(entry.date)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-mono transition-all flex items-center gap-1.5 border ${
                      isSelected
                        ? "bg-gf-surface-raised border-gf-focus text-gf-text ring-1 ring-gf-focus font-bold"
                        : isPast
                        ? "bg-gf-surface/40 border-gf-border/60 text-gf-text-muted/70 hover:border-gf-border"
                        : "bg-gf-surface border-gf-border text-gf-text hover:bg-gf-surface-raised hover:border-gf-text-muted/50"
                    }`}
                  >
                    <span>{dayLabel}</span>
                    <span className="text-[10px] text-gf-text-muted uppercase">
                      {weekdayShort}
                    </span>
                    {isPast && (
                      <span className="text-[9px] px-1 py-0.2 rounded bg-gf-surface-raised text-gf-text-muted uppercase">
                        past
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
