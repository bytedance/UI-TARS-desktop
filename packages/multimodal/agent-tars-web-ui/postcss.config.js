const path = require('path');

module.exports = {
  plugins: {
    tailwindcss: {
      content: [
        './src/**/*.{html,js,ts,jsx,tsx}',
        path.join(path.dirname(require.resolve('@multimodal/ui')), '**/*.{mjs,js,ts,jsx,tsx}'),
      ],
      theme: {
        extend: {},
      },
      plugins: [],
    },
    autoprefixer: {},
  },
};
