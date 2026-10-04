import React, { useState, useEffect, useRef } from "react";

export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactElement;
  side?: "top" | "bottom" | "left" | "right";
}

export function Tooltip({ content, children, side = "top" }: TooltipProps) {
  const [visible, setVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setVisible(false);
      }
    };
    if (visible) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [visible]);

  const sideClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  return (
    <div
      ref={containerRef}
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && content && (
        <div
          role="tooltip"
          className={`absolute z-50 pointer-events-none whitespace-nowrap rounded-md bg-gf-surface-raised border border-gf-border px-2.5 py-1.5 text-xs text-gf-text shadow-floating transition-opacity duration-150 ${sideClasses[side]}`}
        >
          {content}
        </div>
      )}
    </div>
  );
}
