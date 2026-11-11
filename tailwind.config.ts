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
        /* Sleek pass: flat, neutral shadows — no colored glows. */
        card: "0 1px 2px rgb(20 27 31 / 0.05), 0 10px 30px -14px rgb(20 27 31 / 0.14)",
        lift: "0 16px 40px -16px rgb(20 27 31 / 0.22)",
        coral: "0 6px 16px -6px rgb(20 27 31 / 0.25)",
        amber: "0 6px 16px -6px rgb(20 27 31 / 0.22)",
        teal: "0 6px 16px -6px rgb(7 60 70 / 0.35)",
      },
    },
  },
  plugins: [],
};
export default config;
