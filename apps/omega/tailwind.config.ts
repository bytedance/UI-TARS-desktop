import resolveConfig from 'tailwindcss/resolveConfig';

export default resolveConfig({
  content: ['./src/renderer/src/**/*.{html,ts,tsx,jsx,js}'],
  theme: {
    extend: {
      animation: {
        shine: 'shine 2s linear infinite',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        glow: 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        shine: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(100%)' },
        },
        glow: {
          '0%': {
            opacity: '0.5',
            transform: 'translateX(-10%) translateY(-10%)',
          },
          '100%': {
            opacity: '0.7',
            transform: 'translateX(10%) translateY(10%)',
          },
        },
      },
      backdropFilter: {
        none: 'none',
        blur: 'blur(20px)',
      },
    },
  },
  darkMode: 'class',
  plugins: [],
});
