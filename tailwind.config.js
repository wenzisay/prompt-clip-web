/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        accent: {
          DEFAULT: '#0058bc',
          soft: 'color-mix(in oklch, #0058bc 8%, transparent)',
        },
        secondary: {
          DEFAULT: '#4c4aca',
          soft: 'color-mix(in oklch, #4c4aca 8%, transparent)',
        },
        tertiary: '#8a2bb9',
        bg: '#FAFAFA',
        surface: '#ffffff',
        surfaceContainer: '#f0edef',
        surfaceHigh: '#eae7ea',
        surfaceDim: '#f6f3f5',
        fg: '#1b1b1d',
        muted: '#717786',
      },
      fontFamily: {
        display: ['SF Pro Display', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        body: ['SF Pro Text', '-apple-system', 'BlinkMacSystemFont', 'system-ui', 'sans-serif'],
        mono: ['SF Mono', 'ui-monospace', 'Menlo', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.02)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.06)',
      },
      borderRadius: {
        'card': '14px',
      },
      spacing: {
        'sidebar': '260px',
        'detail': '480px',
      },
    },
  },
  plugins: [],
}
