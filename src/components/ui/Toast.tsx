import { CheckCircle2, AlertTriangle, AlertCircle, X } from "lucide-react";

export interface ToastProps {
  message: string;
  type?: "success" | "warning" | "error" | "info";
  onClose?: () => void;
}

export function Toast({ message, type = "info", onClose }: ToastProps) {
  if (!message) return null;

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-gf-level-3 shrink-0" />,
    warning: <AlertTriangle className="w-4 h-4 text-gf-warn shrink-0" />,
    error: <AlertCircle className="w-4 h-4 text-gf-error shrink-0" />,
    info: <CheckCircle2 className="w-4 h-4 text-gf-focus shrink-0" />,
  };

  return (
    <div
      role="status"
      className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-xl bg-gf-surface-raised border border-gf-border shadow-floating text-sm text-gf-text animate-in fade-in slide-in-from-bottom-3 duration-200"
    >
      {icons[type]}
      <span>{message}</span>
      {onClose && (
        <button
          onClick={onClose}
          className="text-gf-text-muted hover:text-gf-text ml-2 focus:outline-none"
          aria-label="Dismiss message"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}
