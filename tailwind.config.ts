import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        navy:    '#1A2B6B',
        accent:  '#2E5BE8',
      },
      borderOpacity: {
        8:  '0.08',
        12: '0.12',
      },
    },
  },
  plugins: [],
}

export default config
