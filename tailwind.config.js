/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      colors: {
        medical: {
          bg: '#F0F4F8',
          card: '#FFFFFF',
          blue: '#2563EB',
          'blue-light': '#DBEAFE',
          teal: '#0D9488',
          border: '#E2E8F0',
        },
      },
      keyframes: {
        borderPulse: {
          '0%, 100%': { boxShadow: 'inset 0 0 20px rgba(239,68,68,0), 0 0 0 0 rgba(239,68,68,0)' },
          '50%': { boxShadow: 'inset 0 0 40px rgba(239,68,68,0.06), 0 0 30px 3px rgba(239,68,68,0.04)' },
        },
      },
      animation: {
        'border-pulse': 'borderPulse 3s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
