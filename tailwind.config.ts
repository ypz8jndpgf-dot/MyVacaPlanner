import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        teal: {
          DEFAULT: "#0B5563",
          dark: "#073C46",
          deep: "#052E36",
          light: "#0E6B7A",
          mist: "#E6F2F4",
        },
        coral: { DEFAULT: "#FF6B5E", dark: "#E8503F", soft: "#F9E9E5" },
        amber: { DEFAULT: "#F2A93B", dark: "#D98E1F", soft: "#F6ECD3" },
        /* Sleek pass (2026-11-11): the warm cream canvas becomes a clean
         * soft white, edges go neutral hairline, ink goes near-black. */
        cream: { DEFAULT: "#F7F7F4", deep: "#EFF0EB", edge: "#E2E4DC" },
        ink: { DEFAULT: "#141B1F", soft: "#5B686E" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        /* Facelift (2026-11-16): soft layered shadows — one restrained
         * system, no colored glows. card = resting surface, lift = raised
         * (hero/featured), pop = floating (sticky bars, toasts). */
        card: "0 1px 2px rgb(20 27 31 / 0.04), 0 8px 24px -12px rgb(20 27 31 / 0.12)",
        soft: "0 1px 2px rgb(20 27 31 / 0.04), 0 12px 32px -16px rgb(20 27 31 / 0.16)",
        lift: "0 20px 48px -20px rgb(20 27 31 / 0.28)",
        pop: "0 8px 28px -8px rgb(20 27 31 / 0.28)",
        coral: "0 6px 16px -6px rgb(232 80 63 / 0.45)",
        amber: "0 6px 16px -6px rgb(20 27 31 / 0.22)",
        teal: "0 6px 16px -6px rgb(7 60 70 / 0.35)",
      },
      borderRadius: {
        "4xl": "2rem",
      },
      keyframes: {
        fadeUp: {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-up": "fadeUp 0.25s ease-out both",
      },
    },
  },
  plugins: [],
};
export default config;
