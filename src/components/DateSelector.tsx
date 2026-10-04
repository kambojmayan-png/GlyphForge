import { StartMode, IsoDate } from "../types/pattern";
import { todayIso, formatDatePretty, nextWeekdayAfterIso } from "../utils/dateUtils";

export interface DateSelectorProps {
  startMode: StartMode;
  startDate?: IsoDate;
  preferredMonth?: { year: number; month: number };
  timeZone: string;
  platformWeekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6;
  onModeChange: (mode: StartMode) => void;
  onStartDateChange: (date: IsoDate) => void;
  onPreferredMonthChange: (pref: { year: number; month: number }) => void;
  resolvedExplanation?: string;
  error?: string;
}

export function DateSelector({
  startMode,
  startDate,
  preferredMonth,
  timeZone,
  platformWeekStartsOn,
  onModeChange,
  onStartDateChange,
  onPreferredMonthChange,
  resolvedExplanation,
  error,
}: DateSelectorProps) {
  const currentToday = todayIso(timeZone);
  const nowYear = parseInt(currentToday.slice(0, 4), 10);
  const nowMonth = parseInt(currentToday.slice(5, 7), 10);

  const currentPrefYear = preferredMonth?.year || nowYear;
  const currentPrefMonth = preferredMonth?.month || nowMonth;

  return (
    <div className="flex flex-col gap-3">
      <label className="text-sm font-semibold text-gf-text">Start Date Option</label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        <select
          value={startMode}
          onChange={(e) => onModeChange(e.target.value as StartMode)}
          className="rounded-xl bg-gf-surface border border-gf-border p-2.5 text-sm text-gf-text focus:border-gf-focus focus:outline-none"
        >
          <option value="nextFullWeek">Start next available full week</option>
          <option value="nextMonday">Start next Monday</option>
          <option value="custom">Custom start date</option>
          <option value="preferredMonth">Preferred month and year</option>
        </select>

        {/* Dynamic input depending on mode */}
        {startMode === "custom" && (
          <input
            type="date"
            value={startDate || currentToday}
            min="1970-01-01"
            max="2100-12-31"
            onChange={(e) => onStartDateChange(e.target.value)}
            className="rounded-xl bg-gf-surface border border-gf-border p-2 text-sm text-gf-text focus:border-gf-focus focus:outline-none font-mono"
          />
        )}

        {startMode === "preferredMonth" && (
          <div className="flex gap-2">
            <select
              value={currentPrefMonth}
              onChange={(e) =>
                onPreferredMonthChange({
                  year: currentPrefYear,
                  month: parseInt(e.target.value, 10),
                })
              }
              className="w-1/2 rounded-xl bg-gf-surface border border-gf-border p-2.5 text-sm text-gf-text focus:border-gf-focus focus:outline-none"
            >
              {[
                "Jan",
                "Feb",
                "Mar",
                "Apr",
                "May",
                "Jun",
                "Jul",
                "Aug",
                "Sep",
                "Oct",
                "Nov",
                "Dec",
              ].map((mName, idx) => (
                <option key={idx} value={idx + 1}>
                  {mName}
                </option>
              ))}
            </select>

            <select
              value={currentPrefYear}
              onChange={(e) =>
                onPreferredMonthChange({
                  year: parseInt(e.target.value, 10),
                  month: currentPrefMonth,
                })
              }
              className="w-1/2 rounded-xl bg-gf-surface border border-gf-border p-2.5 text-sm text-gf-text focus:border-gf-focus focus:outline-none font-mono"
            >
              {Array.from({ length: 10 }).map((_, i) => {
                const y = nowYear + i;
                return (
                  <option key={y} value={y}>
                    {y}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        {startMode === "nextMonday" && (
          <div className="flex items-center px-3 py-2 rounded-xl bg-gf-surface border border-gf-border text-xs text-gf-text-muted font-mono">
            {formatDatePretty(nextWeekdayAfterIso(currentToday, 1))}
          </div>
        )}

        {startMode === "nextFullWeek" && (
          <div className="flex items-center px-3 py-2 rounded-xl bg-gf-surface border border-gf-border text-xs text-gf-text-muted font-mono">
            {formatDatePretty(nextWeekdayAfterIso(currentToday, platformWeekStartsOn))}
          </div>
        )}
      </div>

      {error && <p className="text-xs text-gf-error font-medium">{error}</p>}

      {resolvedExplanation && (
        <p className="text-xs text-gf-text-muted bg-gf-surface/50 border border-gf-border/60 p-2.5 rounded-lg">
          {resolvedExplanation}
        </p>
      )}
    </div>
  );
}
