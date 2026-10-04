import { describe, it, expect } from "vitest";
import { normalizeInput } from "../utils/textUtils";
import { DEFAULT_SETTINGS } from "./defaults";
import { generatePlan } from "./index";
import { buildLeetCodeCalendar, mapTokensToLeetCode } from "./leetcodeMapper";
import { extractGlyphTokens } from "./patternGenerator";
import { weekdayIso } from "../utils/dateUtils";

describe("Dedicated LeetCode Platform Engine", () => {
  it("builds the authentic 12 discontinuous month blocks with Sunday-to-Saturday columns", () => {
    const calendar = buildLeetCodeCalendar(2026, "calendarYear");

    expect(calendar.months.length).toBe(12);
    expect(calendar.months[0].shortLabel).toBe("Jan");
    expect(calendar.months[11].shortLabel).toBe("Dec");

    // January 2026: Jan 1 was Thursday (weekday 4, where Sun=0, Mon=1, Tue=2, Wed=3, Thu=4)
    const jan = calendar.months[0];
    expect(jan.firstWeekday).toBe(4);
    expect(jan.daysInMonth).toBe(31);

    // Col 0, row 0..3 (Sun..Wed) must be off-calendar slots (null)
    expect(jan.slots[0][0]).toBeNull(); // Sunday
    expect(jan.slots[0][1]).toBeNull(); // Monday
    expect(jan.slots[0][2]).toBeNull(); // Tuesday
    expect(jan.slots[0][3]).toBeNull(); // Wednesday

    // Col 0, row 4 (Thursday) must be Jan 1, 2026
    const jan1 = jan.slots[0][4];
    expect(jan1).not.toBeNull();
    expect(jan1?.date).toBe("2026-01-01");
    expect(jan1?.dayNum).toBe(1);
    expect(jan1?.weekday).toBe(4);

    // Jan 31 is Saturday (weekday 6) in column 4
    const jan31 = jan.slots[4][6];
    expect(jan31).not.toBeNull();
    expect(jan31?.date).toBe("2026-01-31");
    expect(jan31?.dayNum).toBe(31);
  });

  it("handles trailing 12 months (past 1 year) mode ending in target month", () => {
    const calendar = buildLeetCodeCalendar(2026, "past1Year", "2026-10-04");
    expect(calendar.months.length).toBe(12);

    // Last month should be October 2026
    const lastMonth = calendar.months[11];
    expect(lastMonth.month).toBe(10);
    expect(lastMonth.year).toBe(2026);
    expect(lastMonth.shortLabel).toBe("Oct");

    // First month should be November 2025 (12 months total)
    const firstMonth = calendar.months[0];
    expect(firstMonth.month).toBe(11);
    expect(firstMonth.year).toBe(2025);
    expect(firstMonth.shortLabel).toBe("Nov");
  });

  it("proves GitHub and LeetCode produce fundamentally different grid and date mappings for the same input", async () => {
    const text = "LEET";

    // 1. Generate plan for GitHub
    const githubSettings = {
      ...DEFAULT_SETTINGS,
      text,
      platform: "github" as const,
      startDate: "2026-10-18",
    };
    const githubResult = await generatePlan(githubSettings, { todayIso: "2026-10-04" });
    expect(githubResult.ok).toBe(true);
    if (!githubResult.ok) return;
    const githubPlan = githubResult.value;

    // 2. Generate plan for LeetCode
    const leetcodeSettings = {
      ...DEFAULT_SETTINGS,
      text,
      platform: "leetcode" as const,
      startDate: "2026-10-18",
    };
    const leetcodeResult = await generatePlan(leetcodeSettings, { todayIso: "2026-10-04" });
    expect(leetcodeResult.ok).toBe(true);
    if (!leetcodeResult.ok) return;
    const leetcodePlan = leetcodeResult.value;

    // Verify platform IDs are distinct
    expect(githubPlan.summary.platformId).toBe("github");
    expect(leetcodePlan.summary.platformId).toBe("leetcode");

    // GitHub uses continuous week columns where col 0 is week 0 (starts on Sunday week-start)
    // LeetCode maps into discontinuous month blocks
    const githubActiveDates = githubPlan.schedule.filter((e) => e.active).map((e) => e.date);
    const leetcodeActiveDates = leetcodePlan.schedule.filter((e) => e.active).map((e) => e.date);

    // The set of active dates must NOT be identical because of month-aware discontinuous placement!
    expect(githubActiveDates).not.toEqual(leetcodeActiveDates);

    // Verify all active dates in LeetCode map to real, valid calendar days and respect Sunday=row 0
    for (const entry of leetcodePlan.schedule.filter((e) => e.active)) {
      expect(entry.pixelRow).toBeGreaterThanOrEqual(0);
      expect(entry.pixelRow).toBeLessThanOrEqual(6);
      expect(weekdayIso(entry.date)).toBe(entry.pixelRow);
    }
  });

  it("never places active contributions on off-calendar void slots in LeetCode", async () => {
    const norm = normalizeInput("HI");
    const settings = {
      ...DEFAULT_SETTINGS,
      text: "HI",
      platform: "leetcode" as const,
    };

    const { tokens } = await extractGlyphTokens(norm, settings);
    const calendar = buildLeetCodeCalendar(2026, "calendarYear");
    const result = mapTokensToLeetCode(tokens, calendar, settings, "2026-10-04");

    // Check that every active entry in schedule corresponds to a real valid day
    const activeEntries = result.schedule.filter((e) => e.active);
    expect(activeEntries.length).toBeGreaterThan(0);

    for (const entry of activeEntries) {
      const parts = entry.date.split("-");
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const d = parseInt(parts[2], 10);

      // Verify the day is within real calendar month bounds
      const daysInThisMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
      expect(d).toBeGreaterThanOrEqual(1);
      expect(d).toBeLessThanOrEqual(daysInThisMonth);
    }
  });

  it("distributes multi-character words across distinct month blocks without splitting characters", async () => {
    const norm = normalizeInput("LEET");
    const settings = {
      ...DEFAULT_SETTINGS,
      text: "LEET",
      platform: "leetcode" as const,
      alignment: "left" as const,
      startDate: "2026-01-01",
    };

    const { tokens } = await extractGlyphTokens(norm, settings);
    expect(tokens.length).toBe(4);

    const calendar = buildLeetCodeCalendar(2026, "calendarYear");
    const result = mapTokensToLeetCode(tokens, calendar, settings, "2026-10-04");

    const activeEntries = result.schedule.filter((e) => e.active);
    expect(activeEntries.length).toBeGreaterThan(30);

    // Collect all months that have active contributions
    const activeMonths = Array.from(new Set(activeEntries.map((e) => e.month))).sort();
    // 4 characters each in their own month block -> 4 distinct active months
    expect(activeMonths.length).toBe(4);
    expect(activeMonths).toEqual(["2026-01", "2026-02", "2026-03", "2026-04"]);
  });

  it("generates full plan for FORGE on LeetCode", async () => {
    const settings = {
      ...DEFAULT_SETTINGS,
      text: "FORGE",
      platform: "leetcode" as const,
    };
    const res = await generatePlan(settings, { todayIso: "2026-10-04" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;

    const plan = res.value;
    const active = plan.schedule.filter((e) => e.active);
    console.log("FORGE active days:", active.length, "Active months:", Array.from(new Set(active.map(e => e.month))));
  });
});
