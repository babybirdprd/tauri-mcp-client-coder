/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'background': '#111827', // gray-900
        'surface': '#1F2937',    // gray-800
        'primary': '#4F46E5',    // indigo-600
        'primary-hover': '#4338CA', // indigo-700
        'secondary': '#10B981',  // emerald-500
        'text-main': '#F9FAFB',   // gray-50
        'text-secondary': '#9CA3AF', // gray-400
        'text-tertiary': '#4B5563', // gray-600
        'border': '#374151',     // gray-700
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}