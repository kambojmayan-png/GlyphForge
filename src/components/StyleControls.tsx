import { useState } from "react";
import { ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { PatternSettings, SizePreset, Alignment, RenderMode } from "../types/pattern";
import { DEFAULT_SETTINGS, SIZE_PRESETS } from "../engine/defaults";

export interface StyleControlsProps {
  settings: PatternSettings;
  onChange: (patch: Partial<PatternSettings>) => void;
  disabledSpacing?: boolean; // When RTL/complex script line is active
}

export function StyleControls({
  settings,
  onChange,
  disabledSpacing = false,
}: StyleControlsProps) {
  const [open, setOpen] = useState(false);

  const handleSizePresetChange = (preset: SizePreset) => {
    const config = SIZE_PRESETS[preset];
    onChange({
      sizePreset: preset,
      charSpacing: config.charSpacing,
      wordSpacing: config.wordSpacing,
    });
  };

  const handleReset = () => {
    onChange({
      sizePreset: DEFAULT_SETTINGS.sizePreset,
      charSpacing: DEFAULT_SETTINGS.charSpacing,
      wordSpacing: DEFAULT_SETTINGS.wordSpacing,
      lineGap: DEFAULT_SETTINGS.lineGap,
      columnStretch: DEFAULT_SETTINGS.columnStretch,
      density: DEFAULT_SETTINGS.density,
      intensity: DEFAULT_SETTINGS.intensity,
      shading: DEFAULT_SETTINGS.shading,
      invert: DEFAULT_SETTINGS.invert,
      alignment: DEFAULT_SETTINGS.alignment,
      renderMode: DEFAULT_SETTINGS.renderMode,
      padding: DEFAULT_SETTINGS.padding,
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-semibold text-gf-text">Style & Spacing</label>
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="flex items-center gap-1 text-xs text-gf-focus hover:underline font-medium"
        >
          <span>{open ? "Fewer options" : "More options"}</span>
          {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* Preset Segmented Control */}
      <div className="grid grid-cols-3 gap-1 p-1 bg-gf-surface rounded-xl border border-gf-border">
        {(["compact", "normal", "wide"] as SizePreset[]).map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => handleSizePresetChange(preset)}
            className={`py-1.5 px-3 rounded-lg text-xs font-semibold capitalize transition-all ${
              settings.sizePreset === preset
                ? "bg-gf-surface-raised text-gf-text shadow-sm border border-gf-border"
                : "text-gf-text-muted hover:text-gf-text"
            }`}
          >
            {preset}
          </button>
        ))}
      </div>

      {/* More Options Drawer */}
      {open && (
        <div className="p-4 rounded-xl bg-gf-surface border border-gf-border flex flex-col gap-4 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Character Spacing */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between">
                <span className="text-gf-text font-medium">Character Spacing</span>
                <span className="font-mono text-gf-text-muted">{settings.charSpacing} cols</span>
              </div>
              <input
                type="range"
                min={0}
                max={4}
                value={settings.charSpacing}
                disabled={disabledSpacing}
                onChange={(e) => onChange({ charSpacing: parseInt(e.target.value, 10) })}
                className="accent-gf-level-3 cursor-pointer"
              />
              {disabledSpacing && (
                <span className="text-[11px] text-gf-warn">
                  Disabled for shaping-dependent scripts.
                </span>
              )}
            </div>

            {/* Column Stretch */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between">
                <span className="text-gf-text font-medium">Column Stretch</span>
                <span className="font-mono text-gf-text-muted">{settings.columnStretch}x</span>
              </div>
              <input
                type="range"
                min={1}
                max={3}
                value={settings.columnStretch}
                onChange={(e) => onChange({ columnStretch: parseInt(e.target.value, 10) })}
                className="accent-gf-level-3 cursor-pointer"
              />
            </div>

            {/* Density / Threshold bias */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between">
                <span className="text-gf-text font-medium">Density (Thickness)</span>
                <span className="font-mono text-gf-text-muted">
                  {settings.density > 0 ? `+${settings.density}` : settings.density}
                </span>
              </div>
              <input
                type="range"
                min={-2}
                max={2}
                value={settings.density}
                onChange={(e) => onChange({ density: parseInt(e.target.value, 10) })}
                className="accent-gf-level-3 cursor-pointer"
              />
            </div>

            {/* Alignment */}
            <div className="flex flex-col gap-1.5">
              <span className="text-gf-text font-medium">Alignment inside 53-week window</span>
              <div className="grid grid-cols-3 gap-1">
                {(["left", "center", "right"] as Alignment[]).map((align) => (
                  <button
                    key={align}
                    type="button"
                    onClick={() => onChange({ alignment: align })}
                    className={`py-1 rounded text-xs capitalize ${
                      settings.alignment === align
                        ? "bg-gf-surface-raised font-bold text-gf-text border border-gf-border"
                        : "bg-gf-surface text-gf-text-muted hover:text-gf-text"
                    }`}
                  >
                    {align}
                  </button>
                ))}
              </div>
            </div>

            {/* Render Mode */}
            <div className="flex flex-col gap-1.5">
              <span className="text-gf-text font-medium">Render Mode</span>
              <div className="grid grid-cols-3 gap-1">
                {(["auto", "pixel", "canvas"] as RenderMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onChange({ renderMode: mode })}
                    className={`py-1 rounded text-xs capitalize ${
                      settings.renderMode === mode
                        ? "bg-gf-surface-raised font-bold text-gf-text border border-gf-border"
                        : "bg-gf-surface text-gf-text-muted hover:text-gf-text"
                    }`}
                  >
                    {mode}
                  </button>
                ))}
              </div>
              <span className="text-[10px] text-gf-text-muted">
                {settings.renderMode === "pixel"
                  ? "Uses pixel font; folds letters to uppercase."
                  : settings.renderMode === "canvas"
                  ? "Uses browser canvas; preserves lowercase."
                  : "Automatic hybrid."}
              </span>
            </div>

            {/* Intensity Level */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between">
                <span className="text-gf-text font-medium">Contribution Intensity</span>
                <span className="font-mono text-gf-text-muted">Level {settings.intensity}</span>
              </div>
              <input
                type="range"
                min={1}
                max={4}
                value={settings.intensity}
                disabled={settings.shading}
                onChange={(e) => onChange({ intensity: parseInt(e.target.value, 10) })}
                className="accent-gf-level-3 cursor-pointer"
              />
            </div>
          </div>

          {/* Checkbox row */}
          <div className="flex flex-wrap items-center gap-6 pt-2 border-t border-gf-border">
            <label className="flex items-center gap-2 cursor-pointer text-gf-text select-none">
              <input
                type="checkbox"
                checked={settings.shading}
                onChange={(e) => onChange({ shading: e.target.checked })}
                className="rounded accent-gf-level-3"
              />
              <span>Multi-level shading (Canvas)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer text-gf-text select-none">
              <input
                type="checkbox"
                checked={settings.invert}
                onChange={(e) => onChange({ invert: e.target.checked })}
                className="rounded accent-gf-level-3"
              />
              <span>Invert pattern</span>
            </label>

            <button
              type="button"
              onClick={handleReset}
              className="ml-auto flex items-center gap-1 text-xs text-gf-text-muted hover:text-gf-text"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset options</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
