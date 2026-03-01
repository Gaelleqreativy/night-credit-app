/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        night: {
          50: '#f0f0ff',
          100: '#e0e0ff',
          500: '#6366f1',
          700: '#4338ca',
          800: '#2d1b69',
          900: '#1e1b4b',
          950: '#0f0f1a',
        },
      },
    },
  },
  plugins: [],
}
