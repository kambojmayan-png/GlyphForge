import { PlatformId, PlatformProfile, PatternSettings } from "../types/pattern";

export const PLATFORM_PROFILES: Record<PlatformId, PlatformProfile> = {
  github: {
    id: "github",
    label: "GitHub",
    weekStartsOn: 0, // Sunday
    unit: "contribution",
    dayBoundary: "utc",
    softColumnLimit: 53,
    verified: true,
    notes: [
      "Rows run Sunday to Saturday. Days are counted in UTC.",
      "Contributions are timestamped in UTC (per GitHub's documentation).",
      "Only commits on the default branch (or gh-pages), made with an email linked to the account, count; updates can take up to 24 hours.",
    ],
  },
  leetcode: {
    id: "leetcode",
    label: "LeetCode",
    weekStartsOn: 0,
    unit: "submission",
    dayBoundary: "utc",
    softColumnLimit: 53,
    verified: false, // UI shows "Unverified profile"
    notes: [
      "Layout, week start and day boundary are assumptions. Confirm against your own profile before relying on it.",
    ],
  },
  generic: {
    id: "generic",
    label: "Generic",
    weekStartsOn: 1, // Monday
    unit: "contribution",
    dayBoundary: "local",
    softColumnLimit: 53,
    verified: true,
    notes: [
      "Neutral calendar, no platform claims.",
    ],
  },
};

export function getPlatformProfile(settings: PatternSettings): PlatformProfile {
  const base = PLATFORM_PROFILES[settings.platform];
  if (settings.platform === "generic" && settings.weekStartsOnOverride !== null) {
    return {
      ...base,
      weekStartsOn: settings.weekStartsOnOverride as 0 | 1 | 2 | 3 | 4 | 5 | 6,
    };
  }
  return base;
}
