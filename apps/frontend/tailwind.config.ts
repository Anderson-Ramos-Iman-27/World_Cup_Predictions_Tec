import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        pitch: '#0f6b4f',
        ink: '#102033',
        action: '#1457d9',
        warning: '#e6a100',
      },
      boxShadow: {
        panel: '0 18px 50px rgba(16, 32, 51, 0.12)',
      },
    },
  },
  plugins: [],
};

export default config;
