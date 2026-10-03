/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#D93A0F',
          hover: '#BF320B',
          light: '#FF5424',
          dark: '#9E2908',
        },
        secondary: {
          DEFAULT: '#00B8B8',
          hover: '#009E9E',
          light: '#1AD1D1',
          dark: '#008080',
        },
        success: {
          DEFAULT: '#0ABF6E',
          hover: '#089D5A',
          light: '#1DDC83',
        },
        background: '#0F0F0F',
        elevated: {
          DEFAULT: '#1A1A1A',
          subtle: '#222222',
          card: '#161616',
        },
        border: {
          DEFAULT: '#2A2A2A',
          subtle: '#202020',
          hover: '#3A3A3A',
        },
        text: {
          primary: '#F5F2ED',
          secondary: '#A8A29E',
          muted: '#78716C',
        },
      },
      fontFamily: {
        heading: ['"Instrument Serif"', 'Georgia', 'serif'],
        sans: ['"Satoshi"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
        body: ['"Satoshi"', 'Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
