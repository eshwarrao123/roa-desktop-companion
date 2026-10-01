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
        // ROA MIDNIGHT COMPANION — CANONICAL DESIGN TOKENS
        'roa-canvas': '#080A09',
        'roa-surface': '#0F1210',
        'roa-raised': '#161A17',
        'roa-border': '#303631',
        'roa-text-primary': '#F4F7F4',
        'roa-text-secondary': '#D3D9D4',
        'roa-text-muted': '#9BA39D',
        'roa-sage': '#91C4A0',
        'roa-sage-hover': '#A8D5B5',
        'roa-clay': '#D59A70',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', '"Segoe UI"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },
      fontSize: {
        // ROA MIDNIGHT COMPANION TYPOGRAPHY SCALE
        'timer-display': ['80px', { lineHeight: '1.0', fontWeight: '500', fontFeatureSettings: '"tnum"' }],
        'page-title': ['28px', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '700' }],
        'page-title-sm': ['26px', { lineHeight: '1.15', letterSpacing: '-0.02em', fontWeight: '700' }],
        'section-title': ['17px', { lineHeight: '1.25', letterSpacing: '-0.01em', fontWeight: '600' }],
        'section-title-sm': ['16px', { lineHeight: '1.25', letterSpacing: '-0.01em', fontWeight: '600' }],
        'body': ['14px', { lineHeight: '1.55', fontWeight: '400' }],
        'body-medium': ['14px', { lineHeight: '1.55', fontWeight: '500' }],
        'secondary': ['13px', { lineHeight: '1.4', fontWeight: '400' }],
        'meta': ['12px', { lineHeight: '1.3', fontWeight: '400' }],
        'micro': ['11px', { lineHeight: '1.2', letterSpacing: '0.08em', fontWeight: '600', textTransform: 'uppercase' }],
        'micro-sm': ['10px', { lineHeight: '1.2', letterSpacing: '0.08em', fontWeight: '600', textTransform: 'uppercase' }],
        'nav': ['13px', { lineHeight: '1.2', fontWeight: '500' }],
        'keycap': ['12px', { lineHeight: '1.0', fontWeight: '500' }],
      },
      spacing: {
        // ROA MIDNIGHT COMPANION SPACING
        'roa-gutter': '28px',
        'roa-margin': '32px',
      },
      borderRadius: {
        // ROA MIDNIGHT COMPANION RADII
        'roa': '6px',
        'roa-sm': '4px',
        'roa-preview': '8px',
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
