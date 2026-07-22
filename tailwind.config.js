/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        void: '#0B0E14',
        ledger: '#121826',
        panel: '#161D2E',
        line: '#232C42',
        lumen: '#4CE0B3',
        'lumen-dim': '#2C8F73',
        signal: '#FF6B6B',
        ink: '#E7ECF3',
        mute: '#8792A6',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(76,224,179,0.25), 0 0 24px rgba(76,224,179,0.12)',
      },
    },
  },
  plugins: [],
};
