/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        lavender: {
          50: '#F8F3FE',
          100: '#EFE4FC',
          200: '#DFCAF8',
          300: '#C29BEA',
          400: '#AC7FE1',
          500: '#9561D2',
          600: '#7D45BA',
          700: '#663A97',
          800: '#54317A',
          900: '#452B62',
        },
        lime: {
          50: '#FAFDE8',
          100: '#F3FBC3',
          200: '#E9F88B',
          300: '#DDF54F',
          400: '#D0F431',
          500: '#B8DA1D',
          600: '#91B011',
          700: '#6D8612',
          800: '#566A16',
          900: '#485917',
        },
        tomato: {
          50: '#FDF1EF',
          100: '#FCE1DD',
          200: '#F9C7C0',
          300: '#F3A198',
          400: '#EA6D60',
          500: '#E2392B',
          600: '#CF2A1D',
          700: '#AF2116',
          800: '#901F17',
          900: '#781F19',
        },
        ink: '#241531',
        muted: '#756A80',
        surface: '#F7F5FB',
      },
      fontFamily: {
        sans: ['Manrope Variable', 'Manrope', 'Segoe UI', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 12px 35px -18px rgba(45, 25, 70, 0.22)',
        card: '0 2px 8px rgba(45, 25, 70, 0.04), 0 18px 45px -24px rgba(45, 25, 70, 0.22)',
        float: '0 24px 60px -24px rgba(45, 25, 70, 0.35)',
        glow: '0 0 0 4px rgba(194, 155, 234, 0.16)',
      },
      borderRadius: {
        '4xl': '2rem',
      },
      keyframes: {
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'slide-up': {
          from: { opacity: '0', transform: 'translateY(12px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-in-right': {
          from: { opacity: '0', transform: 'translateX(20px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 0.35s ease-out both',
        'slide-up': 'slide-up 0.35s ease-out both',
        'slide-in-right': 'slide-in-right 0.3s ease-out both',
        'scale-in': 'scale-in 0.2s ease-out both',
        float: 'float 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
