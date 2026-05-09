/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        vapor: {
          black:  '#0a0a0f',
          purple: '#1a0f2e',
          deep:   '#12121A',
          navy:   '#1b1f3a',
          pink:   '#ff2aa3',
          cyan:   '#00f5ff',
          magenta:'#ff2e88',
          violet: '#b44dff',
          green:  '#05ffa1',
          yellow: '#fede5d',
          orange: '#ff8b39',
          red:    '#fe4450',
          muted:  '#887baa',
          light:  '#f0e6ff',
        },
      },
      fontFamily: {
        sans: ['VT323', 'ui-monospace', 'Consolas', 'monospace'],
        display: ['VT323', 'monospace'],
        mono: ['VT323', 'ui-monospace', 'Consolas', 'monospace'],
        pixel: ['Press Start 2P', 'cursive'],
      },
      backgroundImage: {
        'retro-grid': "linear-gradient(rgba(255,42,163,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(0,245,255,0.04) 1px, transparent 1px)",
        'vapor-gradient': 'linear-gradient(135deg, #1a0f2e, #0a0a0f)',
        'sunset': 'linear-gradient(90deg, #ff2aa3, #ff8b39, #b44dff)',
        'neon-grad': 'linear-gradient(90deg, #ff2aa3, #00f5ff)',
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
      boxShadow: {
        'neon-pink': '0 0 5px #ff2aa3, 0 0 10px #ff2aa3, 0 0 20px rgba(255,42,163,0.4)',
        'neon-cyan': '0 0 5px #00f5ff, 0 0 10px #00f5ff, 0 0 20px rgba(0,245,255,0.4)',
        'neon-purple': '0 0 5px #b44dff, 0 0 10px #b44dff, 0 0 20px rgba(180,77,255,0.4)',
        'neon-green': '0 0 5px #05ffa1, 0 0 10px #05ffa1, 0 0 20px rgba(5,255,161,0.4)',
        'glow-card': '0 0 15px rgba(255,42,163,0.08), 0 0 30px rgba(0,245,255,0.05)',
      },
      minHeight: { touch: '44px' },
      minWidth: { touch: '44px' },
      keyframes: {
        'neon-pulse': {
          '0%, 100%': { opacity: '1', boxShadow: '0 0 5px #ff2aa3, 0 0 10px #ff2aa3, 0 0 20px rgba(255,42,163,0.4)' },
          '50%': { opacity: '0.7', boxShadow: '0 0 2px #ff2aa3, 0 0 5px #ff2aa3, 0 0 10px rgba(255,42,163,0.2)' },
        },
        'glow-shift': {
          '0%, 100%': { boxShadow: '0 0 15px rgba(255,42,163,0.15), 0 0 30px rgba(0,245,255,0.08)' },
          '50%': { boxShadow: '0 0 15px rgba(0,245,255,0.15), 0 0 30px rgba(255,42,163,0.08)' },
        },
        'scanline': {
          '0%': { transform: 'translateY(0)' },
          '100%': { transform: 'translateY(4px)' },
        },
        'float-up': { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'scale-in': { from: { opacity: '0', transform: 'scale(0.95)' }, to: { opacity: '1', transform: 'scale(1)' } },
      },
      animation: {
        'neon-pulse': 'neon-pulse 2s ease-in-out infinite',
        'glow-shift': 'glow-shift 3s ease-in-out infinite',
        'scanline': 'scanline 8s linear infinite',
        'float-up': 'float-up 0.3s ease-out',
        'fade-in': 'fade-in 0.2s ease-out',
        'scale-in': 'scale-in 0.2s ease-out',
      },
    },
  },
  plugins: [],
};
