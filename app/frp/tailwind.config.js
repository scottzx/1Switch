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
        claw: {
          50: '#fef3f2',
          100: '#fee4e2',
          200: '#ffccc7',
          300: '#ffa8a0',
          400: '#ff7a6b',
          500: '#f94d3a',
          600: '#e63024',
          700: '#c1241a',
          800: '#a02119',
          900: '#84221c',
          950: '#480d09',
        },
        surface: {
          app: 'var(--bg-app)',
          card: 'var(--bg-card)',
          'card-hover': 'var(--bg-card-hover)',
          input: 'var(--bg-input)',
          elevated: 'var(--bg-elevated)',
        },
        content: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
        },
        edge: {
          DEFAULT: 'var(--border-primary)',
          secondary: 'var(--border-secondary)',
        },
      },
    },
  },
  plugins: [],
}
