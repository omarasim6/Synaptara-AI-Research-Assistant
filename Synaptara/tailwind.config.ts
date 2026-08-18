import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./providers/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        cream: "#EDEADE",
        ink: "#1a3a35",
        sage: "#4a7c6f",
        "ink-light": "#2d5248",
        /* Dark mode surface tokens */
        "dark-bg": "#0f1e1b",
        "dark-surface": "#162b26",
        "dark-surface-2": "#1c332d",
        "dark-border": "#2a453e",
        "dark-text": "#EDEADE",
        "dark-muted": "#8fada4",
      },
      fontFamily: {
        serif: ["Georgia", "Times New Roman", "serif"],
        sans: ["Inter", "system-ui", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
