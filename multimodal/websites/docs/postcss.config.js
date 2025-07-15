const path = require('path');
const { nextui } = require('@nextui-org/react');

module.exports = {
  plugins: {
    tailwindcss: {
      content: [
        './src/**/*.tsx',
        './docs/**/*.mdx',
        // make sure it's pointing to the ROOT node_module
        path.join(path.dirname(require.resolve('@nextui-org/theme')), '**/*.{js,ts,jsx,tsx}'),
        path.join(path.dirname(require.resolve('@nextui-org/react')), '**/*.{js,ts,jsx,tsx}'),
      ],
      theme: {
        extend: {
          colors: {
            primary: '#FF2D55',
            accent: '#00FFFF',
            'accent-alt': '#7C00FF',
            'cyber-black': '#0D0D0D',
            'cyber-panel': '#1A1A1A',
            'cyber-border': '#333333',
          },
          fontFamily: {
            cyber: ['Orbitron', 'sans-serif'],
            body: ['Rajdhani', 'sans-serif'],
            mono: ['Fira Code', 'monospace'],
          },
          backgroundImage: {
            'cyber-grid-bg':
              'linear-gradient(to right, #1E3A5F 1px, transparent 1px), linear-gradient(to bottom, #1E3A5F 1px, transparent 1px)',
            'cyber-radial':
              'radial-gradient(circle at center, rgba(13, 13, 13, 0.2) 0%, rgba(13, 13, 13, 0.8) 70%, rgba(13, 13, 13, 1) 100%)',
          },
          boxShadow: {
            neon: '0 0 5px rgba(255, 45, 85, 0.5), 0 0 20px rgba(255, 45, 85, 0.3)',
            'neon-cyan': '0 0 5px rgba(0, 255, 255, 0.5), 0 0 20px rgba(0, 255, 255, 0.3)',
            soft: '0 4px 6px -1px rgba(0, 0, 0, 0.2), 0 2px 4px -1px rgba(0, 0, 0, 0.1)',
          },
          animation: {
            'pulse-slow': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
          },
        },
      },
      plugins: [
        nextui()
      ],
    },
  },
};
