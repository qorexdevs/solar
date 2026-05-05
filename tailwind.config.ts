import type { Config } from 'tailwindcss';
import forms from '@tailwindcss/forms';
import containerQueries from '@tailwindcss/container-queries';

// Color tokens reference CSS variables defined in src/index.css so the same
// class names (e.g. bg-primary) resolve to the right value in light vs dark
// theme via the .dark class on <html>. The "<alpha-value>" placeholder lets
// Tailwind opacity modifiers (e.g. bg-primary/50) keep working.
const c = (varName: string) => `rgb(var(${varName}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: c('--color-primary'),
        'on-primary': c('--color-on-primary'),
        'primary-container': c('--color-primary-container'),
        'on-primary-container': c('--color-on-primary-container'),
        secondary: c('--color-secondary'),
        'on-secondary': c('--color-on-secondary'),
        'secondary-container': c('--color-secondary-container'),
        'on-secondary-container': c('--color-on-secondary-container'),
        tertiary: c('--color-tertiary'),
        'on-tertiary': c('--color-on-tertiary'),
        'tertiary-container': c('--color-tertiary-container'),
        'on-tertiary-container': c('--color-on-tertiary-container'),

        background: c('--color-background'),
        surface: c('--color-surface'),
        'surface-container': c('--color-surface-container'),
        'surface-container-high': c('--color-surface-container-high'),
        'surface-container-highest': c('--color-surface-container-highest'),

        'on-background': c('--color-on-background'),
        'on-surface': c('--color-on-surface'),
        'on-surface-variant': c('--color-on-surface-variant'),

        outline: c('--color-outline'),
        'outline-variant': c('--color-outline-variant'),

        success: c('--color-success'),
        'on-success': c('--color-on-success'),
        'success-container': c('--color-success-container'),
        'on-success-container': c('--color-on-success-container'),
        warning: c('--color-warning'),
        'on-warning': c('--color-on-warning'),
        'warning-container': c('--color-warning-container'),
        'on-warning-container': c('--color-on-warning-container'),
        error: c('--color-error'),
        'on-error': c('--color-on-error'),
        'error-container': c('--color-error-container'),
        'on-error-container': c('--color-on-error-container'),
        info: c('--color-info'),
        'on-info': c('--color-on-info'),

        // --- Legacy Material 3 aliases (deprecated — see docs/design.md §3.4)
        // Kept so older components compile while we migrate. Do not use in new code.
        'surface-tint': c('--color-primary'),
        'surface-variant': c('--color-surface-container-high'),
        'surface-dim': c('--color-surface-container-high'),
        'surface-bright': c('--color-surface'),
        'surface-container-lowest': c('--color-surface'),
        'surface-container-low': c('--color-surface-container'),
        'inverse-surface': c('--color-on-surface'),
        'inverse-on-surface': c('--color-surface'),
        'inverse-primary': c('--color-primary-container'),
        'primary-fixed': c('--color-primary-container'),
        'primary-fixed-dim': c('--color-primary-container'),
        'on-primary-fixed': c('--color-on-primary-container'),
        'on-primary-fixed-variant': c('--color-on-primary-container'),
        'secondary-fixed': c('--color-secondary-container'),
        'secondary-fixed-dim': c('--color-secondary-container'),
        'on-secondary-fixed': c('--color-on-secondary-container'),
        'on-secondary-fixed-variant': c('--color-on-secondary-container'),
        'tertiary-fixed': c('--color-tertiary-container'),
        'tertiary-fixed-dim': c('--color-tertiary-container'),
        'on-tertiary-fixed': c('--color-on-tertiary-container'),
        'on-tertiary-fixed-variant': c('--color-on-tertiary-container'),
      },
      borderRadius: {
        DEFAULT: '0.25rem',
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
        full: '9999px',
      },
      // Compact 4px-derived scale (halved from legacy 8px grid); see docs/design.md §5.1
      spacing: {
        xs: '2px',
        sm: '4px',
        md: '6px',
        base: '8px',
        lg: '12px',
        xl: '20px',
        '2xl': '32px',
        'container-max': '1280px',
        'touch-target': '48px',
      },
      maxWidth: {
        'container-max': '1280px',
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
        headline: ['Inter', 'sans-serif'],
        title: ['Inter', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        label: ['Inter', 'sans-serif'],
        data: ['Inter', 'sans-serif'],
        // Legacy typography family aliases (deprecated)
        'headline-xl': ['Inter', 'sans-serif'],
        'headline-lg': ['Inter', 'sans-serif'],
        'body-md': ['Inter', 'sans-serif'],
        'body-lg': ['Inter', 'sans-serif'],
        'data-display': ['Inter', 'sans-serif'],
        'label-sm': ['Inter', 'sans-serif'],
      },
      fontSize: {
        // Canonical type scale; see docs/design.md §4.1
        display: [
          '36px',
          { lineHeight: '44px', letterSpacing: '-0.02em', fontWeight: '700' },
        ],
        headline: [
          '28px',
          { lineHeight: '36px', letterSpacing: '-0.01em', fontWeight: '600' },
        ],
        title: [
          '20px',
          { lineHeight: '28px', letterSpacing: '-0.005em', fontWeight: '600' },
        ],
        body: ['16px', { lineHeight: '24px', fontWeight: '400' }],
        label: [
          '12px',
          { lineHeight: '16px', letterSpacing: '0.04em', fontWeight: '500' },
        ],
        data: [
          '24px',
          { lineHeight: '32px', letterSpacing: '-0.01em', fontWeight: '600' },
        ],
        // Legacy aliases (deprecated)
        'headline-xl': [
          '36px',
          { lineHeight: '44px', letterSpacing: '-0.02em', fontWeight: '700' },
        ],
        'headline-lg': [
          '28px',
          { lineHeight: '36px', letterSpacing: '-0.01em', fontWeight: '600' },
        ],
        'body-md': ['16px', { lineHeight: '24px', fontWeight: '400' }],
        'body-lg': ['18px', { lineHeight: '28px', fontWeight: '400' }],
        'data-display': [
          '24px',
          { lineHeight: '32px', letterSpacing: '-0.01em', fontWeight: '600' },
        ],
        'label-sm': ['12px', { lineHeight: '16px', fontWeight: '500' }],
      },
      boxShadow: {
        sm: '0 1px 2px rgba(15, 23, 42, 0.06)',
        card: '0 4px 15px rgba(4, 120, 87, 0.06)',
        'card-lg': '0 8px 24px rgba(4, 120, 87, 0.10)',
        elevated: '0 16px 40px rgba(15, 23, 42, 0.18)',
        'top-nav': '0 2px 10px rgba(4, 120, 87, 0.06)',
        'bottom-nav': '0 -4px 15px rgba(4, 120, 87, 0.06)',
      },
      transitionDuration: {
        fast: '120ms',
        base: '200ms',
        slow: '320ms',
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.2, 0, 0, 1)',
        emphasised: 'cubic-bezier(0.3, 0, 0, 1)',
      },
    },
  },
  plugins: [forms, containerQueries],
} satisfies Config;
