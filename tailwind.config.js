/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/renderer/index.html',
    './src/renderer/src/**/*.{js,ts,jsx,tsx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: {
          light: '#FAFAFA',
          dark: '#1A1A2E',
        },
        surface: {
          light: '#FFFFFF',
          dark: '#252542',
          elevated: '#2D2D4E',
        },
        border: {
          light: '#E5E5E5',
          dark: '#3D3D6B',
        },
        primary: {
          DEFAULT: '#6366F1',
          hover: '#4F46E5',
          dark: '#818CF8',
        },
        accent: {
          DEFAULT: '#F59E0B',
          dark: '#FBBF24',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
