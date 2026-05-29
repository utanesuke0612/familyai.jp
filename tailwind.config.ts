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

        // ── familyaidesign casual ブランドカラー ──────────
        paper:          '#f3ead8',
        'paper-2':      '#ece1c9',
        'paper-3':      '#f7f0dd',
        'paper-shadow': '#d8c9a8',
        ink:            '#1f1a17',
        'ink-2':        '#4a3f37',
        'ink-3':        '#7a6a5d',
        terracotta:     '#b8412a',
        'terracotta-deep': '#8a2e1c',
        teal:           '#1f5e62',
        olive:          '#6f7a3a',
        mustard:        '#d99a2b',

        // ── 旧ブランドカラー（エイリアス） ──────────────
        cream:           '#f3ead8',
        peach:           '#e89077',
        'peach-light':   '#f7f0dd',
        orange:          '#b8412a',
        beige:           '#ece1c9',
        'beige-dark':    '#d8c9a8',
        brown:           '#1f1a17',
        'brown-light':   '#4a3f37',
        sky:             '#ece1c9',
        mint:            '#ece1c9',
        yellow:          '#d99a2b',

        // ── 民藝（Mingei）トークン（エイリアス） ─────
        washi:        '#f3ead8',
        'washi-deep': '#ece1c9',
        'washi-light':'#f7f0dd',
        sumi:         '#1f1a17',
        'sumi-light': '#4a3f37',
        'sumi-soft':  '#7a6a5d',
        shu:          '#b8412a',
        'shu-deep':   '#8a2e1c',
        'shu-soft':   '#e89077',
        line:         '#d8c9a8',
        'line-soft':  '#e2d2b5',

        // ── ロール別カラー ─────────────────────────────
        papa: {
          bg:     '#ece1c9',
          accent: '#1f5e62',
          text:   '#1f1a17',
          border: '#d8c9a8',
        },
        mama: {
          bg:     '#f7f0dd',
          accent: '#b8412a',
          text:   '#1f1a17',
          border: '#e89077',
        },
        kids: {
          bg:     '#ece1c9',
          accent: '#6f7a3a',
          text:   '#1f1a17',
          border: '#d8c9a8',
        },
        senior: {
          bg:     '#f7f0dd',
          accent: '#d99a2b',
          text:   '#1f1a17',
          border: '#d8c9a8',
        },
        common: {
          bg:     '#f3ead8',
          accent: '#3060D0',
          text:   '#1f1a17',
          border: '#d8c9a8',
        },
      },

      // ══════════════════════════════════════════════════
      // フォントファミリー
      // ══════════════════════════════════════════════════
      fontFamily: {
        body:    ['var(--font-body)',    'Zen Kaku Gothic Antique', 'Noto Sans SC', 'Nunito Sans', 'sans-serif'],
        display: ['var(--font-display)', 'Shippori Mincho', 'Noto Serif SC', 'Playfair Display', 'serif'],
        sans:    ['var(--font-body)',    'Zen Kaku Gothic Antique', 'Noto Sans SC', 'Nunito Sans', 'sans-serif'],
        mono:    ['DM Mono', 'JetBrains Mono', 'monospace'],
        hand:    ['Caveat', 'Shadows Into Light', 'cursive'],
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
        'warm-sm': '0 2px 8px rgba(40, 28, 18, 0.08)',
        'warm':    '0 14px 30px -12px rgba(40, 28, 18, 0.45), 0 4px 10px -4px rgba(40, 28, 18, 0.25)',
        'warm-lg': '0 20px 50px -12px rgba(40, 28, 18, 0.50), 0 8px 20px -6px rgba(40, 28, 18, 0.30)',
        'peach':   '0 4px 24px rgba(184, 65, 42, 0.20)',
        'orange':  '0 4px 12px rgba(184, 65, 42, 0.35)',
        'orange-lg':'0 6px 32px rgba(184, 65, 42, 0.50)',
        'sky':     '0 4px 24px rgba(31, 94, 98, 0.15)',
        'mint':    '0 4px 24px rgba(111, 122, 58, 0.15)',
        'inner-warm': 'inset 0 2px 8px rgba(40, 28, 18, 0.06)',
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
