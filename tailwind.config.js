/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#8B4513', // Deep brown
        darkBrownHover: '#6B3410',
        background: '#F6F1EB', // Light beige background
        form: '#F3E8D7', // Form beige
        input: '#E8D8C3', // Input lighter beige
        accent: '#A67C52', // Taupe accent
        border: '#CBB89D', // Border taupe
        text: '#4B2E19', // Dark brown text
        white: '#FFFFFF',
      },
      fontFamily: {
        'gilda': ['Gilda Display', 'serif'],
      },
    },
  },
  plugins: [],
}