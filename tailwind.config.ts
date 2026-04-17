import type { Config } from 'tailwindcss';

/**
 * tailwind.config.ts
 * familyai.jp — Tailwind v3 設定（Step 03 完全版）
 *
 * カラー命名ルール:
 *   - ブランドカラー → cream / peach / orange / beige / brown / sky / mint / yellow
 *   - ロール別カラー → papa-* / mama-* / kids-* / senior-* / common-*
 *   - shadcn/ui     → background / foreground / primary / ... (HSL CSS変数参照)
 */
const config: Config = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {

      // ══════════════════════════════════════════════════
      // カラー
      // ══════════════════════════════════════════════════
      colors: {
        // ── shadcn/ui 必須カラー（HSL CSS変数参照） ────
        background:  'hsl(var(--background))',
        foreground:  'hsl(var(--foreground))',
        card: {
          DEFAULT:    'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT:    'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT:    'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT:    'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT:    'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT:    'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT:    'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input:  'hsl(var(--input))',
        ring:   'hsl(var(--ring))',

        // ── familyai.jp ブランドカラー ─────────────────
        cream:           '#FDF6ED',
        peach:           '#FFAD80',
        'peach-light':   '#FFD4B2',
        orange:          '#FF8C42',
        beige:           '#F5E6D0',
        'beige-dark':    '#E8CFA8',
        brown:           '#8B5E3C',
        'brown-light':   '#B5896A',
        sky:             '#C8E8F8',
        mint:            '#B8EDD8',
        yellow:          '#FFE066',

        // ── ロール別カラー ─────────────────────────────
        papa: {
          bg:     '#C8E8F8',   // sky
          accent: '#4A90C4',
          text:   '#1a4f72',
          border: '#9dd0ed',
        },
        mama: {
          bg:     '#FFD4B2',   // peach-light
          accent: '#FF8C42',   // orange
          text:   '#8B3a00',
          border: '#ffb980',
        },
        kids: {
          bg:     '#B8EDD8',   // mint
          accent: '#2EAA6E',
          text:   '#145c38',
          border: '#7ddbb8',
        },
        senior: {
          bg:     '#FFE066',   // yellow
          accent: '#C07800',
          text:   '#6b4200',
          border: '#f5c800',
        },
        common: {
          bg:     '#FDF6ED',   // cream
          accent: '#3060D0',
          text:   '#1a3580',
          border: '#b0c4f0',
        },
      },

      // ══════════════════════════════════════════════════
      // フォントファミリー
      // ══════════════════════════════════════════════════
      fontFamily: {
        body:    ['var(--font-body)',    'Zen Maru Gothic', 'sans-serif'],
        display: ['var(--font-display)', 'Kaisei Opti',     'serif'],
        sans:    ['var(--font-body)',    'Zen Maru Gothic', 'sans-serif'],
        mono:    ['Courier New', 'Courier', 'monospace'],
      },

      // ══════════════════════════════════════════════════
      // ボーダー半径
      // ══════════════════════════════════════════════════
      borderRadius: {
        lg:   'var(--radius)',
        md:   'calc(var(--radius) - 2px)',
        sm:   'calc(var(--radius) - 4px)',
        '2xl': '1.25rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
        blob: '60% 40% 30% 70% / 60% 30% 70% 40%',
      },

      // ══════════════════════════════════════════════════
      // ボックスシャドウ
      // ══════════════════════════════════════════════════
      boxShadow: {
        'warm-sm': '0 2px 8px rgba(139, 94, 60, 0.08)',
        'warm':    '0 4px 24px rgba(139, 94, 60, 0.12)',
        'warm-lg': '0 8px 48px rgba(139, 94, 60, 0.16)',
        'peach':   '0 4px 24px rgba(255, 173, 128, 0.35)',
        'orange':  '0 4px 24px rgba(255, 140, 66, 0.40)',
        'orange-lg':'0 6px 32px rgba(255, 140, 66, 0.50)',
        'sky':     '0 4px 24px rgba(200, 232, 248, 0.50)',
        'mint':    '0 4px 24px rgba(184, 237, 216, 0.50)',
        'inner-warm': 'inset 0 2px 8px rgba(139, 94, 60, 0.06)',
      },

      // ══════════════════════════════════════════════════
      // アニメーション（Tailwind animate-* クラス）
      // ══════════════════════════════════════════════════
      animation: {
        // ページ読み込み
        'fade-in-up':    'fadeInUp 480ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'fade-in':       'fadeIn 320ms ease both',
        // 浮遊
        'float':         'float 6s ease-in-out infinite',
        'float-r':       'floatR 7s ease-in-out infinite',
        // ハートビート・パルス
        'heartbeat':     'heartbeat 2.4s ease-in-out infinite',
        'pulse-soft':    'pulseSoft 2s ease-in-out infinite',
        'pulse-glow':    'pulseGlow 2s ease-in-out infinite',
        // UI
        'blink':         'blink 1s step-end infinite',
        'scale-in':      'scaleIn 280ms cubic-bezier(0.34, 1.56, 0.64, 1) both',
        'slide-down':    'slideDown 280ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-up':      'slideUp 280ms cubic-bezier(0.16, 1, 0.3, 1) both',
        // コンテンツ
        'shimmer':       'shimmer 1.6s linear infinite',
        'ticker':        'ticker 24s linear infinite',
        // Blob
        'morph':         'morph 10s ease-in-out infinite',
        'morph-r':       'morphR 12s ease-in-out infinite',
        // 表示遅延付きフェードアップ（stagger 用）
        'reveal':        'fadeInUp 480ms cubic-bezier(0.16, 1, 0.3, 1) both',
      },

      // ══════════════════════════════════════════════════
      // キーフレーム
      // ══════════════════════════════════════════════════
      keyframes: {
        fadeInUp: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '33%':      { transform: 'translateY(-12px) rotate(1.5deg)' },
          '66%':      { transform: 'translateY(-6px) rotate(-1deg)' },
        },
        floatR: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '33%':      { transform: 'translateY(-8px) rotate(-2deg)' },
          '66%':      { transform: 'translateY(-16px) rotate(1.5deg)' },
        },
        heartbeat: {
          '0%, 100%': { transform: 'scale(1)' },
          '14%':      { transform: 'scale(1.06)' },
          '28%':      { transform: 'scale(1)' },
          '42%':      { transform: 'scale(1.04)' },
          '70%':      { transform: 'scale(1)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%':      { opacity: '0.7', transform: 'scale(0.95)' },
        },
        pulseGlow: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(255, 140, 66, 0.4)' },
          '50%':      { boxShadow: '0 0 0 12px rgba(255, 140, 66, 0)' },
        },
        blink: {
          '0%, 100%': { opacity: '1' },
          '50%':      { opacity: '0' },
        },
        scaleIn: {
          from: { opacity: '0', transform: 'scale(0.92)' },
          to:   { opacity: '1', transform: 'scale(1)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          from: { backgroundPosition: '-200% 0' },
          to:   { backgroundPosition: '200% 0' },
        },
        ticker: {
          from: { transform: 'translateX(0)' },
          to:   { transform: 'translateX(-50%)' },
        },
        morph: {
          '0%, 100%': { borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' },
          '25%':      { borderRadius: '30% 60% 70% 40% / 50% 60% 30% 60%' },
          '50%':      { borderRadius: '50% 60% 30% 60% / 30% 60% 70% 40%' },
          '75%':      { borderRadius: '40% 60% 50% 30% / 60% 30% 60% 50%' },
        },
        morphR: {
          '0%, 100%': { borderRadius: '40% 60% 70% 30% / 40% 50% 60% 50%' },
          '25%':      { borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%' },
          '50%':      { borderRadius: '30% 60% 60% 40% / 70% 30% 50% 60%' },
          '75%':      { borderRadius: '50% 40% 40% 60% / 30% 60% 40% 60%' },
        },
      },

      // ══════════════════════════════════════════════════
      // スペーシング（カスタム値）
      // ══════════════════════════════════════════════════
      spacing: {
        '18':  '4.5rem',
        '22':  '5.5rem',
        '26':  '6.5rem',
        '30':  '7.5rem',
        '34':  '8.5rem',
        '68':  '17rem',
        '76':  '19rem',
        '84':  '21rem',
        '88':  '22rem',
        '92':  '23rem',
        '100': '25rem',
        '112': '28rem',
        '128': '32rem',
      },

      // ══════════════════════════════════════════════════
      // 最大幅
      // ══════════════════════════════════════════════════
      maxWidth: {
        'content': '72ch',
        'container': '1140px',
      },

      // ══════════════════════════════════════════════════
      // トランジションタイミング
      // ══════════════════════════════════════════════════
      transitionTimingFunction: {
        'bounce-out': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'smooth-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },

      // ══════════════════════════════════════════════════
      // アスペクト比
      // ══════════════════════════════════════════════════
      aspectRatio: {
        'article': '16 / 9',
        'card':    '4 / 3',
        'avatar':  '1 / 1',
        'og':      '1200 / 630',
      },

      // ══════════════════════════════════════════════════
      // z-index
      // ══════════════════════════════════════════════════
      zIndex: {
        'header':  '50',
        'overlay': '60',
        'modal':   '70',
        'toast':   '80',
      },
    },
  },
  plugins: [],
};

export default config;
