/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Azul de marca DRASAC, muestreado del logo real (ver design_system_drasac.md, sección 2)
        primary: {
          DEFAULT: '#2B5C8A',
          dark: '#1B3C5C',
          light: '#EAF1F8',
        },
        // Exclusivo para todo lo generado por la IA (sugerencias, clasificación automática)
        ai: {
          DEFAULT: '#6D5BD0',
          light: '#F1EEFB',
        },
        success: { DEFAULT: '#2E8B57', light: '#E7F5ED' },
        warning: { DEFAULT: '#C97A1F', light: '#FBF0E1' },
        danger: { DEFAULT: '#C9483D', light: '#FBEAE8' },
        neutral: {
          900: '#1B2330',
          700: '#3D4654',
          500: '#667085',
          300: '#C4CBD6',
          200: '#E3E7ED',
          100: '#EEF1F5',
          50: '#F6F8FB',
        },
      },
      borderRadius: {
        card: '10px',
        btn: '8px',
        pill: '999px',
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,24,40,0.06), 0 1px 3px rgba(16,24,40,0.08)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease forwards',
        'scale-in': 'scaleIn 0.3s ease forwards',
      },
      keyframes: {
        fadeIn: { from: { opacity: 0, transform: 'translateY(8px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        scaleIn: { from: { opacity: 0, transform: 'scale(0.97)' }, to: { opacity: 1, transform: 'scale(1)' } },
      },
    },
  },
  plugins: [],
}