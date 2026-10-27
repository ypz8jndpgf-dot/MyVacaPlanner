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
      },
      fontFamily: {
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
