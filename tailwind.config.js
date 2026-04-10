/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // Neutral palette - Dieter Rams inspired
        neutral: {
          50: '#FAFAF8',
          100: '#F5F5F3',
          200: '#EFEFED',
          300: '#E8E8E5',
          400: '#D8D8D5',
          500: '#C4C4C0',
          600: '#A0A09C',
          700: '#6B6B6B',
          800: '#3D3D3D',
          900: '#1A1A1A',
          950: '#141414',
        },
        // Warm accent - brass/gold (Braun reference)
        accent: {
          DEFAULT: 'var(--accent)',
          hover: 'var(--accent-hover)',
          muted: 'var(--accent-muted)',
          foreground: '#FFFFFF',
        },
        // Semantic colors
        surface: {
          app: 'var(--bg-app)',
          sidebar: 'var(--bg-sidebar)',
          card: 'var(--bg-card)',
          'card-hover': 'var(--bg-card-hover)',
          input: 'var(--bg-input)',
          elevated: 'var(--bg-elevated)',
          overlay: 'var(--bg-overlay)',
          code: 'var(--bg-code)',
        },
        content: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          inverse: 'var(--text-inverse)',
        },
        edge: {
          DEFAULT: 'var(--border-primary)',
          secondary: 'var(--border-secondary)',
        },
      },
      fontFamily: {
        // Clean, functional sans-serif
        sans: [
          'Inter',
          'SF Pro Display',
          '-apple-system',
          'BlinkMacSystemFont',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'sans-serif',
        ],
        mono: [
          'SF Mono',
          'JetBrains Mono',
          'Fira Code',
          'Menlo',
          'monospace',
        ],
      },
      fontSize: {
        '2xs': ['0.625rem', { lineHeight: '1' }],
        'xs': ['0.75rem', { lineHeight: '1.4' }],
        'sm': ['0.8125rem', { lineHeight: '1.5' }],
        'base': ['0.875rem', { lineHeight: '1.6' }],
        'lg': ['1rem', { lineHeight: '1.5' }],
        'xl': ['1.125rem', { lineHeight: '1.4' }],
        '2xl': ['1.5rem', { lineHeight: '1.3' }],
        '3xl': ['2rem', { lineHeight: '1.2' }],
        '4xl': ['2.5rem', { lineHeight: '1.1' }],
      },
      spacing: {
        'grid': 'var(--grid-gap)',
        'section': '48px',
        'card': '20px',
      },
      maxWidth: {
        'grid': 'var(--grid-max-width)',
      },
      boxShadow: {
        'card': 'var(--shadow-card)',
        'card-hover': 'var(--shadow-card-hover)',
        'elevated': 'var(--shadow-elevated)',
      },
      borderRadius: {
        'none': '0',
        'sm': '2px',
        'DEFAULT': '4px',
        'md': '6px',
        'lg': '8px',
      },
      animation: {
        'fade-in': 'fadeIn 0.2s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(8px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      gridTemplateColumns: {
        '12': 'repeat(12, minmax(0, 1fr))',
        'module': 'repeat(auto-fill, minmax(240px, 1fr))',
      },
    },
  },
  plugins: [],
}
