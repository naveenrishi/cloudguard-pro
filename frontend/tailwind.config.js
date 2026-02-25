/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#E8F4F8',
          100: '#D1E9F1',
          200: '#A3D3E3',
          300: '#75BDD5',
          400: '#47A7C7',
          500: '#2E75B6',
          600: '#255D92',
          700: '#1C466D',
          800: '#132E49',
          900: '#0A1724',
        },
      },
    },
  },
  plugins: [],
}