import {
  Type,
  Grid,
  Calendar,
  Clock,
  ListTodo,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

const STEPS = [
  {
    num: "1",
    title: "Enter text",
    description: "Type names, dates, numbers, emojis, or Unicode symbols in the generator.",
    icon: <Type className="w-5 h-5 text-gf-level-3" />,
  },
  {
    num: "2",
    title: "Text is converted into pixels",
    description: "Each glyph is mapped to a crisp 5×7 font or rasterized via the canvas engine.",
    icon: <Grid className="w-5 h-5 text-gf-level-3" />,
  },
  {
    num: "3",
    title: "Pixels become contribution cells",
    description: "Bitmaps align into a 7-row column matrix matching weekday contribution graphs.",
    icon: <Sparkles className="w-5 h-5 text-gf-level-3" />,
  },
  {
    num: "4",
    title: "Cells are mapped to real dates",
    description: "Calendar arithmetic maps every cell to an exact future date based on your start choice.",
    icon: <Clock className="w-5 h-5 text-gf-level-3" />,
  },
  {
    num: "5",
    title: "The activity schedule is generated",
    description: "Active days group by month with precise contribution requirements.",
    icon: <Calendar className="w-5 h-5 text-gf-level-3" />,
  },
  {
    num: "6",
    title: "You follow the schedule",
    description: "Follow the plan day-by-day, mark days done online or tick them off a printed calendar.",
    icon: <CheckCircle2 className="w-5 h-5 text-gf-level-3" />,
  },
  {
    num: "7",
    title: "The graph forms the pattern",
    description: "Over weeks and months, your contribution graph reveals your custom artwork.",
    icon: <ListTodo className="w-5 h-5 text-gf-level-3" />,
  },
];

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-16 md:py-24 border-t border-gf-border/60 scroll-mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex flex-col gap-2 mb-12 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center justify-center gap-2 mb-1">
            <span className="w-2 h-2 rounded-full bg-gf-level-3" />
            <span className="text-xs uppercase font-mono tracking-widest text-gf-level-3 font-semibold">
              The Seven Steps
            </span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-gf-text">
            How GlyphForge Works
          </h2>
          <p className="text-gf-text-muted text-sm sm:text-base">
            From raw Unicode characters to a physical printable schedule and a living contribution graph.
          </p>
        </div>

        {/* 7 Step Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {STEPS.map((step) => (
            <div
              key={step.num}
              className="p-6 rounded-2xl bg-gf-surface border border-gf-border shadow-sm flex flex-col justify-between hover:border-gf-border/90 hover:translate-y-[-2px] transition-all"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-xl bg-gf-surface-raised border border-gf-border">
                    {step.icon}
                  </div>
                  <span className="text-2xl font-black font-mono text-gf-border">
                    0{step.num}
                  </span>
                </div>
                <h3 className="font-bold text-base text-gf-text mb-2">{step.title}</h3>
                <p className="text-xs text-gf-text-muted leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}

          {/* Bonus callout card */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-gf-surface-raised to-gf-surface border border-gf-border shadow-sm flex flex-col justify-center">
            <span className="text-xs font-mono uppercase tracking-wider text-gf-level-3 font-semibold mb-2">
              Purely Deterministic
            </span>
            <p className="text-xs text-gf-text-muted leading-relaxed">
              Everything runs locally in your browser. No server calls, no authentication tokens, no OAuth.
            </p>
          </div>
        </div>

        {/* Advisory Note */}
        <div className="mt-12 p-4 rounded-xl bg-gf-surface border border-gf-border text-center max-w-3xl mx-auto text-xs text-gf-text-muted">
          <p>
            <strong>Note on platform rendering:</strong> GlyphForge is an activity planner. Contribution graphs
            differ by platform in timezone handling, update latencies, and commit indexing rules.
          </p>
        </div>
      </div>
    </section>
  );
}
