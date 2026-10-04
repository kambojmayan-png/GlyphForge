import { useState, useRef, useEffect, useMemo } from "react";
import { ZoomIn, ZoomOut, X, Info, LayoutGrid, Calendar as CalendarIcon } from "lucide-react";
import { PatternMatrix, IsoDate, PlatformId } from "../types/pattern";
import { ScheduleEntry, PlanSummary } from "../types/schedule";
import { formatDateFull, formatDatePretty, diffDaysIso } from "../utils/dateUtils";

export interface ContributionGraphProps {
  matrix: PatternMatrix;
  schedule: ScheduleEntry[];
  selectedDate: IsoDate | null;
  onSelectDate: (date: IsoDate | null) => void;
  staggerAnimation?: boolean;
  platform?: PlatformId;
  summary?: PlanSummary;
}

interface MonthGridDay {
  date: IsoDate;
  dayOfMonth: number;
  dayOfWeek: number; // 0 = Sunday, ..., 6 = Saturday
  col: number;
  row: number;
  inMonth: boolean;
  entry?: ScheduleEntry;
  level: number;
  required: number;
}

interface LeetCodeMonthBlock {
  year: number;
  month: number;
  shortLabel: string;
  fullLabel: string;
  cols: number;
  cells: (MonthGridDay | null)[][];
  totalSubmissions: number;
  activeDays: number;
}

function computeStreakForDates(activeDates: string[]): number {
  if (activeDates.length === 0) return 0;
  const sorted = Array.from(new Set(activeDates)).sort();
  let max = 1;
  let cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = diffDaysIso(sorted[i], sorted[i - 1]);
    if (diff === 1) {
      cur++;
      if (cur > max) max = cur;
    } else if (diff > 1) {
      cur = 1;
    }
  }
  return max;
}

function buildMonthBlock(
  year: number,
  month: number,
  entryByDate: Map<string, ScheduleEntry>
): LeetCodeMonthBlock {
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const startWeekday = firstDay.getUTCDay(); // 0=Sun .. 6=Sat
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const totalSlots = startWeekday + daysInMonth;
  const cols = Math.ceil(totalSlots / 7);

  const cells: (MonthGridDay | null)[][] = [];
  let totalSubmissions = 0;
  let activeDays = 0;

  for (let c = 0; c < cols; c++) {
    const colCells: (MonthGridDay | null)[] = [];
    for (let r = 0; r < 7; r++) {
      const slotIndex = c * 7 + r;
      const dayNum = slotIndex - startWeekday + 1;

      if (dayNum >= 1 && dayNum <= daysInMonth) {
        const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(dayNum).padStart(2, "0")}`;
        const entry = entryByDate.get(dateStr);
        const level = entry ? entry.level : 0;
        const required = entry ? entry.required : 0;

        if (required > 0) {
          totalSubmissions += required;
        }
        if (level > 0) {
          activeDays++;
        }

        colCells.push({
          date: dateStr,
          dayOfMonth: dayNum,
          dayOfWeek: r,
          col: c,
          row: r,
          inMonth: true,
          entry,
          level,
          required,
        });
      } else {
        colCells.push(null);
      }
    }
    cells.push(colCells);
  }

  const shortLabel = firstDay.toLocaleString("en-US", { month: "short", timeZone: "UTC" });
  const fullLabel = firstDay.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });

  return {
    year,
    month,
    shortLabel,
    fullLabel,
    cols,
    cells,
    totalSubmissions,
    activeDays,
  };
}

export function ContributionGraph({
  matrix,
  schedule,
  selectedDate,
  onSelectDate,
  staggerAnimation = false,
  platform = "github",
  summary: _summary,
}: ContributionGraphProps) {
  const [viewMode, setViewMode] = useState<"continuous" | "leetcode">(
    platform === "leetcode" ? "leetcode" : "continuous"
  );
  const [cellSize, setCellSize] = useState(platform === "leetcode" ? 12 : 14);
  const [hoveredEntry, setHoveredEntry] = useState<ScheduleEntry | null>(null);
  const [hoveredDateInfo, setHoveredDateInfo] = useState<{
    date: IsoDate;
    active: boolean;
    required: number;
    col: number;
    row: number;
    monthName?: string;
  } | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [showInfoPopover, setShowInfoPopover] = useState(false);

  // Sync default view mode if user explicitly switches platforms
  useEffect(() => {
    if (platform === "leetcode") {
      setViewMode("leetcode");
    }
  }, [platform]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [focusedCell, setFocusedCell] = useState<{ col: number; row: number }>({
    col: 0,
    row: 0,
  });

  const cellGap = 3;
  const cols = matrix.cols;
  const rows = 7;

  // Map dates for fast cell lookup
  const entryByCoord = useMemo(() => {
    const map = new Map<string, ScheduleEntry>();
    for (const entry of schedule) {
      map.set(`${entry.pixelColumn}-${entry.pixelRow}`, entry);
    }
    return map;
  }, [schedule]);

  const entryByDate = useMemo(() => {
    const map = new Map<string, ScheduleEntry>();
    for (const entry of schedule) {
      map.set(entry.date, entry);
    }
    return map;
  }, [schedule]);

  // Determine available years for LeetCode annual switcher
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    const currentYear = new Date().getUTCFullYear();
    years.add(currentYear);
    years.add(currentYear - 1);

    for (const entry of schedule) {
      const y = parseInt(entry.date.slice(0, 4), 10);
      if (!isNaN(y)) years.add(y);
    }

    return Array.from(years).sort((a, b) => b - a);
  }, [schedule]);

  // Year selection state for LeetCode view: "past1Year" | "2026" | "2027", etc.
  const [selectedYear, setSelectedYear] = useState<string>("past1Year");

  // Build the 12 month blocks based on year selection
  const leetCodeMonthBlocks = useMemo(() => {
    if (selectedYear === "past1Year") {
      // 12 trailing months ending at the latest schedule month or current month
      let anchorDate = new Date();
      if (schedule.length > 0) {
        const lastEntryDate = schedule[schedule.length - 1].date;
        const lastEntryTime = new Date(`${lastEntryDate}T00:00:00Z`);
        if (lastEntryTime > anchorDate) {
          anchorDate = lastEntryTime;
        }
      }

      const anchorYear = anchorDate.getUTCFullYear();
      const anchorMonth = anchorDate.getUTCMonth() + 1;

      const blocks: LeetCodeMonthBlock[] = [];
      for (let i = 11; i >= 0; i--) {
        const targetDate = new Date(Date.UTC(anchorYear, anchorMonth - 1 - i, 1));
        const y = targetDate.getUTCFullYear();
        const m = targetDate.getUTCMonth() + 1;
        blocks.push(buildMonthBlock(y, m, entryByDate));
      }
      return blocks;
    } else {
      // Specific calendar year: Jan to Dec of that year
      const y = parseInt(selectedYear, 10);
      const blocks: LeetCodeMonthBlock[] = [];
      for (let m = 1; m <= 12; m++) {
        blocks.push(buildMonthBlock(y, m, entryByDate));
      }
      return blocks;
    }
  }, [selectedYear, schedule, entryByDate]);

  // Calculate annual stats for the LeetCode view
  const leetCodeStats = useMemo(() => {
    let totalSubmissions = 0;
    const activeDates: string[] = [];

    for (const block of leetCodeMonthBlocks) {
      totalSubmissions += block.totalSubmissions;
      for (const col of block.cells) {
        for (const cell of col) {
          if (cell && cell.level > 0) {
            activeDates.push(cell.date);
          }
        }
      }
    }

    const activeDays = activeDates.length;
    const maxStreak = computeStreakForDates(activeDates);

    return {
      totalSubmissions,
      activeDays,
      maxStreak,
    };
  }, [leetCodeMonthBlocks]);

  // Stagger cap: min(24, 800 / cols)
  const staggerMs = Math.min(24, Math.max(5, 800 / cols));

  // Compute month label positions for continuous graph
  const monthLabels: { label: string; col: number }[] = [];
  let lastMonth = "";
  for (let c = 0; c < cols; c++) {
    const entry = entryByCoord.get(`${c}-0`);
    if (entry && entry.month !== lastMonth) {
      lastMonth = entry.month;
      const monthName = new Date(`${entry.date}T00:00:00Z`).toLocaleString("en-US", {
        month: "short",
        timeZone: "UTC",
      });
      monthLabels.push({ label: monthName, col: c });
    }
  }

  // Keyboard navigation for continuous graph
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (viewMode !== "continuous") return;
    let { col, row } = focusedCell;

    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        row = Math.max(0, row - 1);
        break;
      case "ArrowDown":
        e.preventDefault();
        row = Math.min(6, row + 1);
        break;
      case "ArrowLeft":
        e.preventDefault();
        col = Math.max(0, col - 1);
        break;
      case "ArrowRight":
        e.preventDefault();
        col = Math.min(cols - 1, col + 1);
        break;
      case "Home":
        e.preventDefault();
        col = 0;
        break;
      case "End":
        e.preventDefault();
        col = cols - 1;
        break;
      case "PageUp":
        e.preventDefault();
        col = Math.max(0, col - 4);
        break;
      case "PageDown":
        e.preventDefault();
        col = Math.min(cols - 1, col + 4);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        const entry = entryByCoord.get(`${col}-${row}`);
        if (entry) {
          onSelectDate(selectedDate === entry.date ? null : entry.date);
        }
        return;
      case "Escape":
        e.preventDefault();
        onSelectDate(null);
        setHoveredEntry(null);
        setHoveredDateInfo(null);
        return;
      default:
        return;
    }

    setFocusedCell({ col, row });
    const focusedEntry = entryByCoord.get(`${col}-${row}`);
    if (focusedEntry) {
      setHoveredEntry(focusedEntry);
      setHoveredDateInfo(null);
    }
  };

  const handleContinuousCellHover = (
    entry: ScheduleEntry | undefined,
    e: React.MouseEvent<SVGRectElement>
  ) => {
    if (!entry) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const parentRect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
    setTooltipPos({
      x: rect.left - parentRect.left + rect.width / 2,
      y: rect.top - parentRect.top,
    });
    setHoveredEntry(entry);
    setHoveredDateInfo(null);
  };

  const handleLeetCodeCellHover = (
    day: MonthGridDay,
    monthLabel: string,
    e: React.MouseEvent<HTMLElement>
  ) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const parentRect = containerRef.current?.getBoundingClientRect() || { left: 0, top: 0 };
    setTooltipPos({
      x: rect.left - parentRect.left + rect.width / 2,
      y: rect.top - parentRect.top,
    });
    if (day.entry) {
      setHoveredEntry(day.entry);
      setHoveredDateInfo(null);
    } else {
      setHoveredEntry(null);
      setHoveredDateInfo({
        date: day.date,
        active: day.level > 0,
        required: day.required,
        col: day.col,
        row: day.row,
        monthName: monthLabel,
      });
    }
  };

  const svgWidth = cols * (cellSize + cellGap);
  const svgHeight = rows * (cellSize + cellGap) + 24;

  const pinnedEntry = selectedDate
    ? schedule.find((e) => e.date === selectedDate) || {
        date: selectedDate,
        dayOfWeek: new Date(`${selectedDate}T00:00:00Z`).toLocaleString("en-US", {
          weekday: "long",
          timeZone: "UTC",
        }),
        month: selectedDate.slice(0, 7),
        active: false,
        level: 0,
        required: 0,
        pixelRow: 0,
        pixelColumn: 0,
        status: "future" as const,
        glyph: {
          line: 0,
          clusterIndex: null,
          cluster: null,
          glyphColumn: null,
          glyphWidth: null,
        },
      }
    : null;

  const currentYearTitle =
    selectedYear === "past1Year"
      ? "the past one year"
      : selectedYear;

  return (
    <div className="flex flex-col gap-4">
      {/* Top Bar: View Mode Switcher, Zoom Controls & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gf-text">
              {viewMode === "leetcode" ? "LeetCode Submission Matrix" : "Contribution Graph"}
            </span>
            <span className="text-xs font-mono text-gf-text-muted">
              {viewMode === "leetcode"
                ? "(12 monthly blocks)"
                : `(${cols} weeks × 7 days)`}
            </span>
          </div>

          {/* View mode toggle */}
          <div className="inline-flex items-center p-0.5 rounded-lg bg-gf-surface-raised border border-gf-border text-xs">
            <button
              onClick={() => setViewMode("continuous")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                viewMode === "continuous"
                  ? "bg-gf-surface text-gf-text font-medium shadow-xs"
                  : "text-gf-text-muted hover:text-gf-text"
              }`}
              title="Continuous weekly strip (GitHub standard)"
            >
              <LayoutGrid className="w-3 h-3" />
              <span>Continuous</span>
            </button>
            <button
              onClick={() => setViewMode("leetcode")}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all ${
                viewMode === "leetcode"
                  ? "bg-gf-surface text-gf-text font-medium shadow-xs"
                  : "text-gf-text-muted hover:text-gf-text"
              }`}
              title="12 separated monthly blocks (LeetCode profile layout)"
            >
              <CalendarIcon className="w-3 h-3" />
              <span>LeetCode Monthly</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Zoom Control */}
          <div className="flex items-center gap-2 text-xs text-gf-text-muted">
            <button
              onClick={() => setCellSize((s) => Math.max(8, s - 2))}
              className="p-1 rounded hover:bg-gf-surface-raised hover:text-gf-text"
              aria-label="Zoom out cells"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="font-mono tabular-nums">{cellSize}px</span>
            <button
              onClick={() => setCellSize((s) => Math.min(22, s + 2))}
              className="p-1 rounded hover:bg-gf-surface-raised hover:text-gf-text"
              aria-label="Zoom in cells"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-1.5 text-xs text-gf-text-muted">
            <span>Less</span>
            {[0, 1, 2, 3, 4].map((l) => (
              <span
                key={l}
                className="w-3 h-3 rounded-[2px]"
                style={{
                  backgroundColor: `var(--gf-level-${l})`,
                }}
              />
            ))}
            <span>More</span>
          </div>
        </div>
      </div>

      {/* Main Graph Container */}
      <div
        ref={containerRef}
        className="relative rounded-2xl bg-[#1c1c1e] text-zinc-100 border border-gf-border p-6 shadow-sm overflow-hidden"
      >
        {/* LEETCODE AUTHENTIC SUBMISSION MATRIX VIEW */}
        {viewMode === "leetcode" ? (
          <div className="flex flex-col gap-6">
            {/* LeetCode Header Banner & Year Selector */}
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
              {/* Left: Submissions Count with Info popover */}
              <div className="flex items-center gap-2">
                <span className="text-lg sm:text-xl font-bold tracking-tight text-white">
                  <span className="font-mono tabular-nums">{leetCodeStats.totalSubmissions}</span> submissions in {currentYearTitle}
                </span>

                <div className="relative inline-flex items-center">
                  <button
                    type="button"
                    onClick={() => setShowInfoPopover(!showInfoPopover)}
                    onMouseEnter={() => setShowInfoPopover(true)}
                    onMouseLeave={() => setShowInfoPopover(false)}
                    className="text-zinc-400 hover:text-zinc-200 transition-colors p-0.5 rounded-full"
                    aria-label="Submission info"
                  >
                    <Info className="w-4 h-4" />
                  </button>

                  {showInfoPopover && (
                    <div className="absolute left-6 top-0 z-40 w-64 p-2.5 rounded-lg bg-zinc-900 border border-zinc-700 text-xs text-zinc-300 shadow-xl leading-relaxed animate-in fade-in">
                      Submissions recorded in this period across all LeetCode problem solving and contest activities.
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Active Days, Max Streak & Year Tabs */}
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs text-zinc-400">
                <div className="flex items-center gap-4">
                  <span>
                    Total active days:{" "}
                    <strong className="text-white font-mono font-semibold text-sm">
                      {leetCodeStats.activeDays}
                    </strong>
                  </span>
                  <span>
                    Max streak:{" "}
                    <strong className="text-white font-mono font-semibold text-sm">
                      {leetCodeStats.maxStreak}
                    </strong>
                  </span>
                </div>

                {/* Annual adjustment tabs */}
                <div className="flex items-center p-0.5 rounded-lg bg-zinc-900/90 border border-zinc-800">
                  <button
                    onClick={() => setSelectedYear("past1Year")}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                      selectedYear === "past1Year"
                        ? "bg-zinc-800 text-white shadow-xs"
                        : "text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    Past 1 Year
                  </button>
                  {availableYears.map((yr) => (
                    <button
                      key={yr}
                      onClick={() => setSelectedYear(String(yr))}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                        selectedYear === String(yr)
                          ? "bg-zinc-800 text-white shadow-xs"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {yr}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* 12 Monthly Chunked Grid (Matching LeetCode Layout) */}
            <div className="overflow-x-auto custom-scrollbar pb-3">
              <div className="flex items-start gap-4 lg:gap-5 justify-between min-w-max">
                {leetCodeMonthBlocks.map((block) => (
                  <div key={`${block.year}-${block.month}`} className="flex flex-col items-center">
                    {/* Month Matrix Grid: 7 rows tall, columns according to weeks */}
                    <div
                      className="grid gap-[3px]"
                      style={{
                        gridTemplateRows: `repeat(7, ${cellSize}px)`,
                        gridTemplateColumns: `repeat(${block.cols}, ${cellSize}px)`,
                        gridAutoFlow: "column",
                      }}
                    >
                      {block.cells.map((col, cIdx) =>
                        col.map((day, rIdx) => {
                          if (!day) {
                            return (
                              <div
                                key={`empty-${cIdx}-${rIdx}`}
                                style={{ width: `${cellSize}px`, height: `${cellSize}px` }}
                                className="pointer-events-none opacity-0"
                                aria-hidden="true"
                              />
                            );
                          }

                          const isSelected = selectedDate === day.date;
                          const hasSubmissions = day.required > 0 || day.level > 0;

                          return (
                            <button
                              key={day.date}
                              type="button"
                              onClick={() => onSelectDate(isSelected ? null : day.date)}
                              onMouseEnter={(e) => handleLeetCodeCellHover(day, block.shortLabel, e)}
                              onMouseLeave={() => {
                                setHoveredEntry(null);
                                setHoveredDateInfo(null);
                              }}
                              style={{
                                width: `${cellSize}px`,
                                height: `${cellSize}px`,
                                backgroundColor:
                                  day.level === 0
                                    ? "#2a2a2a"
                                    : `var(--gf-level-${day.level})`,
                              }}
                              className={`rounded-[2.5px] transition-transform duration-100 hover:scale-125 hover:z-20 focus:outline-none ${
                                isSelected ? "ring-2 ring-white ring-offset-1 ring-offset-zinc-900 z-10" : ""
                              } ${hasSubmissions ? "shadow-xs" : ""}`}
                              aria-label={`${formatDateFull(day.date)}: ${day.required} submissions`}
                            />
                          );
                        })
                      )}
                    </div>

                    {/* Month Label Underneath */}
                    <span className="text-[11px] font-medium text-zinc-400 mt-2 text-center select-none">
                      {block.shortLabel}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          /* CONTINUOUS WEEKLY STRIP VIEW (GITHUB / GENERIC) */
          <div
            tabIndex={0}
            role="grid"
            aria-label="Contribution grid"
            onKeyDown={handleKeyDown}
            className="focus:outline-none flex gap-3 overflow-x-auto custom-scrollbar pb-3"
          >
            {/* Sticky Weekday Labels (alternate rows: Mon, Wed, Fri) */}
            <div
              className="sticky left-0 z-20 flex flex-col justify-between pt-6 text-[10px] font-mono text-zinc-400 bg-[#1c1c1e] pr-2 select-none"
              style={{ height: rows * (cellSize + cellGap) + 24 }}
              aria-hidden="true"
            >
              <span style={{ height: cellSize }}>Mon</span>
              <span style={{ height: cellSize }}>Wed</span>
              <span style={{ height: cellSize }}>Fri</span>
            </div>

            {/* SVG Graph */}
            <svg
              width={svgWidth}
              height={svgHeight}
              className="shrink-0 overflow-visible"
              role="rowgroup"
            >
              {/* Month Labels */}
              {monthLabels.map((ml, idx) => (
                <text
                  key={idx}
                  x={ml.col * (cellSize + cellGap)}
                  y={14}
                  fill="#a1a1aa"
                  fontSize="11px"
                  fontFamily='"Geist", system-ui, sans-serif'
                  fontWeight="500"
                >
                  {ml.label}
                </text>
              ))}

              {/* Cells */}
              {Array.from({ length: cols }).map((_, c) => (
                <g key={`col-${c}`} role="row" style={{ "--i": c } as React.CSSProperties}>
                  {Array.from({ length: rows }).map((__, r) => {
                    const entry = entryByCoord.get(`${c}-${r}`);
                    const level = matrix.levels[r * cols + c];
                    const x = c * (cellSize + cellGap);
                    const y = 24 + r * (cellSize + cellGap);
                    const isSelected = selectedDate && entry?.date === selectedDate;
                    const isFocused = focusedCell.col === c && focusedCell.row === r;

                    const ariaLabel = entry
                      ? `${entry.dayOfWeek}, ${formatDatePretty(entry.date)}. ${
                          entry.active
                            ? `Active day, ${entry.required} contribution required.`
                            : "No contribution required."
                        } Column ${c + 1} of ${cols}, row ${r + 1} of 7.`
                      : "";

                    return (
                      <rect
                        key={`cell-${c}-${r}`}
                        role="gridcell"
                        aria-label={ariaLabel}
                        tabIndex={isFocused ? 0 : -1}
                        x={x}
                        y={y}
                        width={cellSize}
                        height={cellSize}
                        rx={3}
                        ry={3}
                        fill={`var(--gf-level-${level})`}
                        className={`gf-cell cursor-pointer ${
                          level > 0 ? "gf-cell--active" : ""
                        } ${isSelected ? "gf-cell--pinned" : ""} ${
                          staggerAnimation ? "animate-cell-sweep" : ""
                        }`}
                        style={
                          staggerAnimation
                            ? ({
                                "--stagger": `${staggerMs}ms`,
                                "--i": c,
                              } as React.CSSProperties)
                            : undefined
                        }
                        onMouseEnter={(e) => handleContinuousCellHover(entry, e)}
                        onMouseLeave={() => setHoveredEntry(null)}
                        onClick={() => entry && onSelectDate(entry.date)}
                      />
                    );
                  })}
                </g>
              ))}
            </svg>
          </div>
        )}

        {/* Floating Tooltip */}
        {(hoveredEntry || hoveredDateInfo) && tooltipPos && (
          <div
            role="tooltip"
            className="absolute z-30 pointer-events-none rounded-xl bg-zinc-900 border border-zinc-700 p-3 text-xs text-zinc-100 shadow-floating transition-all duration-100 flex flex-col gap-1 -translate-x-1/2 -translate-y-full mb-2"
            style={{
              left: `${tooltipPos.x}px`,
              top: `${tooltipPos.y - 8}px`,
            }}
          >
            {hoveredEntry ? (
              <>
                <div className="font-semibold text-white">
                  {formatDateFull(hoveredEntry.date)}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      hoveredEntry.active ? "bg-emerald-400" : "bg-zinc-600"
                    }`}
                  />
                  <span className="font-medium text-zinc-200">
                    {hoveredEntry.active
                      ? `Active day · ${hoveredEntry.required} contribution${
                          hoveredEntry.required > 1 ? "s" : ""
                        } required`
                      : "No contribution required"}
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 font-mono">
                  Col {hoveredEntry.pixelColumn + 1} of {cols}, row {hoveredEntry.pixelRow + 1} of 7
                </div>
              </>
            ) : hoveredDateInfo ? (
              <>
                <div className="font-semibold text-white">
                  {formatDateFull(hoveredDateInfo.date)}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      hoveredDateInfo.active ? "bg-emerald-400" : "bg-zinc-600"
                    }`}
                  />
                  <span className="font-medium text-zinc-200">
                    {hoveredDateInfo.active
                      ? `${hoveredDateInfo.required} submission${
                          hoveredDateInfo.required > 1 ? "s" : ""
                        } required`
                      : "No submissions recorded"}
                  </span>
                </div>
                {hoveredDateInfo.monthName && (
                  <div className="text-[11px] text-zinc-400">
                    {hoveredDateInfo.monthName} calendar block
                  </div>
                )}
              </>
            ) : null}
          </div>
        )}
      </div>

      {/* Pinned Selection Detail Card */}
      {pinnedEntry && (
        <div className="p-4 rounded-xl bg-gf-surface-raised border border-gf-focus/50 shadow-sm flex items-center justify-between animate-in fade-in duration-150">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-gf-text">
                {formatDateFull(pinnedEntry.date)}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full bg-gf-focus/15 text-gf-focus font-medium">
                Selected Cell
              </span>
            </div>
            <p className="text-xs text-gf-text-muted">
              {pinnedEntry.active
                ? `Required: ${pinnedEntry.required} contribution(s) on this date.`
                : "Inactive: No contributions needed on this date."}
              {pinnedEntry.glyph?.cluster && (
                <span>
                  {" • "}Origin: cluster "{pinnedEntry.glyph.cluster}"
                </span>
              )}
            </p>
          </div>
          <button
            onClick={() => onSelectDate(null)}
            className="p-1.5 rounded-lg text-gf-text-muted hover:text-gf-text hover:bg-gf-surface"
            aria-label="Clear selection"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
