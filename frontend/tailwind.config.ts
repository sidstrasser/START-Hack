import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Design System Colors
        'ds-text': '#2D3039',
        'ds-text-muted': '#5A5D66',
        'ds-text-light': '#8B8E96',
        'ds-bg': '#C8E6F9',
        'ds-bg-light': '#E8F4FC',
        'ds-accent-1': '#3B12CE',
        'ds-accent-2': '#7B5BF1',
        'ds-dark-blue': '#0F1A3D',
        // Glass surfaces
        'glass': 'rgba(255, 255, 255, 0.7)',
        'glass-strong': 'rgba(255, 255, 255, 0.85)',
        'glass-border': 'rgba(255, 255, 255, 0.5)',
      },
      borderRadius: {
        'ds-sm': '6px',
        'ds-md': '12px',
        'ds-lg': '20px',
        'ds-xl': '28px',
      },
      boxShadow: {
        'ds-soft': '0 4px 30px rgba(0, 0, 0, 0.08)',
        'ds-medium': '0 8px 40px rgba(0, 0, 0, 0.12)',
        'ds-accent': '0 4px 20px rgba(59, 18, 206, 0.25)',
        'ds-accent-hover': '0 6px 25px rgba(59, 18, 206, 0.35)',
      },
      backgroundImage: {
        'gradient-accent': 'linear-gradient(135deg, #3B12CE 0%, #7B5BF1 100%)',
        'gradient-bg': 'linear-gradient(180deg, #C8E6F9 0%, #E8F4FC 100%)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
