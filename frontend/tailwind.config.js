/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        gem: {
          red: '#ff4444',
          blue: '#4444ff',
          green: '#44ff44',
          yellow: '#ffff44',
          purple: '#ff44ff',
          orange: '#ff8844',
        },
      },
      animation: {
        'gem-shine': 'shine 2s ease-in-out infinite',
        'gem-pop': 'pop 0.3s ease-out',
        'gem-match': 'match 0.5s ease-out',
        'float': 'float 3s ease-in-out infinite',
      },
      keyframes: {
        shine: {
          '0%, 100%': { filter: 'brightness(1)' },
          '50%': { filter: 'brightness(1.3)' },
        },
        pop: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.2)' },
          '100%': { transform: 'scale(0)' },
        },
        match: {
          '0%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
          '50%': { transform: 'scale(1.3) rotate(180deg)', opacity: '0.7' },
          '100%': { transform: 'scale(0) rotate(360deg)', opacity: '0' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
      },
    },
  },
  plugins: [],
}
