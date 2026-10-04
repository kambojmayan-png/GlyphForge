import { useState, useEffect } from "react";
import { AnimationMode } from "../types/pattern";

export function usePrefersReducedMotion(inAppAnimationMode: AnimationMode = "full"): boolean {
  const [osReduced, setOsReduced] = useState<boolean>(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const handleChange = (e: MediaQueryListEvent) => {
      setOsReduced(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  return osReduced || inAppAnimationMode === "reduced" || inAppAnimationMode === "off";
}
