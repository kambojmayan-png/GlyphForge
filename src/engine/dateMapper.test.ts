import { describe, it, expect } from "vitest";
import { generatePatternMatrix } from "./patternGenerator";
import { normalizeInput } from "../utils/textUtils";
import { DEFAULT_SETTINGS } from "./defaults";
import { PLATFORM_PROFILES } from "./platforms";
import {
  resolveGridOrigin,
  matrixToContributionCells,
  mapCellsToDates,
  applyAlignment,
} from "./dateMapper";
import {
  generateSchedule,
  groupScheduleByMonth,
} from "./contributionCalculator";
import {
  isValidIsoDate,
  nextWeekdayAfterIso,
  addDaysIso,
  diffDaysIso,
  weekdayIso,
} from "../utils/dateUtils";

describe("Date Mapping Algorithm", () => {
  it("GitHub, not-before 2026-10-12, MAYAN", async () => {
    const norm = normalizeInput("MAYAN");
    const matrix = await generatePatternMatrix(norm, DEFAULT_SETTINGS);
    const profile = PLATFORM_PROFILES.github;

    const notBefore = "2026-10-12";
    const placement = resolveGridOrigin(matrix, notBefore, null, profile);

    expect(placement.origin).toBe("2026-10-18");
    expect(placement.shiftedWeeks).toBe(1);

    const cells = matrixToContributionCells(matrix);
    const dated = mapCellsToDates(cells, placement, "2026-10-04");
    const schedule = generateSchedule(dated, matrix.meta);

    const active = schedule.filter((e) => e.active);
    expect(active[0].date).toBe("2026-10-18");
    expect(active[active.length - 1].date).toBe("2027-05-08");
    expect(matrix.cols).toBe(29);
  });

  it("Generic (Monday), not-before 2026-10-12, MAYAN", async () => {
    const norm = normalizeInput("MAYAN");
    const matrix = await generatePatternMatrix(norm, DEFAULT_SETTINGS);
    const profile = PLATFORM_PROFILES.generic;

    const notBefore = "2026-10-12";
    const placement = resolveGridOrigin(matrix, notBefore, null, profile);

    expect(placement.origin).toBe("2026-10-12");
    expect(placement.shiftedWeeks).toBe(0);

    const cells = matrixToContributionCells(matrix);
    const dated = mapCellsToDates(cells, placement, "2026-10-04");
    const schedule = generateSchedule(dated, matrix.meta);

    const active = schedule.filter((e) => e.active);
    expect(active[0].date).toBe("2026-10-12");
    expect(active[active.length - 1].date).toBe("2027-05-02");
  });

  it("GitHub, not-before 2026-10-12, '-' (Wednesday only)", async () => {
    const norm = normalizeInput("-");
    const matrix = await generatePatternMatrix(norm, DEFAULT_SETTINGS);
    const profile = PLATFORM_PROFILES.github;

    const notBefore = "2026-10-12"; // Monday
    const placement = resolveGridOrigin(matrix, notBefore, null, profile);

    // '-' has active cell only at row 3 (Wednesday, 2026-10-14).
    // Wednesday 14th is >= notBefore (Monday 12th), so no shift!
    expect(placement.origin).toBe("2026-10-11");
    expect(placement.shiftedWeeks).toBe(0);

    const cells = matrixToContributionCells(matrix);
    const dated = mapCellsToDates(cells, placement, "2026-10-04");
    const schedule = generateSchedule(dated, matrix.meta);
    const active = schedule.filter((e) => e.active);
    expect(active[0].date).toBe("2026-10-14");
  });

  it("Month totals, GitHub MAYAN", async () => {
    const norm = normalizeInput("MAYAN");
    const matrix = await generatePatternMatrix(norm, DEFAULT_SETTINGS);
    const profile = PLATFORM_PROFILES.github;

    const placement = resolveGridOrigin(matrix, "2026-10-12", null, profile);
    const cells = matrixToContributionCells(matrix);
    const dated = mapCellsToDates(cells, placement, "2026-10-04");
    const schedule = generateSchedule(dated, matrix.meta);

    const months = groupScheduleByMonth(schedule, {
      printWeekStart: 1,
      doneDates: new Set(),
      today: "2026-10-04",
    });

    const counts = months.map((m) => m.activeCount);
    // Expected: 8, 11, 15, 9, 10, 11, 10, 7 (sum 81)
    expect(counts).toEqual([8, 11, 15, 9, 10, 11, 10, 7]);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(81);
  });

  it("Month totals, Generic MAYAN", async () => {
    const norm = normalizeInput("MAYAN");
    const matrix = await generatePatternMatrix(norm, DEFAULT_SETTINGS);
    const profile = PLATFORM_PROFILES.generic;

    const placement = resolveGridOrigin(matrix, "2026-10-12", null, profile);
    const cells = matrixToContributionCells(matrix);
    const dated = mapCellsToDates(cells, placement, "2026-10-04");
    const schedule = generateSchedule(dated, matrix.meta);

    const months = groupScheduleByMonth(schedule, {
      printWeekStart: 1,
      doneDates: new Set(),
      today: "2026-10-04",
    });

    const counts = months.map((m) => m.activeCount);
    // Expected: 10, 15, 11, 8, 10, 13, 12, 2 (sum 81)
    expect(counts).toEqual([10, 15, 11, 8, 10, 13, 12, 2]);
    expect(counts.reduce((a, b) => a + b, 0)).toBe(81);
  });

  it("Weekday distribution, GitHub MAYAN", async () => {
    const norm = normalizeInput("MAYAN");
    const matrix = await generatePatternMatrix(norm, DEFAULT_SETTINGS);
    const profile = PLATFORM_PROFILES.github;

    const placement = resolveGridOrigin(matrix, "2026-10-12", null, profile);
    const cells = matrixToContributionCells(matrix);
    const dated = mapCellsToDates(cells, placement, "2026-10-04");
    const schedule = generateSchedule(dated, matrix.meta);

    const rowCounts = [0, 0, 0, 0, 0, 0, 0];
    for (const e of schedule) {
      if (e.active) {
        rowCounts[e.pixelRow]++;
      }
    }

    // Expected rows 0 to 6: 12, 12, 12, 17, 10, 9, 9
    expect(rowCounts).toEqual([12, 12, 12, 17, 10, 9, 9]);
  });

  it("Year boundary crossing: 2026-12-31 to 2027-01-01", () => {
    const origin = "2026-12-27"; // Sunday
    expect(addDaysIso(origin, 4)).toBe("2026-12-31");
    expect(addDaysIso(origin, 5)).toBe("2027-01-01");
  });

  it("Leap year handling: 2028-02-29", () => {
    const origin = "2028-02-27"; // Sunday
    expect(addDaysIso(origin, 2)).toBe("2028-02-29");
    expect(addDaysIso(origin, 3)).toBe("2028-03-01");
  });

  it("Non-leap February handling: 2027-02-28", () => {
    const origin = "2027-02-28";
    expect(addDaysIso(origin, 1)).toBe("2027-03-01");
  });

  it("Next Monday logic", () => {
    expect(nextWeekdayAfterIso("2026-10-04", 1)).toBe("2026-10-05");
    expect(nextWeekdayAfterIso("2026-10-05", 1)).toBe("2026-10-12");
  });

  it("Next full week (GitHub Sunday)", () => {
    // 2026-10-04 is Sunday -> next Sunday is 2026-10-11
    expect(nextWeekdayAfterIso("2026-10-04", 0)).toBe("2026-10-11");
  });

  it("Alignment inside 53-week window for '-' (5 cols)", async () => {
    const norm = normalizeInput("-");
    const matrix = await generatePatternMatrix(norm, DEFAULT_SETTINGS);
    const profile = PLATFORM_PROFILES.github;

    const { columnOffset: centerOffset } = applyAlignment(matrix, profile, "center");
    expect(centerOffset).toBe(24);

    const { columnOffset: rightOffset } = applyAlignment(matrix, profile, "right");
    expect(rightOffset).toBe(48);
  });

  it("Rejects invalid calendar dates", () => {
    expect(isValidIsoDate("")).toBe(false);
    expect(isValidIsoDate("2026-02-30")).toBe(false);
    expect(isValidIsoDate("2027-02-29")).toBe(false);
    expect(isValidIsoDate("2026-13-01")).toBe(false);
    expect(isValidIsoDate("2026-00-10")).toBe(false);
    expect(isValidIsoDate("abcd-ef-gh")).toBe(false);
    expect(isValidIsoDate("1969-12-31")).toBe(false);
    expect(isValidIsoDate("2101-01-01")).toBe(false);
    expect(isValidIsoDate("2028-02-29")).toBe(true); // valid leap day
  });

  it("Round trip consistency check for all cells", async () => {
    const norm = normalizeInput("MAYAN");
    const matrix = await generatePatternMatrix(norm, DEFAULT_SETTINGS);
    const profile = PLATFORM_PROFILES.github;

    const placement = resolveGridOrigin(matrix, "2026-10-12", null, profile);
    const cells = matrixToContributionCells(matrix);
    const dated = mapCellsToDates(cells, placement, "2026-10-04");

    for (const cell of dated) {
      const dayDiff = diffDaysIso(cell.date, placement.origin);
      expect(dayDiff).toBe(cell.col * 7 + cell.row);

      const cellWeekday = weekdayIso(cell.date);
      const expectedWeekday = (profile.weekStartsOn + cell.row) % 7;
      expect(cellWeekday).toBe(expectedWeekday);
    }
  });

  it("Computes max streak accurately in summarize()", async () => {
    const norm = normalizeInput("HI");
    const matrix = await generatePatternMatrix(norm, DEFAULT_SETTINGS);
    const profile = PLATFORM_PROFILES.leetcode;

    expect(profile.verified).toBe(true);
    expect(profile.weekStartsOn).toBe(0); // Sunday

    const placement = resolveGridOrigin(matrix, "2026-10-12", null, profile);
    const cells = matrixToContributionCells(matrix);
    const dated = mapCellsToDates(cells, placement, "2026-10-04");
    const schedule = generateSchedule(dated, matrix.meta);

    const summary = (await import("./contributionCalculator")).summarize(
      schedule,
      placement,
      matrix,
      norm,
      DEFAULT_SETTINGS,
      profile,
      0
    );

    expect(summary.maxStreak).toBeGreaterThan(0);
    expect(summary.platformId).toBe("leetcode");
  });
});
