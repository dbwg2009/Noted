import type { Config } from "tailwindcss";

export default {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "sans-serif"],
      },
      colors: {
        brand: {
          blue: {
            50:  "#f0f5ff",
            100: "#e0ecff",
            200: "#c1d9ff",
            300: "#93b8ff",
            400: "#6595f5",
            500: "#4B7BEC",
            600: "#3563d1",
            700: "#2347b5",
            800: "#1b3590",
            900: "#142677",
          },
          teal: {
            50:  "#edfcf5",
            100: "#d2f8e7",
            200: "#a5f1cf",
            300: "#63e3b0",
            400: "#34d399",
            500: "#20bf8a",
            600: "#13a372",
            700: "#0c825d",
            800: "#09664b",
            900: "#07503c",
          },
        },
      },
    },
  },
  plugins: [],
} satisfies Config;
