import { useState, useRef, useCallback, useEffect } from "react";

export type GenerationPhase =
  | "idle"
  | "compress"
  | "textToPixels"
  | "pixelsToGraph"
  | "graphToDates"
  | "revealSchedule"
  | "done";

export interface GenerationTimeline {
  phase: GenerationPhase;
  isGenerating: boolean;
  startAnimation: (cols: number, isShort?: boolean) => void;
  skipAnimation: () => void;
  reset: () => void;
}

export function useGenerationTimeline(reducedMotion = false): GenerationTimeline {
  const [phase, setPhase] = useState<GenerationPhase>("idle");
  const [isGenerating, setIsGenerating] = useState(false);
  const timerRef = useRef<NodeJS.Timeout[]>([]);

  const clearTimers = useCallback(() => {
    for (const t of timerRef.current) {
      clearTimeout(t);
    }
    timerRef.current = [];
  }, []);

  const skipAnimation = useCallback(() => {
    clearTimers();
    setPhase("done");
    setIsGenerating(false);
  }, [clearTimers]);

  const reset = useCallback(() => {
    clearTimers();
    setPhase("idle");
    setIsGenerating(false);
  }, [clearTimers]);

  const startAnimation = useCallback(
    (cols: number, isShort = false) => {
      clearTimers();
      setIsGenerating(true);

      // Automatic skip if columns > 120 or reduced motion
      if (reducedMotion || cols > 120) {
        setPhase("done");
        setIsGenerating(false);
        return;
      }

      if (isShort) {
        // Shortened 800ms animation
        setPhase("pixelsToGraph");
        const t1 = setTimeout(() => setPhase("revealSchedule"), 400);
        const t2 = setTimeout(() => {
          setPhase("done");
          setIsGenerating(false);
        }, 800);
        timerRef.current = [t1, t2];
        return;
      }

      // Full 3200ms sequence
      setPhase("compress");
      const t0 = setTimeout(() => setPhase("textToPixels"), 300);
      const t1 = setTimeout(() => setPhase("pixelsToGraph"), 900);
      const t2 = setTimeout(() => setPhase("graphToDates"), 1700);
      const t3 = setTimeout(() => setPhase("revealSchedule"), 2300);
      const t4 = setTimeout(() => {
        setPhase("done");
        setIsGenerating(false);
      }, 3200);

      timerRef.current = [t0, t1, t2, t3, t4];
    },
    [clearTimers, reducedMotion]
  );

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  return {
    phase,
    isGenerating,
    startAnimation,
    skipAnimation,
    reset,
  };
}
