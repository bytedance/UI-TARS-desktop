const path = require('path');

module.exports = {
  plugins: {
    tailwindcss: {
      content: ['./src/**/*.tsx', './docs/**/*.mdx'],
      theme: {
        extend: {},
      },
      plugins: [],
    },
  },
};
