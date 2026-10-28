import type { Config } from 'tailwindcss';

// BuildX "Hi-Vis" design system (2026-10). Source of truth: docs/DESIGN_SYSTEM.md, shared with
// apps/mobile. Ink + sand surfaces with a single signal-lime accent (the colour of a site safety
// vest) and cobalt for information. The Material-style token names below are kept so existing
// pages inherit the new palette; new work should prefer the short brand names (ink, sand, lime...).
const config: Config = {
  darkMode: ['class'],
  content: [
    './app/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    '../../packages/web-core/src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Brand primitives
        ink: { DEFAULT: '#0B0C0A', 2: '#141512', 3: '#1D1F1A', 4: '#2A2C26' },
        sand: { DEFAULT: '#F2EFE7', 2: '#FAF8F3', 3: '#E8E4D9', 4: '#DCD7C9' },
        lime: { DEFAULT: '#C8FF3D', deep: '#A6E01C', soft: '#EEFFC2' },
        cobalt: { DEFAULT: '#2457FF', soft: '#E3EAFF' },
        stone: { DEFAULT: '#5E5B52', light: '#A3A197' },
        signal: { red: '#E5484D' },

        // Semantic (Material-style names used across existing pages)
        background: '#F2EFE7',
        surface: '#F2EFE7',
        'surface-bright': '#F2EFE7',
        'surface-dim': '#DCD7C9',
        'surface-container-lowest': '#FAF8F3',
        'surface-container-low': '#ECE8DE',
        'surface-container': '#E8E4D9',
        'surface-container-high': '#E4DFD3',
        'surface-container-highest': '#DCD7C9',
        'surface-variant': '#DCD7C9',
        'on-background': '#0B0C0A',
        'on-surface': '#0B0C0A',
        'on-surface-variant': '#5E5B52',
        outline: '#6F6C62',
        'outline-variant': '#C9C4B5',
        primary: '#0B0C0A',
        'on-primary': '#C8FF3D',
        'primary-container': '#C8FF3D',
        'on-primary-container': '#0B0C0A',
        secondary: '#2457FF',
        'on-secondary': '#FFFFFF',
        'secondary-container': '#E3EAFF',
        'on-secondary-container': '#0F2A8A',
        tertiary: '#1F7A3A',
        'on-tertiary': '#FFFFFF',
        error: '#C8282E',
        'on-error': '#FFFFFF',
        'error-container': '#FDE3E3',
        'on-error-container': '#7A0E12',
        'inverse-surface': '#0B0C0A',
        'inverse-on-surface': '#F2EFE7',

        // shadcn-style names used by @buildx/web-core components (LocationSelector)
        foreground: '#0B0C0A',
        'primary-foreground': '#C8FF3D',
        'muted-foreground': '#5E5B52',
        muted: '#E8E4D9',
        border: '#DCD7C9',
        input: '#C9C4B5',
        ring: '#2457FF',
        card: '#FAF8F3',
        destructive: '#C8282E',
      },
      borderRadius: {
        DEFAULT: '0.375rem',
        lg: '0.625rem',
        xl: '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      fontFamily: {
        display: ['var(--font-display)', 'system-ui', 'sans-serif'],
        headline: ['var(--font-display)', 'system-ui', 'sans-serif'],
        body: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        label: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-serif)', 'Georgia', 'serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      letterSpacing: {
        tightest: '-0.045em',
      },
      transitionTimingFunction: {
        'out-expo': 'cubic-bezier(0.16, 1, 0.3, 1)',
        'in-out-quart': 'cubic-bezier(0.76, 0, 0.24, 1)',
      },
      keyframes: {
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(110%)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        marquee: {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        'spin-slow': { to: { transform: 'rotate(360deg)' } },
        'pulse-ring': {
          '0%': { transform: 'scale(0.9)', opacity: '0.7' },
          '100%': { transform: 'scale(1.9)', opacity: '0' },
        },
        shimmer: {
          from: { backgroundPosition: '200% 0' },
          to: { backgroundPosition: '-200% 0' },
        },
        shake: {
          '0%,100%': { transform: 'translateX(0)' },
          '20%,60%': { transform: 'translateX(-6px)' },
          '40%,80%': { transform: 'translateX(6px)' },
        },
      },
      animation: {
        'rise-in': 'rise-in 0.9s cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-up': 'fade-up 0.8s cubic-bezier(0.16, 1, 0.3, 1) both',
        marquee: 'marquee 38s linear infinite',
        'spin-slow': 'spin-slow 18s linear infinite',
        'pulse-ring': 'pulse-ring 2.2s cubic-bezier(0.16, 1, 0.3, 1) infinite',
        shimmer: 'shimmer 1.6s linear infinite',
        shake: 'shake 0.4s ease-in-out',
      },
    },
  },
  plugins: [],
};

export default config;
