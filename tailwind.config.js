/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{html,js,svelte,ts}'],
  theme: {
    extend: {
      colors: {
        cream: '#F0EDCC',
        teal: '#02343F',
      },
    },
  },
  plugins: [require("daisyui")],
}

