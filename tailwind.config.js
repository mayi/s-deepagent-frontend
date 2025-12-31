/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      /* 午夜琥珀色彩系统 */
      colors: {
        ink: {
          950: '#050508',
          900: '#0a0a0f',
          800: '#12121a',
          700: '#1a1a25',
          600: '#252532',
          500: '#35354a',
          400: '#4a4a65',
          300: '#6b6b8a',
          200: '#9090a8',
          100: '#c0c0d0',
        },
        amber: {
          500: '#f59e0b',
          400: '#fbbf24',
          300: '#fcd34d',
          200: '#fde68a',
        },
        ember: {
          600: '#ea580c',
          500: '#f97316',
          400: '#fb923c',
        },
        jade: {
          600: '#059669',
          500: '#10b981',
          400: '#34d399',
        },
        coral: {
          600: '#e11d48',
          500: '#f43f5e',
          400: '#fb7185',
        },
      },
      /* 字体家族 */
      fontFamily: {
        serif: ['Noto Serif SC', 'Songti SC', 'serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['ZCOOL XiaoWei', 'Noto Serif SC', 'serif'],
      },
      /* 圆角 */
      borderRadius: {
        '4xl': '2rem',
      },
      /* 阴影 */
      boxShadow: {
        'glow': '0 0 30px rgba(251, 191, 36, 0.15)',
        'glow-lg': '0 0 60px rgba(251, 191, 36, 0.2)',
        'card': '0 4px 24px rgba(0, 0, 0, 0.4)',
        'float': '0 8px 32px rgba(0, 0, 0, 0.5)',
      },
      /* 动画 */
      animation: {
        'ink-spread': 'ink-spread 0.6s cubic-bezier(0.22, 1, 0.36, 1) forwards',
        'amber-pulse': 'amber-pulse 2s ease-in-out infinite',
        'float-gentle': 'float-gentle 3s ease-in-out infinite',
        'glow-breathe': 'glow-breathe 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.5s ease-out forwards',
      },
      keyframes: {
        'ink-spread': {
          '0%': {
            opacity: '0',
            transform: 'scale(0.9) translateY(10px)',
            filter: 'blur(4px)',
          },
          '100%': {
            opacity: '1',
            transform: 'scale(1) translateY(0)',
            filter: 'blur(0)',
          },
        },
        'amber-pulse': {
          '0%, 100%': {
            boxShadow: '0 0 0 0 rgba(251, 191, 36, 0.4)',
          },
          '50%': {
            boxShadow: '0 0 20px 4px rgba(251, 191, 36, 0.2)',
          },
        },
        'float-gentle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        'glow-breathe': {
          '0%, 100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        'slide-up': {
          from: {
            opacity: '0',
            transform: 'translateY(20px)',
          },
          to: {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
      },
      /* 背景渐变 */
      backgroundImage: {
        'gradient-amber': 'linear-gradient(135deg, #f59e0b 0%, #f97316 100%)',
        'gradient-ink': 'linear-gradient(180deg, #12121a 0%, #0a0a0f 100%)',
      },
    },
  },
  plugins: [],
};
