/** @type {import('tailwindcss').Config} */
export default {
    darkMode: 'class',
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                // Matching the dashboard.html colors but using Tailwind palette
                primary: '#10b981', // emerald-500
                'primary-dark': '#059669', // emerald-600
                danger: '#ef4444', // red-500
                warning: '#f59e0b', // amber-500
                bg: {
                    dark: '#0f172a', // slate-900
                    card: '#1e293b', // slate-800
                }
            },
            fontFamily: {
                sans: ['Inter', 'system-ui', 'sans-serif'],
            }
        },
    },
    plugins: [],
}
