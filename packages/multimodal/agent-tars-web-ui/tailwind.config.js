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
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af', 
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
        // New primary color: Elegant Teal/Blue
        primary: {
          50: '#eefafd',
          100: '#d5f2fa',
          200: '#b1e5f5',
          300: '#7cd3ed',
          400: '#42b9e1',
          500: '#269dcf',
          600: '#1e7db0',
          700: '#1c658f',
          800: '#1d5476',
          900: '#1d4764',
          950: '#0f2c42',
        },
        // Secondary accent colors: Soft Lavender
        accent: {
          50: '#f4f1ff',
          100: '#ebe5ff',
          200: '#d9cdff',
          300: '#bea6ff',
          400: '#a078ff',
          500: '#8752fb',
          600: '#7836ef',
          700: '#6827d9',
          800: '#5822b3',
          900: '#491e8f',
          950: '#2e1167',
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
        'border-flow': 'borderFlow 3s infinite ease-in-out',
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
        '6xl': '3rem', 
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
        borderFlow: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        }
      },
      boxShadow: {
        subtle: '0 1px 2px 0 rgba(0, 0, 0, 0.03)',
        soft: '0 4px 12px -2px rgba(0, 0, 0, 0.03)',
        'soft-lg': '0 6px 16px -4px rgba(0, 0, 0, 0.04)',
        'glow': '0 0 15px rgba(38, 157, 207, 0.15)',
        'glow-accent': '0 0 15px rgba(135, 82, 251, 0.15)',
      },
      borderWidth: {
        3: '3px',
      },
    },
  },
  plugins: [],
};
