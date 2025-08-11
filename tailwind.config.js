/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        'flamingo': '#f59bb8',
        'canary': '#F5CE00',
      },
    },
  },
  plugins: [],
};
