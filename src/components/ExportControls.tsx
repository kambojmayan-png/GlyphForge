import { useState } from "react";
import {
  Copy,
  FileSpreadsheet,
  Download,
  Printer,
  FileText,
  Check,
} from "lucide-react";
import { Plan } from "../types/schedule";
import { PrintOptions } from "../types/calendar";
import {
  copyDatesGrouped,
  copyScheduleAsText,
  copyToClipboard,
  exportScheduleToCSV,
  downloadFile,
  getExportFilename,
  downloadPatternAsPNG,
} from "../utils/exportUtils";
import { Dialog } from "./ui/Dialog";
import { Button } from "./ui/Button";

export interface ExportControlsProps {
  plan: Plan;
  onToast: (msg: string, type?: "success" | "warning" | "error" | "info") => void;
}

const DEFAULT_PRINT_OPTIONS: PrintOptions = {
  paper: "A4",
  orientation: "portrait",
  markerStyle: "shaded_symbol",
  firstWeekday: 1,
  includeGraphStrip: true,
  showInactiveMarkers: true,
  rowMm: 14,
};

export function ExportControls({ plan, onToast }: ExportControlsProps) {
  const [copiedDates, setCopiedDates] = useState(false);
  const [copiedSchedule, setCopiedSchedule] = useState(false);
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [printOptions, setPrintOptions] = useState<PrintOptions>(DEFAULT_PRINT_OPTIONS);

  // Copy Dates
  const handleCopyDates = async () => {
    const text = copyDatesGrouped(plan.schedule);
    const res = await copyToClipboard(text);
    if (res.ok) {
      setCopiedDates(true);
      onToast("Copied!", "success");
      setTimeout(() => setCopiedDates(false), 1500);
    } else {
      onToast(res.message, "error");
    }
  };

  // Copy schedule as text
  const handleCopySchedule = async () => {
    const text = copyScheduleAsText(plan);
    const res = await copyToClipboard(text);
    if (res.ok) {
      setCopiedSchedule(true);
      onToast("Schedule copied to clipboard!", "success");
      setTimeout(() => setCopiedSchedule(false), 1500);
    } else {
      onToast(res.message, "error");
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    const csv = exportScheduleToCSV(plan.schedule, {
      activeOnly: false,
      extra: true,
      bom: true,
      platform: plan.summary.platformId,
    });
    const filename = getExportFilename(plan, "csv");
    downloadFile(csv, filename, "text/csv;charset=utf-8;");
    onToast(`Downloaded ${filename}.`, "success");
  };

  // Download PNG
  const handleDownloadPNG = async () => {
    const res = await downloadPatternAsPNG(plan, {
      theme: "dark",
      includeLabels: true,
      includeLegend: true,
    });
    if (res.ok) {
      onToast(res.message, "success");
    } else {
      onToast(res.message, "error");
    }
  };

  // Print execution
  const handleTriggerPrint = () => {
    // Inject dynamic @page rule for paper and orientation
    let styleEl = document.getElementById("gf-page-style") as HTMLStyleElement;
    if (!styleEl) {
      styleEl = document.createElement("style");
      styleEl.id = "gf-page-style";
      document.head.appendChild(styleEl);
    }
    styleEl.textContent = `@page { size: ${printOptions.paper} ${printOptions.orientation}; margin: 14mm; }`;

    const prevTitle = document.title;
    document.title = `GlyphForge – ${plan.summary.input} – ${plan.summary.start} to ${plan.summary.end}`;

    window.print();

    window.addEventListener(
      "afterprint",
      () => {
        document.title = prevTitle;
      },
      { once: true }
    );
  };

  return (
    <>
      <div className="sticky bottom-0 z-30 w-full bg-gf-surface/95 backdrop-blur border-t border-gf-border shadow-floating p-4">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-gf-text-muted">
              Exports:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Copy Dates */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopyDates}
              aria-label="Copy active dates to clipboard"
            >
              {copiedDates ? (
                <>
                  <Check className="w-3.5 h-3.5 text-gf-level-3" />
                  <span className="text-gf-level-3 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Dates</span>
                </>
              )}
            </Button>

            {/* Copy Schedule */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopySchedule}
              aria-label="Copy full schedule as text"
            >
              {copiedSchedule ? (
                <>
                  <Check className="w-3.5 h-3.5 text-gf-level-3" />
                  <span className="text-gf-level-3 font-semibold">Copied!</span>
                </>
              ) : (
                <>
                  <FileText className="w-3.5 h-3.5" />
                  <span>Copy schedule</span>
                </>
              )}
            </Button>

            {/* Export CSV */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleExportCSV}
              aria-label="Export schedule to CSV file"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </Button>

            {/* Download PNG */}
            <Button
              variant="secondary"
              size="sm"
              onClick={handleDownloadPNG}
              aria-label="Download pattern image as PNG"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PNG</span>
            </Button>

            {/* Print / Save as PDF */}
            <Button
              variant="primary"
              size="sm"
              onClick={() => setPrintDialogOpen(true)}
              aria-label="Print or save schedule as PDF"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print / Save as PDF</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Print Options & Preview Dialog */}
      <Dialog
        open={printDialogOpen}
        onClose={() => setPrintDialogOpen(false)}
        title="Printable Calendar Options"
      >
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-4 text-xs">
            {/* Paper Size */}
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-gf-text">Paper Size</label>
              <select
                value={printOptions.paper}
                onChange={(e) =>
                  setPrintOptions({ ...printOptions, paper: e.target.value as "A4" | "Letter" })
                }
                className="rounded-lg bg-gf-surface border border-gf-border p-2 text-gf-text"
              >
                <option value="A4">A4 (210 × 297 mm)</option>
                <option value="Letter">Letter (8.5 × 11 in)</option>
              </select>
            </div>

            {/* Orientation */}
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-gf-text">Orientation</label>
              <select
                value={printOptions.orientation}
                onChange={(e) =>
                  setPrintOptions({
                    ...printOptions,
                    orientation: e.target.value as "portrait" | "landscape",
                  })
                }
                className="rounded-lg bg-gf-surface border border-gf-border p-2 text-gf-text"
              >
                <option value="portrait">Portrait</option>
                <option value="landscape">Landscape</option>
              </select>
            </div>

            {/* Marker Style */}
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-gf-text">Marker Style</label>
              <select
                value={printOptions.markerStyle}
                onChange={(e) =>
                  setPrintOptions({
                    ...printOptions,
                    markerStyle: e.target.value as any,
                  })
                }
                className="rounded-lg bg-gf-surface border border-gf-border p-2 text-gf-text"
              >
                <option value="shaded_symbol">Shaded + symbol (■)</option>
                <option value="symbol_only">Symbol only (■)</option>
                <option value="checkbox">Checkbox (☐)</option>
              </select>
            </div>

            {/* First Weekday */}
            <div className="flex flex-col gap-1.5">
              <label className="font-semibold text-gf-text">First Weekday</label>
              <select
                value={printOptions.firstWeekday}
                onChange={(e) =>
                  setPrintOptions({
                    ...printOptions,
                    firstWeekday: parseInt(e.target.value, 10) as 0 | 1,
                  })
                }
                className="rounded-lg bg-gf-surface border border-gf-border p-2 text-gf-text"
              >
                <option value={1}>Monday</option>
                <option value={0}>Sunday</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-xs border-t border-gf-border pt-3">
            <label className="flex items-center gap-2 cursor-pointer text-gf-text">
              <input
                type="checkbox"
                checked={printOptions.includeGraphStrip}
                onChange={(e) =>
                  setPrintOptions({ ...printOptions, includeGraphStrip: e.target.checked })
                }
                className="rounded accent-gf-level-3"
              />
              <span>Include graph strip</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-gf-text">
              <input
                type="checkbox"
                checked={printOptions.showInactiveMarkers}
                onChange={(e) =>
                  setPrintOptions({
                    ...printOptions,
                    showInactiveMarkers: e.target.checked,
                  })
                }
                className="rounded accent-gf-level-3"
              />
              <span>Show inactive-day markers (□)</span>
            </label>
          </div>

          <p className="text-[11px] text-gf-text-muted italic bg-gf-surface-raised p-2.5 rounded-lg border border-gf-border">
            Tip: In the browser print dialog, select "Save as PDF" to save a PDF file, or
            send directly to your printer.
          </p>

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="secondary" onClick={() => setPrintDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                setPrintDialogOpen(false);
                setTimeout(handleTriggerPrint, 200);
              }}
            >
              <Printer className="w-4 h-4 mr-2" />
              <span>Print Now</span>
            </Button>
          </div>
        </div>
      </Dialog>
    </>
  );
}
