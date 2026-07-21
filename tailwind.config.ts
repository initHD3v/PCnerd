import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class', // Explicitly enable class-based dark mode
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: 'oklch(0.705 0.213 146.7)',
          foreground: 'oklch(0.208 0.042 146.7)',
        },
      },
    },
  },
  plugins: [],
};
export default config;
