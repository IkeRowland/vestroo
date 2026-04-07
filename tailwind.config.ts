import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: ['class'],
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        sans: [
          'var(--font-montserrat)',
          'var(--font-poppins)',
          'system-ui',
          'sans-serif',
        ],
        display: ['var(--font-montserrat)', 'system-ui', 'sans-serif'],
        Poppins: ['var(--font-poppins)', 'sans-serif'],
      },
      colors: {
        vest: {
          rust: '#C04C33',
          'rust-dark': '#a33f2a',
          charcoal: '#222222',
          section: '#F8F8F8',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        ops: {
          canvas: 'hsl(var(--ops-canvas) / <alpha-value>)',
          surface: 'hsl(var(--ops-surface) / <alpha-value>)',
          'surface-hover': 'hsl(var(--ops-surface-hover) / <alpha-value>)',
          'surface-active': 'hsl(var(--ops-surface-active) / <alpha-value>)',
          border: 'hsl(var(--ops-border) / <alpha-value>)',
          foreground: 'hsl(var(--ops-foreground) / <alpha-value>)',
          muted: 'hsl(var(--ops-muted) / <alpha-value>)',
          topbar: 'hsl(var(--ops-topbar) / <alpha-value>)',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      width: {
        'ops-sidebar': 'var(--ops-sidebar-width)',
        'ops-sidebar-collapsed': 'var(--ops-sidebar-collapsed-width)',
      },
      maxWidth: {
        'ops-sidebar-drawer': '85vw',
      },
      fontSize: {
        'ops-page-title': [
          '1.5rem',
          { lineHeight: '2rem', fontWeight: '600' },
        ],
        'ops-table-header': [
          '0.75rem',
          { lineHeight: '1rem', fontWeight: '600' },
        ],
        'ops-table-body': ['0.875rem', { lineHeight: '1.25rem' }],
        'ops-dense': ['0.75rem', { lineHeight: '1rem' }],
      },
      ringColor: {
        ops: 'hsl(var(--ops-ring))',
      },
    },
  },
  plugins: [],
};

export default config;

