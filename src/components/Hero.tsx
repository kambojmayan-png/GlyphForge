import { useState, useEffect, useRef } from "react";
import { Play, Pause, ArrowRight } from "lucide-react";
import { Button } from "./ui/Button";
import { generatePatternMatrix } from "../engine/patternGenerator";
import { normalizeInput } from "../utils/textUtils";
import { DEFAULT_SETTINGS } from "../engine/defaults";
import { PatternMatrix } from "../types/pattern";

const HERO_SAMPLES = ["FORGE", "2026", "❤", "CODE", "你好"];

export function Hero() {
  const [sampleIndex, setSampleIndex] = useState(0);
  const [currentMatrix, setCurrentMatrix] = useState<PatternMatrix | null>(null);
  const [revealedCols, setRevealedCols] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const bgCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const sample = HERO_SAMPLES[sampleIndex];

  // Pre-generate matrix for the sample
  useEffect(() => {
    let active = true;
    async function loadSample() {
      const norm = normalizeInput(sample);
      const m = await generatePatternMatrix(norm, {
        ...DEFAULT_SETTINGS,
        text: sample,
      });
      if (active) {
        setCurrentMatrix(m);
        setRevealedCols(0);
      }
    }
    loadSample();
    return () => {
      active = false;
    };
  }, [sample]);

  // Demo loop
  useEffect(() => {
    if (!currentMatrix || isPaused) return;

    let timeoutId: NodeJS.Timeout;
    const totalCols = currentMatrix.cols;

    if (revealedCols < totalCols) {
      // Column sweep in
      timeoutId = setTimeout(() => {
        setRevealedCols((c) => c + 1);
      }, 24);
    } else {
      // Hold 2.5s, then next sample
      timeoutId = setTimeout(() => {
        setSampleIndex((i) => (i + 1) % HERO_SAMPLES.length);
      }, 2500);
    }

    return () => clearTimeout(timeoutId);
  }, [currentMatrix, revealedCols, isPaused]);

  // Ambient background canvas
  useEffect(() => {
    const canvas = bgCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = canvas.parentElement?.clientWidth || 800);
    let height = (canvas.height = canvas.parentElement?.clientHeight || 400);

    const onResize = () => {
      if (!canvas.parentElement) return;
      width = canvas.width = canvas.parentElement.clientWidth;
      height = canvas.height = canvas.parentElement.clientHeight;
    };
    window.addEventListener("resize", onResize);

    const cells: { x: number; y: number; alpha: number; delta: number }[] = [];
    for (let i = 0; i < 40; i++) {
      cells.push({
        x: Math.random() * width,
        y: Math.random() * height,
        alpha: Math.random() * 0.15,
        delta: (Math.random() * 0.005 + 0.002) * (Math.random() > 0.5 ? 1 : -1),
      });
    }

    const draw = () => {
      ctx.clearRect(0, 0, width, height);
      for (const cell of cells) {
        cell.alpha += cell.delta;
        if (cell.alpha <= 0.01) {
          cell.alpha = 0.01;
          cell.delta = Math.abs(cell.delta);
          cell.x = Math.random() * width;
          cell.y = Math.random() * height;
        } else if (cell.alpha >= 0.15) {
          cell.alpha = 0.15;
          cell.delta = -Math.abs(cell.delta);
        }
        ctx.fillStyle = `rgba(63, 169, 107, ${cell.alpha})`;
        ctx.fillRect(Math.floor(cell.x / 16) * 16, Math.floor(cell.y / 16) * 16, 12, 12);
      }
      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
    };
  }, []);

  const headlineWords = "Turn anything into contribution art.".split(" ");

  return (
    <section className="relative overflow-hidden pt-12 pb-20 md:pt-20 md:pb-28 border-b border-gf-border/60">
      {/* Background ambient layer */}
      <canvas
        ref={bgCanvasRef}
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-0 opacity-40"
      />

      {/* Subtle radial green glow behind demo */}
      <div
        className="pointer-events-none absolute right-1/4 top-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full bg-gf-level-1/10 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
        {/* Left column: Copy & CTAs */}
        <div className="lg:col-span-7 flex flex-col items-start gap-6">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-gf-text leading-[1.1]">
            {headlineWords.map((word, i) => (
              <span
                key={i}
                className="inline-block animate-in fade-in slide-in-from-bottom-3 duration-500 mr-2.5 sm:mr-3"
                style={{ animationDelay: `${i * 60}ms` }}
              >
                {word}
              </span>
            ))}
          </h1>

          <p className="text-lg sm:text-xl text-gf-text-muted max-w-2xl leading-relaxed">
            Convert names, dates, symbols, emojis, and Unicode text into a
            contribution-calendar pattern and get the exact days you need to be
            active.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <a href="#generator">
              <Button variant="primary" size="lg" className="shadow-lg shadow-gf-level-2/20">
                <span>Create Your Pattern</span>
                <ArrowRight className="w-4 h-4 ml-1.5 transition-transform group-hover:translate-x-1" />
              </Button>
            </a>
            <a href="#how-it-works">
              <Button variant="secondary" size="lg">
                See How It Works
              </Button>
            </a>
          </div>
        </div>

        {/* Right column: Interactive real-engine demo */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div
            role="region"
            aria-label="Live contribution graph demonstration"
            className="w-full rounded-2xl bg-gf-surface border border-gf-border p-6 shadow-floating relative transition-transform hover:scale-[1.01]"
          >
            <div className="flex items-center justify-between pb-3 border-b border-gf-border mb-4">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2.5 h-2.5 rounded-full bg-gf-level-3 animate-pulse" />
                <span className="text-xs font-mono font-medium text-gf-text-muted">
                  LIVE ENGINE DEMO
                </span>
              </div>
              <button
                onClick={() => setIsPaused(!isPaused)}
                className="flex items-center gap-1.5 text-xs text-gf-text-muted hover:text-gf-text px-2 py-1 rounded bg-gf-surface-raised hover:bg-gf-surface border border-gf-border"
                aria-label={isPaused ? "Resume live demo" : "Pause live demo"}
              >
                {isPaused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                <span>{isPaused ? "Resume" : "Pause"}</span>
              </button>
            </div>

            {/* Matrix View */}
            <div className="overflow-x-auto custom-scrollbar py-2 flex items-center justify-center min-h-[140px]">
              {currentMatrix ? (
                <div
                  className="grid gap-[3px] select-none"
                  style={{
                    gridTemplateRows: "repeat(7, 12px)",
                    gridAutoFlow: "column",
                  }}
                  aria-hidden="true"
                >
                  {Array.from({ length: currentMatrix.cols }).map((_, c) => {
                    const isVisible = c <= revealedCols;
                    return Array.from({ length: 7 }).map((__, r) => {
                      const level = isVisible
                        ? currentMatrix.levels[r * currentMatrix.cols + c]
                        : 0;

                      return (
                        <div
                          key={`${c}-${r}`}
                          className="w-[12px] h-[12px] rounded-[2.5px] transition-colors duration-150"
                          style={{
                            backgroundColor:
                              level === 0
                                ? "var(--gf-level-0)"
                                : level === 1
                                ? "var(--gf-level-1)"
                                : level === 2
                                ? "var(--gf-level-2)"
                                : level === 3
                                ? "var(--gf-level-3)"
                                : "var(--gf-level-4)",
                          }}
                        />
                      );
                    });
                  })}
                </div>
              ) : (
                <div className="text-sm text-gf-text-muted font-mono animate-pulse">
                  Rasterizing glyphs...
                </div>
              )}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-gf-border mt-3 text-xs text-gf-text-muted font-mono">
              <span>
                showing: <strong className="text-gf-text font-semibold">{sample}</strong>
              </span>
              <span>7 rows × {currentMatrix?.cols ?? 0} cols</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
