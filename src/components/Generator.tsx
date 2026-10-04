import { useState } from "react";
import { Sparkles, Loader2, Info, ChevronDown, ChevronUp } from "lucide-react";
import { PatternSettings, PatternMatrix, FitSuggestion } from "../types/pattern";
import { EngineError } from "../types/schedule";
import { GenerationTimeline } from "../hooks/useGenerationTimeline";
import { TextInput } from "./TextInput";
import { PlatformSelector } from "./PlatformSelector";
import { DateSelector } from "./DateSelector";
import { StyleControls } from "./StyleControls";
import { Button } from "./ui/Button";
import { isShapingDependentScript } from "../utils/textUtils";
import { PLATFORM_PROFILES } from "../engine/platforms";

export interface GeneratorProps {
  settings: PatternSettings;
  onUpdateSettings: (patch: Partial<PatternSettings>) => void;
  miniPreview: PatternMatrix | null;
  timeline: GenerationTimeline;
  onGenerate: () => void;
  error: EngineError | null;
  fitSuggestions: FitSuggestion[];
  onApplyFitSuggestion: (patch: Partial<PatternSettings>) => void;
  resolvedExplanation?: string;
  matrixForExplainer?: PatternMatrix | null;
}

export function Generator({
  settings,
  onUpdateSettings,
  miniPreview,
  timeline,
  onGenerate,
  error,
  fitSuggestions,
  onApplyFitSuggestion,
  resolvedExplanation,
  matrixForExplainer,
}: GeneratorProps) {
  const [showExplainer, setShowExplainer] = useState(false);
  const profile = PLATFORM_PROFILES[settings.platform];
  const hasShapingLine = isShapingDependentScript(settings.text);

  const getPhaseLabel = (phase: string) => {
    switch (phase) {
      case "compress":
        return "Validating...";
      case "textToPixels":
        return "Rasterizing glyphs...";
      case "pixelsToGraph":
        return "Mapping to graph...";
      case "graphToDates":
        return "Calculating dates...";
      case "revealSchedule":
        return "Building schedule...";
      default:
        return "Generating...";
    }
  };

  return (
    <section id="generator" className="py-12 md:py-16 scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col gap-2 mb-8">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gf-level-3" />
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gf-text">
              Pattern Generator
            </h2>
          </div>
          <p className="text-gf-text-muted text-sm sm:text-base">
            Type your message or symbols, choose your platform and start date, and forge
            your contribution schedule.
          </p>
        </div>

        {/* Fit suggestions banner */}
        {fitSuggestions.length > 0 && (
          <div className="mb-6 p-4 rounded-xl bg-gf-warn/10 border border-gf-warn/30 text-xs text-gf-text flex flex-col gap-2.5">
            <div className="flex items-center gap-2 font-semibold text-gf-warn">
              <Info className="w-4 h-4 shrink-0" />
              <span>This pattern is very wide and may require more than one contribution year.</span>
            </div>
            <p className="text-gf-text-muted">
              Here are alternatives that can fit within a standard 53-week year view:
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {fitSuggestions.map((sug, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 bg-gf-surface border border-gf-border px-3 py-1.5 rounded-lg text-xs"
                >
                  <span>{sug.description}</span>
                  <button
                    type="button"
                    onClick={() => onApplyFitSuggestion(sug.patch)}
                    className="font-semibold text-gf-focus hover:underline"
                  >
                    Apply
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Form Container */}
        <div className="rounded-2xl bg-gf-surface border border-gf-border p-6 md:p-8 shadow-floating flex flex-col gap-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column: Text Input */}
            <div className="lg:col-span-7 flex flex-col gap-6">
              <TextInput
                value={settings.text}
                onChange={(text) => onUpdateSettings({ text })}
                miniPreview={miniPreview}
                error={error?.code === "EMPTY_INPUT" || error?.code === "WHITESPACE_ONLY" ? error.message : undefined}
              />
            </div>

            {/* Right Column: Platform, Dates, Style */}
            <div className="lg:col-span-5 flex flex-col gap-6">
              <PlatformSelector
                value={settings.platform}
                onChange={(platform) => onUpdateSettings({ platform })}
              />

              <DateSelector
                startMode={settings.startMode}
                startDate={settings.startDate}
                preferredMonth={settings.preferredMonth}
                timeZone={settings.timeZone}
                platformWeekStartsOn={profile.weekStartsOn}
                onModeChange={(startMode) => onUpdateSettings({ startMode })}
                onStartDateChange={(startDate) => onUpdateSettings({ startDate })}
                onPreferredMonthChange={(preferredMonth) => onUpdateSettings({ preferredMonth })}
                resolvedExplanation={resolvedExplanation}
                error={error?.code === "INVALID_DATE" || error?.code === "PREFERRED_MONTH_PAST" ? error.message : undefined}
              />

              <StyleControls
                settings={settings}
                onChange={onUpdateSettings}
                disabledSpacing={hasShapingLine}
              />
            </div>
          </div>

          {/* Action Row */}
          <div className="pt-4 border-t border-gf-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setShowExplainer(!showExplainer)}
              className="flex items-center gap-1.5 text-xs text-gf-text-muted hover:text-gf-text font-medium"
            >
              <span>Show how this was built</span>
              {showExplainer ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </button>

            <Button
              variant="primary"
              size="lg"
              onClick={onGenerate}
              disabled={timeline.isGenerating}
              aria-busy={timeline.isGenerating}
              className="w-full sm:w-auto min-w-[200px]"
            >
              {timeline.isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span>{getPhaseLabel(timeline.phase)}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  <span>Generate Pattern</span>
                </>
              )}
            </Button>
          </div>

          {/* Explainer Drawer */}
          {showExplainer && matrixForExplainer && (
            <div className="mt-2 p-4 rounded-xl bg-gf-surface-raised border border-gf-border text-xs flex flex-col gap-3">
              <h4 className="font-semibold text-gf-text">Text-to-Pixel Inspection</h4>
              <p className="text-gf-text-muted">
                Input was normalized and split into graphemes. Matrix contains {matrixForExplainer.cols} columns and 7 rows.
              </p>
              {matrixForExplainer.fidelity && matrixForExplainer.fidelity.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  <span className="font-medium text-gf-text">Canvas Fidelity Estimates:</span>
                  <div className="flex flex-wrap gap-2">
                    {matrixForExplainer.fidelity.map((f, i) => (
                      <span
                        key={i}
                        className={`px-2 py-0.5 rounded border text-[11px] font-mono ${
                          f.value < 0.55
                            ? "bg-gf-warn/15 border-gf-warn text-gf-warn"
                            : "bg-gf-surface border-gf-border text-gf-text"
                        }`}
                      >
                        {f.cluster}: {Math.round(f.value * 100)}% IoU
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
