import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePatternGenerator } from "./hooks/usePatternGenerator";
import { Navbar } from "./components/Navbar";
import { Hero } from "./components/Hero";
import { Generator } from "./components/Generator";
import { StatsCards } from "./components/StatsCards";
import { ContributionGraph } from "./components/ContributionGraph";
import { ActiveDaysList } from "./components/ActiveDaysList";
import { CalendarPlanner } from "./components/CalendarPlanner";
import { ExportControls } from "./components/ExportControls";
import { PrintableSchedule } from "./components/PrintableSchedule";
import { HowItWorks } from "./components/HowItWorks";
import { Footer } from "./components/Footer";
import { Toast } from "./components/ui/Toast";
import { LiveRegion } from "./components/ui/LiveRegion";
import { IsoDate, ThemeMode } from "./types/pattern";
import { AlertTriangle, Clock, FastForward, CheckCircle2 } from "lucide-react";

export function App() {
  const {
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
  } = usePatternGenerator();

  const [selectedDate, setSelectedDate] = useState<IsoDate | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [toastType, setToastType] = useState<"success" | "warning" | "error" | "info">("info");

  // Sync theme attribute on <html> element
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", settings.theme);
  }, [settings.theme]);

  const handleThemeToggle = () => {
    const nextTheme: ThemeMode = settings.theme === "dark" ? "light" : "dark";
    updateSettings({ theme: nextTheme });
  };

  const showToast = (
    msg: string,
    type: "success" | "warning" | "error" | "info" = "info"
  ) => {
    setToastMessage(msg);
    setToastType(type);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  // Generate initial pattern on load with sample "MAYAN" if no text entered
  useEffect(() => {
    if (!plan && !settings.text) {
      updateSettings({ text: "MAYAN" });
      generate({ ...settings, text: "MAYAN" });
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-gf-bg text-gf-text">
      {/* Live Region for Screen Readers */}
      <LiveRegion
        politeMessage={statusAnnouncement}
        assertiveMessage={error ? error.message : undefined}
      />

      {/* Sticky Navbar */}
      <Navbar theme={settings.theme} onThemeToggle={handleThemeToggle} />

      <main className="flex-1">
        {/* Hero Section */}
        <Hero />

        {/* Generator Section */}
        <Generator
          settings={settings}
          onUpdateSettings={updateSettings}
          miniPreview={miniPreview}
          timeline={timeline}
          onGenerate={() => generate()}
          error={error}
          fitSuggestions={plan?.fitSuggestions || []}
          onApplyFitSuggestion={(patch) => {
            updateSettings(patch);
            generate({ ...settings, ...patch });
          }}
          resolvedExplanation={plan?.placement.explanation}
          matrixForExplainer={plan?.matrix}
        />

        {/* Skip Animation overlay button during generation */}
        {timeline.isGenerating && (
          <div className="fixed top-20 right-6 z-50 animate-in fade-in duration-150">
            <button
              onClick={timeline.skipAnimation}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gf-surface-raised border border-gf-border text-xs font-semibold text-gf-text shadow-floating hover:bg-gf-surface transition-all"
            >
              <FastForward className="w-4 h-4 text-gf-focus" />
              <span>Skip animation</span>
            </button>
          </div>
        )}

        {/* Results Section */}
        {plan && (
          <section id="results" className="py-12 md:py-16 border-t border-gf-border/60">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col gap-10">
              {/* Results Heading */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gf-border">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-gf-level-3 shrink-0" />
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-gf-text">
                    Generated Pattern & Activity Schedule
                  </h3>
                </div>
                <div className="text-xs font-mono text-gf-text-muted">
                  Platform: <strong className="text-gf-text">{plan.summary.platformLabel}</strong> · Grid origin: {plan.summary.start}
                </div>
              </div>

              {/* Time Zone Advisory Note (if applicable) */}
              {plan.timeZoneAdvisory && (
                <div className="p-4 rounded-xl bg-gf-surface border border-gf-border flex items-start gap-3 text-xs text-gf-text">
                  <Clock className="w-4 h-4 text-gf-focus shrink-0 mt-0.5" />
                  <div>
                    <span className="font-semibold text-gf-text block mb-0.5">
                      Time Zone Advisory ({plan.timeZoneAdvisory.timeZone})
                    </span>
                    <p className="text-gf-text-muted leading-relaxed">
                      {plan.summary.platformLabel} timestamps contributions in <strong>UTC</strong>.
                      To map to your planned UTC date, complete your activity during your local window:{" "}
                      <strong className="text-gf-text font-mono font-bold">
                        {plan.timeZoneAdvisory.windowString}
                      </strong>.
                    </p>
                  </div>
                </div>
              )}

              {/* Warnings Banner */}
              {plan.warnings.length > 0 && (
                <div className="flex flex-col gap-2">
                  {plan.warnings.map((warn, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-gf-warn/10 border border-gf-warn/30 text-xs text-gf-text flex items-center gap-3"
                    >
                      <AlertTriangle className="w-4 h-4 text-gf-warn shrink-0" />
                      <span>{warn.message}</span>
                    </div>
                  ))}
                </div>
              )}

              {/* Stats Cards */}
              <StatsCards summary={plan.summary} reducedMotion={timeline.phase === "done"} />

              {/* Contribution Graph Preview */}
              <ContributionGraph
                matrix={plan.matrix}
                schedule={plan.schedule}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                staggerAnimation={timeline.phase === "pixelsToGraph" || timeline.phase === "compress"}
              />

              {/* Active Days List & Monthly Calendar Planner */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                <div className="lg:col-span-5">
                  <ActiveDaysList
                    schedule={plan.schedule}
                    selectedDate={selectedDate}
                    onSelectDate={(d) => {
                      setSelectedDate(d);
                      const el = document.querySelector("#results");
                      el?.scrollIntoView({ behavior: "smooth" });
                    }}
                    onCopySuccess={() => showToast("Copied active dates!", "success")}
                  />
                </div>

                <div className="lg:col-span-7">
                  <CalendarPlanner
                    months={plan.months}
                    selectedDate={selectedDate}
                    onSelectDate={setSelectedDate}
                    doneDates={doneDates}
                    onToggleDone={toggleDone}
                    platformUnit={plan.profile.unit}
                  />
                </div>
              </div>
            </div>
          </section>
        )}

        {/* How It Works Section */}
        <HowItWorks />
      </main>

      {/* Sticky Exports Bar when plan is available */}
      {plan && <ExportControls plan={plan} onToast={showToast} />}

      {/* Footer & About */}
      <Footer />

      {/* Transient Toast Notification */}
      {toastMessage && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setToastMessage(null)}
        />
      )}

      {/* Hidden container for print document rendering */}
      {plan &&
        typeof document !== "undefined" &&
        document.getElementById("print-root") &&
        createPortal(
          <PrintableSchedule
            plan={plan}
            options={{
              paper: "A4",
              orientation: "portrait",
              markerStyle: "shaded_symbol",
              firstWeekday: settings.printWeekStart,
              includeGraphStrip: true,
              showInactiveMarkers: true,
              rowMm: 14,
            }}
          />,
          document.getElementById("print-root")!
        )}
    </div>
  );
}
