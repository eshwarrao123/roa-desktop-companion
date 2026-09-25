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
        // EXISTING TOKENS (preserved for migration safety)
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
        
        // ROA CANONICAL DESIGN TOKENS (Quiet Companion)
        'roa-background': '#F7F4EF',
        'roa-surface': '#FFFDF9',
        'roa-surface-tint': '#EEF2EE',
        'roa-sage': '#5F7D66',
        'roa-sage-dark': '#46624E',
        'roa-clay': '#D29A6A',
        'roa-text': '#1A1F1B',
        'roa-text-secondary': '#252A26',
        'roa-text-muted': '#747970',
        'roa-text-light': '#9A9690',
        'roa-label': '#A8A49E',
        'roa-divider': '#E4DED5',
      },
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        // ROA TYPOGRAPHY HIERARCHY
        'timer-display': ['80px', { lineHeight: '1.0', letterSpacing: '-0.02em', fontWeight: '700' }],
        'greeting': ['28px', { lineHeight: '1.2', letterSpacing: '-0.01em', fontWeight: '600' }],
        'page-title': ['24px', { lineHeight: '1.25', fontWeight: '600' }],
        'section-title': ['18px', { lineHeight: '1.3', fontWeight: '600' }],
        'meta': ['13px', { lineHeight: '1.4', fontWeight: '400' }],
        'micro': ['11px', { lineHeight: '1.3', fontWeight: '400' }],
        'label': ['10px', { lineHeight: '1.2', letterSpacing: '0.10em', fontWeight: '700' }],
      },
      spacing: {
        // ROA SPACING SCALE (complementing Tailwind defaults)
        'roa-xs': '4px',
        'roa-sm': '8px',
        'roa-md': '16px',
        'roa-lg': '28px',
        'roa-xl': '32px',
      },
      borderRadius: {
        // ROA RADII
        'roa': '8px',
        'roa-sm': '4px',
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
