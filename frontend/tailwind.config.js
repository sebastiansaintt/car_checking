/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#FFFFFF",
        surface: {
          DEFAULT: "#FFFFFF",
          subtle: "#FAFAFA",
        },
        border: {
          DEFAULT: "#E5E7EB",
          subtle: "#F3F4F6",
        },
        primary: {
          DEFAULT: "#111827",
          hover: "#1F2937",
          text: "#111827",
        },
        secondary: {
          text: "#6B7280",
          tertiary: "#9CA3AF",
        },
        brand: {
          DEFAULT: "#1E3A5F",
          hover: "#142843",
        },
        status: {
          apto: {
            bg: "#ECFDF5",
            text: "#065F46",
            border: "#A7F3D0",
          },
          no_apto: {
            bg: "#FEF2F2",
            text: "#991B1B",
            border: "#FCA5A5",
          },
          warning: {
            bg: "#FFFBEB",
            text: "#92400E",
            border: "#FDE68A",
          }
        }
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
      },
      borderRadius: {
        container: '8px',
        card: '12px',
        input: '8px',
        button: '8px',
        table: '8px',
        dropdown: '10px',
        dialog: '12px',
      }
    },
  },
  plugins: [],
}
