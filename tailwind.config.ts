import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#f0fdf9",
          100: "#ccfbef",
          500: "#10b981",
          700: "#047857",
          900: "#064e3b"
        }
      }
    }
  },
  plugins: []
};

export default config;
