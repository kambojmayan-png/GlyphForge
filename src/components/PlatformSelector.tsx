import { PlatformId } from "../types/pattern";
import { PLATFORM_PROFILES } from "../engine/platforms";

export interface PlatformSelectorProps {
  value: PlatformId;
  onChange: (platform: PlatformId) => void;
}

export function PlatformSelector({ value, onChange }: PlatformSelectorProps) {
  const currentProfile = PLATFORM_PROFILES[value];

  return (
    <div className="flex flex-col gap-2.5">
      <label className="text-sm font-semibold text-gf-text">Platform</label>

      <div
        role="radiogroup"
        aria-label="Target contribution platform"
        className="grid grid-cols-3 gap-2"
      >
        {(["github", "leetcode", "generic"] as PlatformId[]).map((pid) => {
          const profile = PLATFORM_PROFILES[pid];
          const isSelected = value === pid;

          return (
            <button
              key={pid}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onChange(pid)}
              className={`flex flex-col items-center justify-center p-3 rounded-xl border text-sm font-medium transition-all ${
                isSelected
                  ? "bg-gf-surface-raised border-gf-focus text-gf-text ring-1 ring-gf-focus"
                  : "bg-gf-surface border-gf-border text-gf-text-muted hover:text-gf-text hover:bg-gf-surface-raised/50"
              }`}
            >
              <span className="font-semibold text-gf-text">{profile.label}</span>
              <span className="text-[11px] text-gf-text-muted mt-0.5 capitalize">
                {profile.unit}
              </span>
            </button>
          );
        })}
      </div>

      {/* Advisory Note */}
      <div className="text-xs text-gf-text-muted bg-gf-surface/60 border border-gf-border rounded-lg p-2.5 flex flex-col gap-1">
        <div className="flex items-center gap-2">
          {!currentProfile.verified && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gf-warn/20 text-gf-warn border border-gf-warn/40">
              Unverified profile
            </span>
          )}
          <span className="font-medium text-gf-text">
            {currentProfile.notes[0]}
          </span>
        </div>
        {currentProfile.notes.slice(1).map((note, i) => (
          <p key={i} className="text-[11px] text-gf-text-muted">
            • {note}
          </p>
        ))}
      </div>
    </div>
  );
}
