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
          DEFAULT: '#073763',
          light: '#0b5394',
          dark: '#052c4c',
        },
        secondary: {
          DEFAULT: '#f1c232',
          light: '#f6d35e',
          dark: '#d5a92d',
        },
      },
    },
  },
  plugins: [],
} 