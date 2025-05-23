/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // Habilitar modo oscuro basado en clase
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'dark-bg': '#212121',
        'dark-text': '#E8E8E8',
        'dark-card-bg': '#2c2c2c', // Un poco más claro para cards, si es necesario
        'dark-border': '#424242', // Para bordes sutiles
      }
    },
  },
  plugins: [],
}
