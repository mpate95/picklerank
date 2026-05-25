import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#09131a",
        court: "#102a43",
        lime: "#d6ff6b",
        cyan: "#79f2ff",
        coral: "#ff8a5b",
        panel: "#0f1d29",
        line: "#1f3547",
      },
      boxShadow: {
        panel: "0 20px 60px rgba(0, 0, 0, 0.28)",
      },
      backgroundImage: {
        "court-grid":
          "linear-gradient(rgba(121,242,255,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(121,242,255,0.08) 1px, transparent 1px)",
      },
      fontFamily: {
        sans: ["ui-sans-serif", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};

export default config;
