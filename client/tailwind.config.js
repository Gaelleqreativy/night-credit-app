/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        night: {
          50:  '#EFF6FF',  // very light blue tint
          100: '#DBEAFE',  // light blue
          500: '#2563EB',  // primary blue
          700: '#E5E7EB',  // gray-200 — borders
          800: '#F3F4F6',  // gray-100 — hover, input bg
          900: '#FFFFFF',  // white — cards, sidebar
          950: '#F6F7FB',  // page background
        },
      },
    },
  },
  plugins: [],
}
