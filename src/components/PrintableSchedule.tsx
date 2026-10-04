import { Plan } from "../types/schedule";
import { PrintOptions, PrintDocument } from "../types/calendar";
import { preparePrintableCalendar } from "../utils/exportUtils";

export interface PrintableScheduleProps {
  plan: Plan;
  options: PrintOptions;
}

export function PrintableSchedule({ plan, options }: PrintableScheduleProps) {
  const doc: PrintDocument = preparePrintableCalendar(plan.schedule, plan, options);
  const weekdays =
    options.firstWeekday === 1
      ? ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"]
      : ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];

  return (
    <div className="printable-document bg-white text-black font-sans">
      {doc.pages.map((pageRows, pageIdx) => (
        <section
          key={pageIdx}
          className="print-sheet max-w-[210mm] mx-auto p-8 mb-8 border border-gray-300 print:border-none print:m-0 print:p-0"
        >
          {/* Header on Page 1 */}
          {pageIdx === 0 && (
            <header className="border-b-2 border-black pb-4 mb-6">
              <div className="flex items-start justify-between">
                <div>
                  <h1 className="text-2xl font-bold tracking-tight text-black">
                    {doc.title}
                  </h1>
                  <p className="text-sm font-semibold text-gray-700">{doc.subtitle}</p>
                </div>
                <div className="text-right text-xs font-mono text-gray-600">
                  <span>Page 1 of {doc.pages.length}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-4 pt-3 border-t border-gray-300 text-xs">
                <div>
                  <span className="text-gray-500 block uppercase">Pattern</span>
                  <strong className="text-sm text-black">{doc.pattern}</strong>
                </div>
                <div>
                  <span className="text-gray-500 block uppercase">Platform</span>
                  <strong className="text-sm text-black">{doc.platform}</strong>
                </div>
                <div>
                  <span className="text-gray-500 block uppercase">Date Range</span>
                  <strong className="text-black">{doc.dateRange}</strong>
                </div>
                <div>
                  <span className="text-gray-500 block uppercase">Summary</span>
                  <strong className="text-black">{doc.summaryLine}</strong>
                </div>
              </div>

              {/* Vector Contribution Graph Strip */}
              {doc.graphStrip && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="text-[10px] uppercase tracking-wider text-gray-500 font-bold mb-2">
                    Contribution Graph Strip
                  </div>
                  <div className="overflow-x-auto pb-1">
                    <svg
                      width={doc.graphStrip.cols * 7}
                      height={7 * 7}
                      className="block"
                    >
                      {Array.from({ length: doc.graphStrip.cols }).map((_, c) =>
                        Array.from({ length: 7 }).map((__, r) => {
                          const lvl =
                            doc.graphStrip!.levels[r * doc.graphStrip!.cols + c];
                          return (
                            <rect
                              key={`strip-${c}-${r}`}
                              x={c * 7}
                              y={r * 7}
                              width={5.5}
                              height={5.5}
                              rx={1}
                              ry={1}
                              fill={lvl > 0 ? "#000000" : "#e5e5e5"}
                            />
                          );
                        })
                      )}
                    </svg>
                  </div>
                </div>
              )}
            </header>
          )}

          {/* Continuation page header */}
          {pageIdx > 0 && (
            <div className="flex items-center justify-between pb-3 border-b border-black mb-6 text-xs font-mono">
              <span>
                GlyphForge: <strong>{doc.pattern}</strong> ({doc.platform})
              </span>
              <span>
                Page {pageIdx + 1} of {doc.pages.length}
              </span>
            </div>
          )}

          {/* Month Blocks */}
          <div className="flex flex-col gap-6">
            {pageRows.map((rowMonths, rIdx) => (
              <div
                key={rIdx}
                className={`grid gap-6 ${
                  options.orientation === "landscape" ? "grid-cols-3" : "grid-cols-1"
                }`}
              >
                {rowMonths.map((mPlan) => (
                  <div
                    key={mPlan.key}
                    className="print-month border border-gray-400 p-4 rounded-lg bg-white"
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-gray-300 mb-2">
                      <h3 className="font-bold text-sm tracking-wide uppercase">
                        {mPlan.label}
                      </h3>
                      <span className="text-xs font-mono text-gray-600">
                        {mPlan.activeCount} active day{mPlan.activeCount !== 1 ? "s" : ""}
                      </span>
                    </div>

                    {/* Weekday headers */}
                    <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-gray-700 mb-1">
                      {weekdays.map((w) => (
                        <div key={w} className="py-0.5">
                          {w}
                        </div>
                      ))}
                    </div>

                    {/* Calendar Days */}
                    <div className="grid grid-cols-7 gap-1">
                      {mPlan.weeks.flat().map((day) => {
                        const dayNum = parseInt(day.date.slice(8), 10);

                        if (!day.inMonth) {
                          return (
                            <div
                              key={day.date}
                              className="h-10 border border-transparent p-1 text-[10px] text-gray-300 select-none"
                            >
                              {dayNum}
                            </div>
                          );
                        }

                        const isActive = day.active;
                        const isShaded = options.markerStyle === "shaded_symbol";
                        const isCheckbox = options.markerStyle === "checkbox";

                        return (
                          <div
                            key={day.date}
                            className={`h-10 p-1 rounded text-[11px] font-mono flex flex-col justify-between border ${
                              isActive
                                ? `print-day--active ${
                                    isShaded ? "bg-[#d9d9d9]" : "bg-white"
                                  } border-black font-bold`
                                : "border-gray-200 text-gray-700 bg-white"
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <span className={isActive ? "font-extrabold" : ""}>
                                {dayNum}
                              </span>
                              {isActive ? (
                                <span className="text-[10px]">
                                  {isCheckbox ? "☐" : "■"}
                                </span>
                              ) : options.showInactiveMarkers ? (
                                <span className="text-[9px] text-gray-300">□</span>
                              ) : null}
                            </div>

                            {isActive && (
                              <div className="text-[9px] font-bold text-right">
                                {day.required}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Footer on Last Page */}
          {pageIdx === doc.pages.length - 1 && (
            <footer className="mt-8 pt-4 border-t-2 border-black text-xs text-gray-600 flex flex-col gap-2">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <span className="font-bold text-black">Legend:</span>
                  {doc.legend.map((leg, lIdx) => (
                    <span key={lIdx} className="flex items-center gap-1.5">
                      <strong>{leg.marker}</strong> {leg.label}
                    </span>
                  ))}
                </div>
                <span>{doc.footer}</span>
              </div>
              {doc.tzNote && <p className="text-[10px] text-gray-500 italic">{doc.tzNote}</p>}
            </footer>
          )}
        </section>
      ))}
    </div>
  );
}
