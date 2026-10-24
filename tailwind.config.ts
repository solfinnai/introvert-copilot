import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#f3f0e9",
        side: "#e8e2d6",
        ink: "#1c1916",
        mute: "#6f675e",
        line: "#e3dcd0",
        card: "#fffcf8",
        accent: "#e24b1a",
        accentsoft: "#fde7dc",
      },
      fontFamily: {
        sans: ["var(--font-sans)", "ui-sans-serif", "system-ui", "sans-serif"],
        serif: ["var(--font-serif)", "ui-serif", "Georgia", "serif"],
        mono: ["var(--font-mono)", "ui-monospace", "monospace"],
      },
      boxShadow: {
        card: "0 1px 0 rgba(28, 25, 22, 0.04)",
      },
    },
  },
  plugins: [],
};

export default config;
