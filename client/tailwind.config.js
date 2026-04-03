/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg: '#0D0D0D',
        'card-black': '#1a1a1a',
        'card-border': '#333',
        'card-white': '#FAFAF5',
        gold: '#F6C445',
        'gold-dark': '#E8A917',
        muted: '#888888',
        secondary: '#666666',
      },
      fontFamily: {
        heebo: ['Heebo', 'sans-serif'],
        secular: ['Secular One', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
