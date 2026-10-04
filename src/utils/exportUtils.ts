import { ScheduleEntry, Plan } from "../types/schedule";
import { PrintOptions, PrintDocument, MonthPlan } from "../types/calendar";
import { formatDatePretty, toUtcDate } from "./dateUtils";
import { toSlug } from "./textUtils";
import { format } from "date-fns";

export interface CsvExportOptions {
  activeOnly: boolean;
  extra: boolean;
  bom: boolean;
  platform: string;
}

export function copyDatesGrouped(schedule: ScheduleEntry[]): string {
  const active = schedule.filter((e) => e.active);
  if (active.length === 0) return "";

  const byMonth = new Map<string, string[]>();
  for (const entry of active) {
    const d = toUtcDate(entry.date);
    const monthTitle = format(d, "MMMM yyyy");
    const dayStr = format(d, "d MMM");

    if (!byMonth.has(monthTitle)) {
      byMonth.set(monthTitle, []);
    }
    byMonth.get(monthTitle)!.push(dayStr);
  }

  const sections: string[] = [];
  for (const [monthTitle, days] of byMonth.entries()) {
    sections.push(`${monthTitle}\n${days.join("\n")}`);
  }

  return sections.join("\n\n");
}

export function copyScheduleAsText(plan: Plan): string {
  const { summary, schedule } = plan;
  const active = schedule.filter((e) => e.active);

  const lines: string[] = [
    "GlyphForge activity plan",
    `Pattern: ${summary.input}`,
    `Platform: ${summary.platformLabel}`,
    `Period: ${formatDatePretty(summary.start)} – ${formatDatePretty(summary.end)} (${summary.weeks} weeks)`,
    `Active days: ${summary.activeDays} · Estimated contributions: ${summary.estimatedContributions}`,
    "",
  ];

  const byMonth = new Map<string, ScheduleEntry[]>();
  for (const entry of active) {
    const d = toUtcDate(entry.date);
    const m = format(d, "MMMM yyyy");
    if (!byMonth.has(m)) byMonth.set(m, []);
    byMonth.get(m)!.push(entry);
  }

  for (const [monthTitle, entries] of byMonth.entries()) {
    lines.push(`${monthTitle} (${entries.length} active days)`);
    for (const e of entries) {
      const d = toUtcDate(e.date);
      const dayFormatted = format(d, "EEE d MMM yyyy");
      const unit = e.required === 1 ? "contribution" : "contributions";
      lines.push(`${dayFormatted}: ${e.required} ${unit}`);
    }
    lines.push("");
  }

  return lines.join("\n").trim();
}

function csvCell(v: string | number | boolean): string {
  let t = String(v);
  // Formula injection guard
  if (typeof v === "string" && /^[=+\-@\t\r]/.test(t)) {
    t = "'" + t;
  }
  return /[",\r\n]/.test(t) ? `"${t.replaceAll('"', '""')}"` : t;
}

export function exportScheduleToCSV(
  schedule: ScheduleEntry[],
  options: CsvExportOptions
): string {
  const header = [
    "date",
    "day_of_week",
    "month",
    "active",
    "required_contribution",
    "platform",
    "pixel_row",
    "pixel_column",
    ...(options.extra ? ["status", "glyph"] : []),
  ];

  const rows = (options.activeOnly ? schedule.filter((e) => e.active) : schedule).map(
    (e) => [
      e.date,
      e.dayOfWeek,
      e.month,
      e.active,
      e.required,
      options.platform,
      e.pixelRow,
      e.pixelColumn,
      ...(options.extra ? [e.status, e.glyph.cluster ?? ""] : []),
    ]
  );

  const text = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n") + "\r\n";
  return (options.bom ? "\uFEFF" : "") + text;
}

export async function copyToClipboard(
  text: string
): Promise<{ ok: boolean; message: string; showSelectable?: string }> {
  // 1. Modern API
  if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return { ok: true, message: "Copied!" };
    } catch {
      // Fallback
    }
  }

  // 2. execCommand fallback
  if (typeof document !== "undefined") {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      const success = document.execCommand("copy");
      document.body.removeChild(textarea);
      if (success) {
        return { ok: true, message: "Copied!" };
      }
    } catch {
      // Fallback
    }
  }

  return {
    ok: false,
    message: "Couldn't copy automatically. The text is selected below so you can copy it yourself.",
    showSelectable: text,
  };
}

export function downloadFile(content: BlobPart, filename: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function getExportFilename(plan: Plan, ext: string): string {
  const slug = toSlug(plan.summary.input);
  return `glyphforge-${slug}-${plan.placement.origin}.${ext}`;
}

export async function downloadPatternAsPNG(
  plan: Plan,
  options: {
    theme: "dark" | "light" | "transparent";
    includeLabels: boolean;
    includeLegend: boolean;
  }
): Promise<{ ok: boolean; message: string }> {
  try {
    if (typeof document !== "undefined" && document.fonts) {
      await document.fonts.ready;
    }

    const { matrix, summary } = plan;
    const cols = matrix.cols;
    const rows = 7;

    const cell = 14;
    const gap = 3;
    const margin = 24;
    const topBarHeight = options.includeLabels ? 36 : 12;
    const bottomBarHeight = options.includeLegend ? 32 : 12;

    const graphWidth = cols * cell + (cols - 1) * gap;
    const graphHeight = rows * cell + (rows - 1) * gap;

    const width = graphWidth + margin * 2;
    const height = graphHeight + topBarHeight + bottomBarHeight + margin * 2;

    const canvas = document.createElement("canvas");
    canvas.width = width * 2; // 2x sharp
    canvas.height = height * 2;

    const ctx = canvas.getContext("2d");
    if (!ctx) return { ok: false, message: "Canvas 2D context unavailable." };

    ctx.scale(2, 2);

    // Background
    if (options.theme === "dark") {
      ctx.fillStyle = "#0a0f14";
      ctx.fillRect(0, 0, width, height);
    } else if (options.theme === "light") {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
    }

    // Palette
    const palette =
      options.theme === "light"
        ? {
            0: "#e3e8ed",
            1: "#4fae71",
            2: "#33965a",
            3: "#1f7740",
            4: "#115429",
            text: "#1f2328",
            muted: "#59636e",
          }
        : {
            0: "#202b36",
            1: "#2a8450",
            2: "#3fa96b",
            3: "#63cf8c",
            4: "#a3f0bd",
            text: "#e6edf3",
            muted: "#9aa7b4",
          };

    // Title / info
    if (options.includeLabels) {
      ctx.fillStyle = palette.text;
      ctx.font = '600 13px "Geist", system-ui, sans-serif';
      ctx.fillText(`GlyphForge – ${summary.input}`, margin, margin + 14);

      ctx.fillStyle = palette.muted;
      ctx.font = '400 11px "Geist", system-ui, sans-serif';
      ctx.fillText(
        `${summary.activeDays} active days · ${summary.weeks} weeks · ${summary.platformLabel}`,
        margin,
        margin + 28
      );
    }

    // Draw cells
    const startX = margin;
    const startY = margin + topBarHeight;

    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const lvl = matrix.levels[r * cols + c];
        const x = startX + c * (cell + gap);
        const y = startY + r * (cell + gap);

        ctx.fillStyle = palette[lvl as keyof typeof palette] || palette[0];
        // Rounded rect
        ctx.beginPath();
        const rad = 2.5;
        ctx.roundRect ? ctx.roundRect(x, y, cell, cell, rad) : ctx.rect(x, y, cell, cell);
        ctx.fill();

        if (lvl > 0 && options.theme !== "dark") {
          ctx.strokeStyle = "rgba(0,0,0,0.15)";
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }

    // Legend
    if (options.includeLegend) {
      const legendY = startY + graphHeight + 16;
      ctx.fillStyle = palette.muted;
      ctx.font = '400 11px "Geist", system-ui, sans-serif';
      ctx.fillText("Less", startX, legendY + 8);

      const legBox = 10;
      let legX = startX + 30;
      for (let l = 0; l <= 4; l++) {
        ctx.fillStyle = palette[l as keyof typeof palette];
        ctx.fillRect(legX, legendY, legBox, legBox);
        legX += legBox + 3;
      }
      ctx.fillStyle = palette.muted;
      ctx.fillText("More", legX + 4, legendY + 8);
    }

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png")
    );
    if (!blob) {
      return {
        ok: false,
        message: "Couldn't create the image. Try the compact size or a smaller pattern.",
      };
    }

    const filename = getExportFilename(plan, "png");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    return { ok: true, message: `Downloaded ${filename}.` };
  } catch (err) {
    return { ok: false, message: `Failed to download image: ${(err as Error).message}` };
  }
}

export function layoutPrintPages(
  months: MonthPlan[],
  options: PrintOptions
): MonthPlan[][][] {
  // Return pages -> rows -> months
  const perRow = options.orientation === "landscape" ? 3 : 1;
  const rowsRest = options.orientation === "landscape" ? 1 : 2;

  const rows: MonthPlan[][] = [];
  for (let i = 0; i < months.length; i += perRow) {
    rows.push(months.slice(i, i + perRow));
  }

  const pages: MonthPlan[][][] = [];
  let i = 0;
  let capacity = 1; // page 1 has header and summary

  while (i < rows.length) {
    const pageRows: MonthPlan[][] = [];
    while (i < rows.length && pageRows.length < capacity) {
      pageRows.push(rows[i++]);
    }
    pages.push(pageRows);
    capacity = rowsRest;
  }

  return pages;
}

export function preparePrintableCalendar(
  _schedule: ScheduleEntry[],
  plan: Plan,
  options: PrintOptions
): PrintDocument {
  const pages = layoutPrintPages(plan.months ?? [], options);

  const legend =
    options.markerStyle === "checkbox"
      ? [
          { marker: "☑", label: "Active contribution day" },
          { marker: "□", label: "No contribution required" },
        ]
      : options.markerStyle === "symbol_only"
      ? [
          { marker: "■", label: "Active contribution day" },
          { marker: "□", label: "No contribution required" },
        ]
      : [
          { marker: "■ (shaded)", label: "Active contribution day" },
          { marker: "□", label: "No contribution required" },
        ];

  return {
    title: "GlyphForge",
    subtitle: "Contribution Art Activity Plan",
    pattern: plan.summary.input,
    platform: plan.summary.platformLabel,
    dateRange: `${formatDatePretty(plan.summary.start)} – ${formatDatePretty(
      plan.summary.end
    )}`,
    summaryLine: `${plan.summary.activeDays} active days · ${plan.summary.weeks} weeks · ${plan.summary.estimatedContributions} estimated contributions`,
    graphStrip: options.includeGraphStrip
      ? {
          rows: 7,
          cols: plan.matrix.cols,
          levels: plan.matrix.levels,
        }
      : null,
    pages,
    legend,
    footer: "Generated by GlyphForge. The graph is a planning aid; platforms may render contribution graphs differently.",
    tzNote:
      plan.profile.dayBoundary === "utc"
        ? "Note: Days are counted in UTC. Complete daily contributions within your local timezone UTC alignment window."
        : null,
  };
}
