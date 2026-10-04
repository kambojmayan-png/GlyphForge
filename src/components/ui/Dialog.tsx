import React, { useEffect, useRef } from "react";
import { X } from "lucide-react";

export interface DialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export function Dialog({ open, onClose, title, children }: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (open) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
      return () => {
        document.body.style.overflow = "";
        window.removeEventListener("keydown", handleKeyDown);
      };
    }
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
    >
      <div
        ref={dialogRef}
        className="w-full max-w-lg rounded-2xl bg-gf-surface border border-gf-border p-6 shadow-floating text-gf-text animate-in zoom-in-95 duration-150 relative max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between pb-4 border-b border-gf-border mb-4">
          <h2 id="dialog-title" className="text-lg font-semibold text-gf-text">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gf-text-muted hover:text-gf-text hover:bg-gf-surface-raised focus:outline-none"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
}
