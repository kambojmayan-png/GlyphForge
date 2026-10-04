import React, { useId } from "react";
import { PatternMatrix } from "../types/pattern";
import { countGraphemes } from "../utils/textUtils";
import { MAX_GRAPHEMES } from "../engine/defaults";

export interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  miniPreview: PatternMatrix | null;
  error?: string;
}

const EXAMPLE_CHIPS = [
  "FORGE",
  "COMMIT",
  "HELLO WORLD",
  "2026",
  "#",
  "❤️",
  "🚀",
  "नमस्ते",
  "こんにちは",
  "你好",
];

export function TextInput({ value, onChange, miniPreview, error }: TextInputProps) {
  const inputId = useId();
  const graphemes = countGraphemes(value);
  const isNearLimit = graphemes >= 100;

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const nextVal = e.target.value;
    if (countGraphemes(nextVal) <= MAX_GRAPHEMES) {
      onChange(nextVal);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label htmlFor={inputId} className="text-sm font-semibold text-gf-text">
          Text or Unicode Input
        </label>
        <span
          className={`text-xs font-mono tabular-nums ${
            isNearLimit ? "text-gf-warn font-semibold" : "text-gf-text-muted"
          }`}
          aria-live="polite"
        >
          {graphemes} / {MAX_GRAPHEMES} chars
        </span>
      </div>

      <div className="relative">
        <textarea
          id={inputId}
          value={value}
          onChange={handleChange}
          rows={3}
          placeholder="Enter text, numbers, symbols, emoji, or Unicode (e.g. FORGE, COMMIT, 2026)..."
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : undefined}
          className={`w-full rounded-xl bg-gf-surface border ${
            error
              ? "border-gf-error ring-1 ring-gf-error"
              : "border-gf-border focus:border-gf-focus"
          } p-3.5 text-gf-text placeholder:text-gf-text-muted/60 text-base font-mono resize-y min-h-[96px] max-h-[220px] transition-colors`}
        />
      </div>

      {error && (
        <p id={`${inputId}-error`} role="alert" className="text-xs text-gf-error font-medium">
          {error}
        </p>
      )}

      {/* Example Chips */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-xs text-gf-text-muted mr-1 font-medium">Examples:</span>
        {EXAMPLE_CHIPS.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => onChange(chip)}
            className="px-2.5 py-1 rounded-md text-xs font-mono bg-gf-surface-raised border border-gf-border text-gf-text hover:bg-gf-surface hover:border-gf-text-muted/50 transition-colors"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Live Mini Preview */}
      {miniPreview && (
        <div className="mt-2 p-3 rounded-xl bg-gf-surface/50 border border-gf-border/80">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-mono font-medium text-gf-text-muted">
              LIVE MATRIX PREVIEW ({miniPreview.cols} cols)
            </span>
            <span className="text-[11px] text-gf-text-muted">7 rows</span>
          </div>

          <div className="overflow-x-auto custom-scrollbar pb-1">
            <div
              className="grid gap-[2px] select-none w-max"
              style={{
                gridTemplateRows: "repeat(7, 8px)",
                gridAutoFlow: "column",
              }}
              aria-hidden="true"
            >
              {Array.from({ length: miniPreview.cols }).map((_, c) =>
                Array.from({ length: 7 }).map((__, r) => {
                  const level = miniPreview.levels[r * miniPreview.cols + c];
                  return (
                    <div
                      key={`preview-${c}-${r}`}
                      className="w-[8px] h-[8px] rounded-[1.5px]"
                      style={{
                        backgroundColor:
                          level === 0
                            ? "var(--gf-level-0)"
                            : level === 1
                            ? "var(--gf-level-1)"
                            : level === 2
                            ? "var(--gf-level-2)"
                            : level === 3
                            ? "var(--gf-level-3)"
                            : "var(--gf-level-4)",
                      }}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
