/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        pitch: {
          darkest: "#060A12",
          dark: "#0B111E",
          card: "#111A2E",
          cardHover: "#16223D",
          border: "#1E2D4A",
          green: "#00E676",
          greenLight: "#4ADE80",
          greenDark: "#059669",
        },
        group: {
          a: "#10B981", // Emerald
          b: "#3B82F6", // Blue
          c: "#EF4444", // Red
        },
      },
      backgroundImage: {
        "pitch-pattern": "radial-gradient(ellipse at top, #142444 0%, #080D18 70%)",
      },
      fontFamily: {
        sans: ["Inter", "-apple-system", "BlinkMacSystemFont", "Segoe UI", "Roboto", "sans-serif"],
        arabic: ["Cairo", "Amiri", "Tahoma", "sans-serif"],
      },
      boxShadow: {
        glow: "0 0 25px -5px rgba(0, 230, 118, 0.25)",
        "glow-blue": "0 0 25px -5px rgba(59, 130, 246, 0.25)",
        "glow-red": "0 0 25px -5px rgba(239, 68, 68, 0.25)",
      },
    },
  },
  plugins: [],
};

