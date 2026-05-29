import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#EEF3FF",
          100: "#D6E0FF",
          200: "#ADBFFF",
          300: "#7A9AFF",
          400: "#4D78F5",
          500: "#1558CC",
          600: "#0042AB",
          700: "#003087",
          800: "#001F63",
          900: "#001240",
          950: "#000A2B"
        },
        gold: {
          50: "#FFFBEB",
          100: "#FFF3CC",
          200: "#FFE599",
          300: "#FFD470",
          400: "#FFBF33",
          500: "#FFB81C",
          600: "#E6A000",
          700: "#B37A00",
          800: "#7A5200",
          900: "#3D2900"
        }
      },
      fontFamily: {
        sans: ["var(--font-inter)", "system-ui", "-apple-system", "sans-serif"]
      },
      boxShadow: {
        "brand-sm": "0 4px 14px -4px rgba(0, 48, 135, 0.35)",
        "brand-md": "0 12px 32px -8px rgba(0, 48, 135, 0.40)",
        "brand-lg": "0 24px 60px -16px rgba(0, 48, 135, 0.45)",
        "gold-sm": "0 4px 14px -4px rgba(255, 184, 28, 0.45)",
        "gold-md": "0 12px 32px -8px rgba(255, 184, 28, 0.40)"
      }
    }
  },
  plugins: []
};

export default config;
