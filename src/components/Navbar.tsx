import { useState, useEffect } from "react";
import { Moon, Sun, Menu, X, Github } from "lucide-react";
import { ThemeMode } from "../types/pattern";

export interface NavbarProps {
  theme: ThemeMode;
  onThemeToggle: () => void;
}

export function Navbar({ theme, onThemeToggle }: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const repoUrl =
    import.meta.env.VITE_REPO_URL || "https://github.com/kambojmayan-png/GlyphForge";

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 24);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-40 w-full transition-all duration-200 ${
        scrolled
          ? "h-[52px] bg-gf-bg/90 backdrop-blur border-b border-gf-border shadow-sm"
          : "h-16 bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto h-full px-4 sm:px-6 flex items-center justify-between">
        {/* Logo */}
        <a
          href="#"
          className="flex items-center gap-2.5 font-bold text-lg text-gf-text hover:opacity-90 transition-opacity"
        >
          {/* 5x5 G mark */}
          <svg
            className="w-6 h-6 shrink-0"
            viewBox="0 0 32 32"
            fill="none"
            aria-hidden="true"
          >
            <rect width="32" height="32" rx="6" fill="var(--gf-surface-raised)" />
            <rect x="5" y="9" width="3.5" height="3.5" rx="1" fill="var(--gf-level-2)" />
            <rect x="5" y="14" width="3.5" height="3.5" rx="1" fill="var(--gf-level-2)" />
            <rect x="5" y="19" width="3.5" height="3.5" rx="1" fill="var(--gf-level-2)" />
            <rect x="9.5" y="5" width="3.5" height="3.5" rx="1" fill="var(--gf-level-3)" />
            <rect x="9.5" y="23.5" width="3.5" height="3.5" rx="1" fill="var(--gf-level-3)" />
            <rect x="14" y="5" width="3.5" height="3.5" rx="1" fill="var(--gf-level-3)" />
            <rect x="14" y="14" width="3.5" height="3.5" rx="1" fill="var(--gf-level-4)" />
            <rect x="14" y="23.5" width="3.5" height="3.5" rx="1" fill="var(--gf-level-3)" />
            <rect x="18.5" y="5" width="3.5" height="3.5" rx="1" fill="var(--gf-level-3)" />
            <rect x="18.5" y="14" width="3.5" height="3.5" rx="1" fill="var(--gf-level-4)" />
            <rect x="18.5" y="19" width="3.5" height="3.5" rx="1" fill="var(--gf-level-2)" />
            <rect x="18.5" y="23.5" width="3.5" height="3.5" rx="1" fill="var(--gf-level-3)" />
            <rect x="23" y="9" width="3.5" height="3.5" rx="1" fill="var(--gf-level-2)" />
            <rect x="23" y="14" width="3.5" height="3.5" rx="1" fill="var(--gf-level-4)" />
            <rect x="23" y="19" width="3.5" height="3.5" rx="1" fill="var(--gf-level-2)" />
          </svg>
          <span className="tracking-tight text-gf-text">GlyphForge</span>
        </a>

        {/* Desktop Nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm text-gf-text-muted">
          <a
            href="#generator"
            className="hover:text-gf-text transition-colors scroll-mt-20 font-medium"
          >
            Generator
          </a>
          <a
            href="#how-it-works"
            className="hover:text-gf-text transition-colors scroll-mt-20 font-medium"
          >
            How It Works
          </a>
          <a
            href="#about"
            className="hover:text-gf-text transition-colors scroll-mt-20 font-medium"
          >
            About
          </a>

          {repoUrl && (
            <a
              href={repoUrl}
              target="_blank"
              rel="noreferrer"
              className="hover:text-gf-text transition-colors p-1.5 rounded-lg hover:bg-gf-surface-raised"
              aria-label="GitHub Repository"
            >
              <Github className="w-4 h-4" />
            </a>
          )}

          <button
            onClick={onThemeToggle}
            className="p-1.5 rounded-lg hover:bg-gf-surface-raised text-gf-text-muted hover:text-gf-text transition-colors"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            {theme === "dark" ? (
              <Sun className="w-4 h-4" />
            ) : (
              <Moon className="w-4 h-4" />
            )}
          </button>
        </nav>

        {/* Mobile controls */}
        <div className="flex md:hidden items-center gap-2">
          <button
            onClick={onThemeToggle}
            className="p-2 rounded-lg text-gf-text-muted hover:text-gf-text focus:outline-none"
            aria-label="Toggle theme"
          >
            {theme === "dark" ? (
              <Sun className="w-5 h-5" />
            ) : (
              <Moon className="w-5 h-5" />
            )}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 rounded-lg text-gf-text-muted hover:text-gf-text focus:outline-none"
            aria-label="Toggle mobile menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer Sheet */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-x-0 top-[52px] bg-gf-surface border-b border-gf-border p-6 shadow-floating flex flex-col gap-4 animate-in slide-in-from-top-2 duration-150">
          <a
            href="#generator"
            onClick={() => setMobileMenuOpen(false)}
            className="text-base font-medium text-gf-text py-2"
          >
            Generator
          </a>
          <a
            href="#how-it-works"
            onClick={() => setMobileMenuOpen(false)}
            className="text-base font-medium text-gf-text py-2"
          >
            How It Works
          </a>
          <a
            href="#about"
            onClick={() => setMobileMenuOpen(false)}
            className="text-base font-medium text-gf-text py-2"
          >
            About
          </a>
          {repoUrl && (
            <a
              href={repoUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 text-base font-medium text-gf-text-muted py-2"
            >
              <Github className="w-5 h-5" />
              <span>GitHub</span>
            </a>
          )}
        </div>
      )}
    </header>
  );
}
