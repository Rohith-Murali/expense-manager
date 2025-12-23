/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Primary colors (Teal/Turquoise from the dashboard)
        primary: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',  // Main teal color
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
        // Secondary colors (Dark teal from sidebar)
        secondary: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0a4f4a',  // Darker teal
          800: '#083d39',
          900: '#062e2b',  // Very dark teal/green
        },
        // Accent colors from the dashboard
        accent: {
          yellow: '#fbbf24',  // Yellow from pie chart
          orange: '#fb923c',  // Orange from pie chart
          red: '#ef4444',     // Red from pie chart
          purple: '#a855f7',
          blue: '#3b82f6',
        },
        // Semantic colors
        success: '#10b981',
        danger: '#ef4444',
        warning: '#fbbf24',
        info: '#14b8a6',
        
        // Neutral colors
        dark: {
          DEFAULT: '#0f172a',
          light: '#1e293b',
          lighter: '#334155',
        },
        sidebar: {
          DEFAULT: '#0a3d3a',  // Dark teal from sidebar
          hover: '#0d4f4a',
          active: '#14b8a6',
        },
        background: {
          DEFAULT: '#f8fafc',
          card: '#ffffff',
          hover: '#f1f5f9',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Poppins', 'sans-serif'],
      },
      boxShadow: {
        'card': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        'card-focus': '0 10px 15px -3px rgba(20, 184, 166, 0.3), 0 4px 6px -2px rgba(20, 184, 166, 0.15)',
      },
      borderRadius: {
        'card': '12px',
      }
    },
  },
  plugins: [],
}