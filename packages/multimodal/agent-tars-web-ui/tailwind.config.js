/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: [
          'Inter',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
        display: [
          'Outfit',
          'ui-sans-serif',
          'system-ui',
          '-apple-system',
          'BlinkMacSystemFont',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'SF Mono',
          'Menlo',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace',
        ],
      },
      colors: {
        gray: {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8', 
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
        // Updated color palette with more elegant, vibrant colors
        primary: {
          50: '#f0f7ff',
          100: '#e0efff',
          200: '#c7e0ff',
          300: '#a0c9ff',
          400: '#75a8ff',
          500: '#4d85fd',
          600: '#3b66f5',
          700: '#3151e1',
          800: '#2c44b5',
          900: '#283d8f',
          950: '#1b2458',
        },
        // Secondary accent colors - more vibrant
        accent: {
          50: '#fdf2ff',
          100: '#fae5ff',
          200: '#f5cbff',
          300: '#eeabfe',
          400: '#e37efc',
          500: '#d54ff6',
          600: '#c233ea',
          700: '#a924cc',
          800: '#8920a5',
          900: '#731f85',
          950: '#50084e',
        }
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'bounce-small': 'bounceSmall 0.3s ease',
        float: 'float 3s ease-in-out infinite',
      },
      transitionProperty: {
        width: 'width',
        height: 'height',
        spacing: 'margin, padding',
        transform: 'transform',
      },
      borderRadius: {
        chat: '1.5rem',
        '4xl': '2rem',
        '5xl': '2.5rem',
        '6xl': '3rem', // Added larger radius option
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceSmall: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-2px)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        soft: '0 4px 12px -2px rgba(0, 0, 0, 0.04)',
        'soft-lg': '0 6px 16px -4px rgba(0, 0, 0, 0.05)',
        'glow': '0 0 20px rgba(74, 122, 255, 0.1)',
        'glow-accent': '0 0 20px rgba(213, 79, 246, 0.1)',
      },
      borderWidth: {
        3: '3px',
      },
    },
  },
  plugins: [],
};
