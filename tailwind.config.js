const token = (name) => ({ opacityValue }) =>
  opacityValue === undefined
    ? `var(--${name})`
    : `rgb(var(--${name}-rgb) / ${opacityValue})`

const mutedToken = (name, defaultOpacity) => ({ opacityValue }) => {
  if (opacityValue === undefined) return `var(--${name})`

  // Tailwind supplies its opacity variable for an unmodified color. Preserve
  // the muted token's intended alpha, but let explicit modifiers such as /30
  // continue to override it.
  const opacity = opacityValue.includes('var(--tw-')
    ? `calc(${defaultOpacity} * ${opacityValue})`
    : opacityValue

  return `rgb(var(--${name}-rgb) / ${opacity})`
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ["class"],
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive) / <alpha-value>)",
          foreground: "hsl(var(--destructive-foreground) / <alpha-value>)",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
        sidebar: {
          DEFAULT: "hsl(var(--sidebar-background))",
          foreground: "hsl(var(--sidebar-foreground))",
          primary: "hsl(var(--sidebar-primary))",
          "primary-foreground": "hsl(var(--sidebar-primary-foreground))",
          accent: "hsl(var(--sidebar-accent))",
          "accent-foreground": "hsl(var(--sidebar-accent-foreground))",
          border: "hsl(var(--sidebar-border))",
          ring: "hsl(var(--sidebar-ring))",
        },
        // JobPilot custom design tokens
        "bg-primary": token("bg-primary"),
        "bg-secondary": token("bg-secondary"),
        "bg-tertiary": token("bg-tertiary"),
        "bg-elevated": token("bg-elevated"),
        "border-subtle": token("border-subtle"),
        "border-default": token("border-default"),
        "border-focus": token("border-focus"),
        "text-primary": token("text-primary"),
        "text-secondary": token("text-secondary"),
        "text-muted": token("text-muted"),
        "text-inverse": token("text-inverse"),
        "accent-indigo": token("accent-indigo"),
        "accent-indigo-hover": token("accent-indigo-hover"),
        "accent-indigo-muted": mutedToken("accent-indigo-muted", 0.15),
        "accent-cyan": token("accent-cyan"),
        "accent-cyan-muted": mutedToken("accent-cyan-muted", 0.12),
        "accent-emerald": token("accent-emerald"),
        "accent-emerald-muted": mutedToken("accent-emerald-muted", 0.12),
        "accent-amber": token("accent-amber"),
        "accent-amber-muted": mutedToken("accent-amber-muted", 0.12),
        "accent-orange": token("accent-orange"),
        "accent-orange-muted": mutedToken("accent-orange-muted", 0.12),
        "accent-rose": token("accent-rose"),
        "accent-rose-muted": mutedToken("accent-rose-muted", 0.12),
        "accent-violet": token("accent-violet"),
        "accent-violet-muted": mutedToken("accent-violet-muted", 0.12),
      },
      fontFamily: {
        heading: ['"Space Grotesk"', 'system-ui', 'sans-serif'],
        body: ['"Inter"', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      fontSize: {
        'display-xl': ['3rem',    { lineHeight: '1.1',  fontWeight: '700', letterSpacing: '-0.02em' }],
        'display-lg': ['2.25rem', { lineHeight: '1.15', fontWeight: '700', letterSpacing: '-0.02em' }],
        'display-md': ['1.75rem', { lineHeight: '1.2',  fontWeight: '600', letterSpacing: '-0.01em' }],
        'heading-lg': ['1.375rem',{ lineHeight: '1.25', fontWeight: '600', letterSpacing: '-0.01em' }],
        'heading-md': ['1.125rem',{ lineHeight: '1.3',  fontWeight: '600' }],
        'heading-sm': ['0.9375rem',{ lineHeight: '1.4', fontWeight: '600' }],
        'body-lg':    ['1rem',    { lineHeight: '1.6' }],
        'body-md':    ['0.875rem',{ lineHeight: '1.55' }],
        'body-sm':    ['0.8125rem',{ lineHeight: '1.5' }],
        'body-xs':    ['0.75rem', { lineHeight: '1.4', fontWeight: '500' }],
      },
      spacing: {
        'space-1': '4px',
        'space-2': '8px',
        'space-3': '12px',
        'space-4': '16px',
        'space-5': '20px',
        'space-6': '24px',
        'space-8': '32px',
        'space-10': '40px',
        'space-12': '48px',
        'space-16': '64px',
        'space-20': '80px',
        'sidebar': '256px',
        'sidebar-collapsed': '72px',
        'topbar': '64px',
      },
      borderRadius: {
        xl: "calc(var(--radius) + 4px)",
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
        xs: "calc(var(--radius) - 6px)",
        "card": "12px",
        "card-sm": "8px",
        "card-lg": "16px",
        "button": "8px",
        "input": "8px",
        "pill": "999px",
      },
      maxWidth: {
        "content": "1440px",
      },
      zIndex: {
        "base": "0",
        "elevated": "10",
        "sticky": "30",
        "drawer": "45",
        "modal": "50",
        "toast": "60",
        "tooltip": "70",
      },
      keyframes: {
        "accordion-down": {
          from: { height: "0" },
          to: { height: "var(--radix-accordion-content-height)" },
        },
        "accordion-up": {
          from: { height: "var(--radix-accordion-content-height)" },
          to: { height: "0" },
        },
        "caret-blink": {
          "0%,70%,100%": { opacity: "1" },
          "20%,50%": { opacity: "0" },
        },
        "float": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-10px)" },
        },
        "pulse-dot": {
          "0%, 100%": { opacity: "1" },
          "50%": { opacity: "0.5" },
        },
        "shimmer": {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        "spin-slow": {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        "accordion-down": "accordion-down 0.2s ease-out",
        "accordion-up": "accordion-up 0.2s ease-out",
        "caret-blink": "caret-blink 1.25s ease-out infinite",
        "float": "float 4s ease-in-out infinite",
        "pulse-dot": "pulse-dot 2s ease-in-out infinite",
        "shimmer": "shimmer 1.5s ease-in-out infinite",
        "spin-slow": "spin-slow 800ms linear infinite",
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
}
