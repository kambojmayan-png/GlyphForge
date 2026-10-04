import { describe, it, expect } from "vitest";
import { exportScheduleToCSV, copyDatesGrouped, layoutPrintPages } from "./exportUtils";
import { ScheduleEntry } from "../types/schedule";
import { MonthPlan, PrintOptions } from "../types/calendar";

describe("Export Utilities", () => {
  const dummyEntries: ScheduleEntry[] = [
    {
      date: "2026-10-18",
      dayOfWeek: "Sunday",
      month: "2026-10",
      active: true,
      level: 1,
      required: 1,
      pixelRow: 0,
      pixelColumn: 0,
      status: "future",
      glyph: {
        line: 0,
        clusterIndex: 0,
        cluster: "M",
        glyphColumn: 0,
        glyphWidth: 5,
      },
    },
    {
      date: "2026-10-19",
      dayOfWeek: "Monday",
      month: "2026-10",
      active: true,
      level: 1,
      required: 1,
      pixelRow: 1,
      pixelColumn: 0,
      status: "future",
      glyph: {
        line: 0,
        clusterIndex: 0,
        cluster: "-",
        glyphColumn: 1,
        glyphWidth: 5,
      },
    },
  ];

  it("exports CSV with exact header and CRLF line endings", () => {
    const csv = exportScheduleToCSV(dummyEntries, {
      activeOnly: false,
      extra: true,
      bom: false,
      platform: "github",
    });

    const lines = csv.split("\r\n");
    expect(lines[0]).toBe(
      "date,day_of_week,month,active,required_contribution,platform,pixel_row,pixel_column,status,glyph"
    );
    expect(csv).toContain("\r\n");
  });

  it("applies BOM when requested", () => {
    const csvWithBom = exportScheduleToCSV(dummyEntries, {
      activeOnly: false,
      extra: false,
      bom: true,
      platform: "github",
    });
    expect(csvWithBom.startsWith("\uFEFF")).toBe(true);
  });

  it("neutralizes formula injection characters (=, +, -, @)", () => {
    const formulaEntries: ScheduleEntry[] = [
      {
        date: "2026-10-18",
        dayOfWeek: "Sunday",
        month: "2026-10",
        active: true,
        level: 1,
        required: 1,
        pixelRow: 0,
        pixelColumn: 0,
        status: "future",
        glyph: {
          line: 0,
          clusterIndex: 0,
          cluster: "=SUM(A1:A10)",
          glyphColumn: 0,
          glyphWidth: 5,
        },
      },
    ];

    const csv = exportScheduleToCSV(formulaEntries, {
      activeOnly: false,
      extra: true,
      bom: false,
      platform: "github",
    });

    // The glyph column should be prefixed with a single quote: '=SUM(A1:A10)
    expect(csv).toContain("2026-10-18,Sunday,2026-10,true,1,github,0,0,future,'=SUM(A1:A10)");
  });

  it("groups active dates by month for copyDatesGrouped", () => {
    const grouped = copyDatesGrouped(dummyEntries);
    expect(grouped).toContain("October 2026");
    expect(grouped).toContain("18 Oct");
    expect(grouped).toContain("19 Oct");
  });

  it("layoutPrintPages distributes 8 months correctly", () => {
    const dummyMonths: MonthPlan[] = Array.from({ length: 8 }).map((_, i) => ({
      key: `2026-1${i}`,
      year: 2026,
      month: i + 1,
      label: `Month ${i + 1}`,
      weeks: [],
      activeCount: 10,
      doneCount: 0,
      remainingCount: 10,
      missedCount: 0,
    }));

    const portraitOpts: PrintOptions = {
      paper: "A4",
      orientation: "portrait",
      markerStyle: "shaded_symbol",
      firstWeekday: 1,
      includeGraphStrip: true,
      showInactiveMarkers: true,
      rowMm: 14,
    };

    // Portrait: 1 on page 1, 2 on continuation pages -> 5 pages (1, 2, 2, 2, 1)
    const portraitPages = layoutPrintPages(dummyMonths, portraitOpts);
    expect(portraitPages).toHaveLength(5);
    expect(portraitPages[0]).toHaveLength(1);
    expect(portraitPages[1]).toHaveLength(2);
    expect(portraitPages[2]).toHaveLength(2);
    expect(portraitPages[3]).toHaveLength(2);
    expect(portraitPages[4]).toHaveLength(1);

    const landscapeOpts: PrintOptions = {
      ...portraitOpts,
      orientation: "landscape",
    };

    // Landscape: 1 row of 3 on page 1, 1 row of 3 on continuation -> 3 pages (3, 3, 2)
    const landscapePages = layoutPrintPages(dummyMonths, landscapeOpts);
    expect(landscapePages).toHaveLength(3);
    expect(landscapePages[0][0]).toHaveLength(3);
    expect(landscapePages[1][0]).toHaveLength(3);
    expect(landscapePages[2][0]).toHaveLength(2);
  });
});
