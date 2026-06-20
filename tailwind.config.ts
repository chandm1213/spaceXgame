import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        mono: ['"Share Tech Mono"', 'ui-monospace', 'monospace'],
        display: ['Orbitron', 'sans-serif'],
      },
      colors: {
        hud: {
          cyan: '#22d3ee',
          green: '#34d399',
          amber: '#fbbf24',
          red: '#f87171',
        },
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
        flicker: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.85' },
        },
        pulseGlow: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.4' },
        },
      },
      animation: {
        scanline: 'scanline 8s linear infinite',
        flicker: 'flicker 3s ease-in-out infinite',
        pulseGlow: 'pulseGlow 1.2s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
