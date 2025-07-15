const path = require('path');
const { nextui } = require('@nextui-org/react');

module.exports = {
  plugins: {
    tailwindcss: {
      content: [
        './src/**/*.{html,js,ts,jsx,tsx}',
        // make sure it's pointing to the ROOT node_module
        path.join(path.dirname(require.resolve('@nextui-org/theme')), '**/*.{js,ts,jsx,tsx}'),
        path.join(path.dirname(require.resolve('@nextui-org/react')), '**/*.{js,ts,jsx,tsx}'),
      ],
      theme: {
        extend: {},
      },
      darkMode: 'class',
      plugins: [nextui()],
    },
    autoprefixer: {},
  },
};
