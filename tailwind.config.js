/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      colors: { ink: '#203b35', coral: '#f47d52', mint: '#e9f5ec', butter: '#fff5cc' },
      fontFamily: { display: ['Baloo 2', 'cursive'], body: ['Nunito', 'sans-serif'] },
      boxShadow: { soft: '0 18px 50px rgba(32, 59, 53, .12)' }
    }
  },
  plugins: []
};