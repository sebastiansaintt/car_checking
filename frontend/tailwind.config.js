/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      fontSize: {
        'meta':      ['11px', { lineHeight: '16px', fontWeight: '400' }],
        'caption':   ['12px', { lineHeight: '16px', fontWeight: '400' }],
        'body':      ['14px', { lineHeight: '20px', fontWeight: '400' }],
        'body-m':    ['14px', { lineHeight: '20px', fontWeight: '500' }],
        'heading-s': ['14px', { lineHeight: '20px', fontWeight: '600' }],
        'heading-m': ['16px', { lineHeight: '24px', fontWeight: '600' }],
        'heading-l': ['20px', { lineHeight: '28px', fontWeight: '600' }],
        'heading-xl':['24px', { lineHeight: '32px', fontWeight: '600' }],
      },
      borderRadius: {
        'container': '8px',
        'card':      '12px',
        'input':     '8px',
        'button':    '8px',
        'table':     '8px',
        'dropdown':  '10px',
        'dialog':    '12px',
      },
      spacing: {
        '0.5': '2px',
        '1':   '4px',
        '1.5': '6px',
        '2':   '8px',
        '2.5': '10px',
        '3':   '12px',
        '4':   '16px',
        '5':   '20px',
        '6':   '24px',
        '8':   '32px',
        '10':  '40px',
        '12':  '48px',
        '16':  '64px',
      },
      boxShadow: {
        'modal': '0 4px 24px 0 rgba(0,0,0,0.08)',
        'none':  'none',
      },
      transitionTimingFunction: {
        'out-soft': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      transitionDuration: {
        '120': '120ms',
        '150': '150ms',
        '200': '200ms',
        '250': '250ms',
      },
      animation: {
        'fade-in': 'fadeIn 150ms cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%':   { opacity: '0', transform: 'translateY(4px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
