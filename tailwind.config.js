/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        agri: {
          dark: '#0B3D2E',
          primary: '#0F4D3A',
          light: '#7CB342',
          accent: '#8BC34A',
          bg: '#FFFFFF',
          soft: '#F7F9F7',
          text: '#1F2A24',
          muted: '#6B7280',
          border: '#E5E7EB',
          warning: '#F59E0B',
          danger: '#DC2626',
          info: '#3B82F6',
          water: '#0284C7',
          waterLight: '#E0F2FE'
        }
      },
      fontFamily: {
        sans: ['Inter', 'Poppins', 'sans-serif'],
      },
      borderRadius: {
        'xl': '0.875rem',
        '2xl': '1.25rem',
      },
      boxShadow: {
        'subtle': '0 1px 3px 0 rgba(11, 61, 46, 0.05), 0 1px 2px 0 rgba(11, 61, 46, 0.03)',
        'card': '0 4px 12px -2px rgba(11, 61, 46, 0.08), 0 2px 4px -1px rgba(11, 61, 46, 0.04)',
        'elevated': '0 12px 24px -4px rgba(11, 61, 46, 0.12), 0 4px 6px -2px rgba(11, 61, 46, 0.04)',
      }
    },
  },
  plugins: [],
}
