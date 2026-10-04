import {
  PatternMatrix,
  PlatformProfile,
  Alignment,
  IsoDate,
  ColumnMeta,
} from "../types/pattern";
import { GridPlacement } from "../types/schedule";
import {
  startOfWeekIso,
  addDaysIso,
  diffDaysIso,
  weekdayName,
  formatDatePretty,
} from "../utils/dateUtils";
import { CONTRIBUTIONS_PER_LEVEL } from "./defaults";

export function applyAlignment(
  matrix: PatternMatrix,
  profile: PlatformProfile,
  alignment: Alignment
): { matrix: PatternMatrix; columnOffset: number } {
  const window = profile.softColumnLimit;
  let offset = 0;

  if (matrix.cols < window) {
    if (alignment === "center") {
      offset = Math.floor((window - matrix.cols) / 2);
    } else if (alignment === "right") {
      offset = window - matrix.cols;
    }
  }

  if (offset <= 0) {
    return { matrix, columnOffset: 0 };
  }

  const newCols = matrix.cols + offset;
  const newLevels = new Uint8Array(7 * newCols);
  const newMeta: ColumnMeta[] = [];

  for (let o = 0; o < offset; o++) {
    newMeta.push({
      kind: "offset",
      lineIndex: 0,
      clusterIndex: null,
      cluster: null,
      glyphColumn: null,
      glyphWidth: null,
    });
  }
  newMeta.push(...matrix.meta);

  // Copy matrix levels shifted by offset
  for (let c = 0; c < matrix.cols; c++) {
    for (let r = 0; r < 7; r++) {
      newLevels[r * newCols + (c + offset)] = matrix.levels[r * matrix.cols + c];
    }
  }

  return {
    matrix: {
      ...matrix,
      cols: newCols,
      levels: newLevels,
      meta: newMeta,
    },
    columnOffset: offset,
  };
}

export function earliestActiveOffset(matrix: PatternMatrix): number {
  let minDays = Infinity;
  for (let c = 0; c < matrix.cols; c++) {
    for (let r = 0; r < 7; r++) {
      if (matrix.levels[r * matrix.cols + c] > 0) {
        const days = c * 7 + r;
        if (days < minDays) minDays = days;
      }
    }
  }
  return minDays === Infinity ? 0 : minDays;
}

export function resolveGridOrigin(
  matrix: PatternMatrix,
  notBefore: IsoDate,
  forcedOrigin: IsoDate | null,
  profile: PlatformProfile
): GridPlacement {
  const candidate = forcedOrigin ?? startOfWeekIso(notBefore, profile.weekStartsOn);
  const minOffset = earliestActiveOffset(matrix);
  const earliestActive = addDaysIso(candidate, minOffset);

  const diff = diffDaysIso(notBefore, earliestActive);
  const shiftWeeks = diff <= 0 ? 0 : Math.ceil(diff / 7);
  const origin = addDaysIso(candidate, shiftWeeks * 7);

  let explanation: string | undefined;
  if (shiftWeeks > 0) {
    const originDayName = weekdayName(origin);
    const notBeforeDayName = weekdayName(notBefore);
    const startReq = weekdayName(origin);
    explanation = `Grid starts ${originDayName} ${formatDatePretty(
      origin
    )} (your date was ${notBeforeDayName} ${formatDatePretty(
      notBefore
    )}; the pattern needs a ${startReq} start).`;
  }

  return {
    origin,
    notBefore,
    shiftedWeeks: shiftWeeks,
    explanation,
  };
}

export interface ContributionCell {
  row: number;
  col: number;
  level: number;
  required: number;
}

export function matrixToContributionCells(matrix: PatternMatrix): ContributionCell[] {
  const cells: ContributionCell[] = [];
  for (let c = 0; c < matrix.cols; c++) {
    for (let r = 0; r < 7; r++) {
      const level = matrix.levels[r * matrix.cols + c];
      cells.push({
        row: r,
        col: c,
        level,
        required: CONTRIBUTIONS_PER_LEVEL[level] ?? 0,
      });
    }
  }
  return cells;
}

export interface DatedCell extends ContributionCell {
  date: IsoDate;
  status: "past" | "today" | "future";
}

export function mapCellsToDates(
  cells: ContributionCell[],
  placement: GridPlacement,
  today: IsoDate
): DatedCell[] {
  return cells.map((cell) => {
    const dayIndex = cell.col * 7 + cell.row;
    const date = addDaysIso(placement.origin, dayIndex);
    const status: "past" | "today" | "future" =
      date < today ? "past" : date === today ? "today" : "future";

    return {
      ...cell,
      date,
      status,
    };
  });
}
