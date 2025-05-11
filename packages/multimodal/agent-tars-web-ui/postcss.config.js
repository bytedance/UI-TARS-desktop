module.exports = {
  plugins: {
    tailwindcss: {
      content: ['./src/**/*.{html,js,ts,jsx,tsx}'],
      theme: {
        extend: {},
      },
      plugins: [],
    },
    autoprefixer: {},
  },
};
