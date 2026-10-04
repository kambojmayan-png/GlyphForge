import { useState, useRef } from "react";
import { ZoomIn, ZoomOut, X } from "lucide-react";
import { PatternMatrix, IsoDate } from "../types/pattern";
import { ScheduleEntry } from "../types/schedule";
import { formatDateFull, formatDatePretty } from "../utils/dateUtils";

export interface ContributionGraphProps {
  matrix: PatternMatrix;
  schedule: ScheduleEntry[];
  selectedDate: IsoDate | null;
  onSelectDate: (date: IsoDate | null) => void;
  staggerAnimation?: boolean;
}

export function ContributionGraph({
  matrix,
  schedule,
  selectedDate,
  onSelectDate,
  staggerAnimation = false,
}: ContributionGraphProps) {
  const [cellSize, setCellSize] = useState(14);
  const [hoveredEntry, setHoveredEntry] = useState<ScheduleEntry | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const [focusedCell, setFocusedCell] = useState<{ col: number; row: number }>({
    col: 0,
    row: 0,
  });

  const cellGap = 3;
  const cols = matrix.cols;
  const rows = 7;

  // Map dates for fast cell lookup
  const entryByCoord = new Map<string, ScheduleEntry>();
  for (const entry of schedule) {
    entryByCoord.set(`${entry.pixelColumn}-${entry.pixelRow}`, entry);
  }

  // Stagger cap: min(24, 800 / cols)
  const staggerMs = Math.min(24, Math.max(5, 800 / cols));

  // Compute month label positions
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

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
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
        return;
      default:
        return;
    }

    setFocusedCell({ col, row });
    const focusedEntry = entryByCoord.get(`${col}-${row}`);
    if (focusedEntry) {
      setHoveredEntry(focusedEntry);
    }
  };

  const handleCellHover = (
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
  };

  const svgWidth = cols * (cellSize + cellGap);
  const svgHeight = rows * (cellSize + cellGap) + 24; // 24 for month labels

  const pinnedEntry = selectedDate
    ? schedule.find((e) => e.date === selectedDate)
    : null;

  return (
    <div className="flex flex-col gap-4">
      {/* Top Bar: Zoom Controls & Legend */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-gf-text">Contribution Graph</span>
          <span className="text-xs font-mono text-gf-text-muted">
            ({cols} weeks × 7 days)
          </span>
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
              onClick={() => setCellSize((s) => Math.min(20, s + 2))}
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
        className="relative rounded-2xl bg-gf-surface border border-gf-border p-6 shadow-sm overflow-hidden"
      >
        <div
          tabIndex={0}
          role="grid"
          aria-label="Contribution grid"
          onKeyDown={handleKeyDown}
          className="focus:outline-none flex gap-3 overflow-x-auto custom-scrollbar pb-3"
        >
          {/* Sticky Weekday Labels (alternate rows: Mon, Wed, Fri) */}
          <div
            className="sticky left-0 z-20 flex flex-col justify-between pt-6 text-[10px] font-mono text-gf-text-muted bg-gf-surface pr-2 select-none"
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
                fill="var(--gf-text-muted)"
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
                      onMouseEnter={(e) => handleCellHover(entry, e)}
                      onMouseLeave={() => setHoveredEntry(null)}
                      onClick={() => entry && onSelectDate(entry.date)}
                    />
                  );
                })}
              </g>
            ))}
          </svg>
        </div>

        {/* Floating Tooltip */}
        {hoveredEntry && tooltipPos && (
          <div
            role="tooltip"
            className="absolute z-30 pointer-events-none rounded-xl bg-gf-surface-raised border border-gf-border p-3 text-xs text-gf-text shadow-floating transition-all duration-100 flex flex-col gap-1 -translate-x-1/2 -translate-y-full mb-2"
            style={{
              left: `${tooltipPos.x}px`,
              top: `${tooltipPos.y - 8}px`,
            }}
          >
            <div className="font-semibold text-gf-text">
              {formatDateFull(hoveredEntry.date)}
            </div>
            <div className="flex items-center gap-2">
              <span
                className={`w-2 h-2 rounded-full ${
                  hoveredEntry.active ? "bg-gf-level-3" : "bg-gf-level-0"
                }`}
              />
              <span className="font-medium">
                {hoveredEntry.active
                  ? `Active day · ${hoveredEntry.required} contribution${
                      hoveredEntry.required > 1 ? "s" : ""
                    } required`
                  : "No contribution required"}
              </span>
            </div>
            <div className="text-[11px] text-gf-text-muted font-mono">
              Col {hoveredEntry.pixelColumn + 1} of {cols}, row {hoveredEntry.pixelRow + 1} of 7
            </div>
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
              {" • "}
              <span className="font-mono">
                Column {pinnedEntry.pixelColumn + 1} of {cols}, Row {pinnedEntry.pixelRow + 1}
              </span>
              {pinnedEntry.glyph.cluster && (
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
