import React, { forwardRef } from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "subtle" | "danger";
  size?: "sm" | "md" | "lg";
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = "secondary", size = "md", className = "", children, ...props }, ref) => {
    const base =
      "inline-flex items-center justify-center font-medium rounded-lg transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gf-focus active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed select-none";

    const variants = {
      primary:
        "bg-gf-level-3 text-black hover:bg-gf-level-4 font-semibold shadow-sm hover:shadow",
      secondary:
        "bg-gf-surface-raised border border-gf-border text-gf-text hover:bg-gf-surface hover:border-gf-text-muted/40",
      outline:
        "border border-gf-border bg-transparent text-gf-text hover:border-gf-text-muted hover:bg-gf-surface-raised/40",
      subtle: "text-gf-text-muted hover:text-gf-text hover:bg-gf-surface-raised/60",
      danger: "bg-gf-error/15 border border-gf-error/40 text-gf-error hover:bg-gf-error/25",
    };

    const sizes = {
      sm: "text-xs px-2.5 py-1.5 gap-1.5 h-8",
      md: "text-sm px-4 py-2 gap-2 h-10",
      lg: "text-base px-5 py-2.5 gap-2.5 h-12",
    };

    return (
      <button
        ref={ref}
        className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = "Button";
