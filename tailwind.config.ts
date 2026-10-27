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
        coral: { DEFAULT: "#FF6B5E", dark: "#E8503F", soft: "#FFE9E6" },
        amber: { DEFAULT: "#F2A93B", dark: "#D98E1F", soft: "#FDF0DA" },
        cream: { DEFAULT: "#FFF9F2", deep: "#FFF3E2", edge: "#F3E3CB" },
        ink: { DEFAULT: "#2A3B41", soft: "#64757B" },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        display: ["var(--font-display)", "var(--font-sans)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 10px 30px -12px rgb(11 85 99 / 0.16), 0 2px 6px -2px rgb(11 85 99 / 0.08)",
        lift: "0 18px 42px -14px rgb(11 85 99 / 0.28)",
        coral: "0 10px 22px -8px rgb(255 107 94 / 0.55)",
        amber: "0 10px 22px -8px rgb(242 169 59 / 0.55)",
        teal: "0 10px 22px -8px rgb(11 85 99 / 0.5)",
      },
    },
  },
  plugins: [],
};
export default config;
