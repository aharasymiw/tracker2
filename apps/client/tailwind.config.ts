import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        wasteland: {
          50: '#f8f6f1',
          100: '#efe9da',
          500: '#a68850',
          700: '#6b5530',
          900: '#3b2f1d',
        },
        toxic: {
          400: '#6dff7a',
          500: '#3ce24b',
          600: '#1faf2a',
        },
        puritron: {
          400: '#5ec2ff',
          500: '#2e9bdc',
          600: '#1378b5',
        },
      },
      fontFamily: {
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
