/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        emerald: {
          600: '#059669',
        },
        slate: {
          900: '#0f172a',
        },
      },
    },
  },
  plugins: [],
};
