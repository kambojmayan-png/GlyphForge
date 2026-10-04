/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        gf: {
          bg: "var(--gf-bg)",
          surface: "var(--gf-surface)",
          "surface-raised": "var(--gf-surface-raised)",
          border: "var(--gf-border)",
          text: "var(--gf-text)",
          "text-muted": "var(--gf-text-muted)",
          warn: "var(--gf-warn)",
          error: "var(--gf-error)",
          focus: "var(--gf-focus)",
          level: {
            0: "var(--gf-level-0)",
            1: "var(--gf-level-1)",
            2: "var(--gf-level-2)",
            3: "var(--gf-level-3)",
            4: "var(--gf-level-4)",
          },
        },
      },
      fontFamily: {
        sans: ["Geist", "ui-sans-serif", "system-ui", "-apple-system", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        floating: "var(--shadow-floating)",
      },
    },
  },
  plugins: [],
};
