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
      transitionDuration: {
        'fast': '100ms',
        'base': '200ms',
        'slow': '300ms',
      },
      transitionTimingFunction: {
        'ease-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'ease-spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
    },
  },
  plugins: [],
};
