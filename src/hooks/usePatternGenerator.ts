import { useState, useRef, useCallback, useEffect } from "react";
import { PatternSettings, PatternMatrix, IsoDate } from "../types/pattern";
import { Plan, EngineError } from "../types/schedule";
import { generatePlan } from "../engine";
import { generatePatternMatrix } from "../engine/patternGenerator";
import { normalizeInput } from "../utils/textUtils";
import { todayIso } from "../utils/dateUtils";
import { DEFAULT_SETTINGS } from "../engine/defaults";
import { useLocalStorage, fnv1a } from "./useLocalStorage";
import { useGenerationTimeline } from "./useGenerationTimeline";
import { usePrefersReducedMotion } from "./usePrefersReducedMotion";

export function usePatternGenerator() {
  const [settings, setSettings] = useLocalStorage<PatternSettings>(
    "glyphforge:v1:settings",
    DEFAULT_SETTINGS
  );

  const [plan, setPlan] = useState<Plan | null>(null);
  const [error, setError] = useState<EngineError | null>(null);
  const [miniPreview, setMiniPreview] = useState<PatternMatrix | null>(null);
  const [statusAnnouncement, setStatusAnnouncement] = useState<string>("");

  const reducedMotion = usePrefersReducedMotion(settings.animation);
  const timeline = useGenerationTimeline(reducedMotion);

  const abortControllerRef = useRef<AbortController | null>(null);
  const previousTextRef = useRef<string>("");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Derive planId for ticking "Mark done"
  const planId = plan
    ? fnv1a(
        JSON.stringify({
          text: plan.summary.input,
          platform: plan.summary.platformId,
          start: plan.summary.start,
          width: plan.summary.patternWidth,
        })
      )
    : "";

  const [doneDatesArray, setDoneDatesArray] = useLocalStorage<IsoDate[]>(
    planId ? `glyphforge:v1:done:${planId}` : "glyphforge:v1:done:noop",
    []
  );

  const doneDates = new Set<IsoDate>(doneDatesArray);

  const toggleDone = useCallback(
    (date: IsoDate) => {
      setDoneDatesArray((prev) => {
        const next = new Set(prev);
        if (next.has(date)) {
          next.delete(date);
        } else {
          next.add(date);
        }
        return Array.from(next);
      });
    },
    [setDoneDatesArray]
  );

  // Debounced mini-preview (200ms)
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (!settings.text.trim()) {
      setMiniPreview(null);
      return;
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const norm = normalizeInput(settings.text);
        if (norm.lines.length > 0) {
          const matrix = await generatePatternMatrix(norm, settings);
          setMiniPreview(matrix);
        } else {
          setMiniPreview(null);
        }
      } catch {
        setMiniPreview(null);
      }
    }, 200);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [settings.text, settings.sizePreset, settings.renderMode, settings.invert, settings.columnStretch]);

  const generate = useCallback(
    async (overrideSettings?: PatternSettings) => {
      const activeSettings = overrideSettings || settings;

      // Abort previous in-flight generation
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setError(null);

      const currentToday = todayIso(activeSettings.timeZone);

      const result = await generatePlan(activeSettings, {
        todayIso: currentToday,
        doneDates,
        signal: controller.signal,
      });

      if (controller.signal.aborted) {
        return;
      }

      if (!result.ok) {
        setError(result.error);
        timeline.reset();
        return;
      }

      const isShort =
        previousTextRef.current === activeSettings.text && plan !== null;
      previousTextRef.current = activeSettings.text;

      setPlan(result.value);
      setStatusAnnouncement("Pattern generated successfully.");
      timeline.startAnimation(result.value.matrix.cols, isShort);
    },
    [settings, doneDates, timeline, plan]
  );

  const updateSettings = useCallback(
    (patch: Partial<PatternSettings>) => {
      setSettings((prev) => ({ ...prev, ...patch }));
    },
    [setSettings]
  );

  return {
    settings,
    updateSettings,
    plan,
    error,
    miniPreview,
    statusAnnouncement,
    timeline,
    generate,
    doneDates,
    toggleDone,
  };
}
