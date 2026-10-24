import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        surface: "var(--surface)",
        raised: "var(--raised)",
        fill: "var(--fill)",
        line: "var(--line)",
        ink: "var(--ink)",
        mute: "var(--mute)",
        faint: "var(--faint)",
        accent: "var(--accent)",
        "accent-ink": "var(--accent-ink)",
        paper: "var(--bg)",
        side: "var(--bg)",
        card: "var(--surface)",
        accentsoft: "var(--fill)",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        mono: ["var(--font-mono)", "IBM Plex Mono", "ui-monospace", "monospace"],
      },
      fontSize: {
        meta: ["12px", { lineHeight: "16px" }],
        body: ["13px", { lineHeight: "20px" }],
      },
      borderRadius: {
        control: "6px",
        panel: "8px",
      },
      boxShadow: {
        card: "none",
      },
      transitionDuration: {
        ui: "140ms",
      },
    },
  },
  plugins: [],
};

export default config;
