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
          'nav-active': 'hsl(var(--ops-nav-active) / <alpha-value>)',
          border: 'hsl(var(--ops-border) / <alpha-value>)',
          foreground: 'hsl(var(--ops-foreground) / <alpha-value>)',
          muted: 'hsl(var(--ops-muted) / <alpha-value>)',
          topbar: 'hsl(var(--ops-topbar) / <alpha-value>)',
          /* FE.17.1 — visual-redesign-tokens.md §7 */
          accent: 'hsl(var(--ops-accent) / <alpha-value>)',
          'accent-foreground':
            'hsl(var(--ops-accent-foreground) / <alpha-value>)',
          'accent-soft': 'hsl(var(--ops-accent-soft))',
          success: 'hsl(var(--ops-success) / <alpha-value>)',
          'success-foreground':
            'hsl(var(--ops-success-foreground) / <alpha-value>)',
          warning: 'hsl(var(--ops-warning) / <alpha-value>)',
          'warning-foreground':
            'hsl(var(--ops-warning-foreground) / <alpha-value>)',
          danger: 'hsl(var(--ops-danger) / <alpha-value>)',
          'danger-foreground':
            'hsl(var(--ops-danger-foreground) / <alpha-value>)',
          info: 'hsl(var(--ops-info) / <alpha-value>)',
          'info-foreground':
            'hsl(var(--ops-info-foreground) / <alpha-value>)',
          chart: {
            '1': 'hsl(var(--ops-chart-1) / <alpha-value>)',
            '2': 'hsl(var(--ops-chart-2) / <alpha-value>)',
            '3': 'hsl(var(--ops-chart-3) / <alpha-value>)',
            '4': 'hsl(var(--ops-chart-4) / <alpha-value>)',
            '5': 'hsl(var(--ops-chart-5) / <alpha-value>)',
            '6': 'hsl(var(--ops-chart-6) / <alpha-value>)',
          },
        },
        /** FE.18.1 — parallel namespace; vars only under [data-account-theme="light"] in globals.css */
        account: {
          canvas: 'hsl(var(--account-canvas) / <alpha-value>)',
          surface: 'hsl(var(--account-surface) / <alpha-value>)',
          'surface-hover': 'hsl(var(--account-surface-hover) / <alpha-value>)',
          border: 'hsl(var(--account-border) / <alpha-value>)',
          foreground: 'hsl(var(--account-foreground) / <alpha-value>)',
          muted: 'hsl(var(--account-muted) / <alpha-value>)',
          topbar: 'hsl(var(--account-topbar) / <alpha-value>)',
          accent: 'hsl(var(--account-accent) / <alpha-value>)',
          'accent-foreground':
            'hsl(var(--account-accent-foreground) / <alpha-value>)',
          'accent-soft': 'hsl(var(--account-accent-soft))',
          success: 'hsl(var(--account-success) / <alpha-value>)',
          'success-foreground':
            'hsl(var(--account-success-foreground) / <alpha-value>)',
          warning: 'hsl(var(--account-warning) / <alpha-value>)',
          'warning-foreground':
            'hsl(var(--account-warning-foreground) / <alpha-value>)',
          danger: 'hsl(var(--account-danger) / <alpha-value>)',
          'danger-foreground':
            'hsl(var(--account-danger-foreground) / <alpha-value>)',
          info: 'hsl(var(--account-info) / <alpha-value>)',
          'info-foreground':
            'hsl(var(--account-info-foreground) / <alpha-value>)',
          chart: {
            '1': 'hsl(var(--account-chart-1) / <alpha-value>)',
            '2': 'hsl(var(--account-chart-2) / <alpha-value>)',
            '3': 'hsl(var(--account-chart-3) / <alpha-value>)',
            '4': 'hsl(var(--account-chart-4) / <alpha-value>)',
            '5': 'hsl(var(--account-chart-5) / <alpha-value>)',
            '6': 'hsl(var(--account-chart-6) / <alpha-value>)',
          },
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        'ops-card': 'var(--ops-radius-card)',
        'ops-pill': 'var(--ops-radius-pill)',
        'account-card': 'var(--account-radius-card)',
      },
      width: {
        'ops-sidebar': 'var(--ops-sidebar-width)',
        'ops-sidebar-collapsed': 'var(--ops-sidebar-collapsed-width)',
        'account-sidebar': 'var(--account-sidebar-width)',
        'account-sidebar-collapsed': 'var(--account-sidebar-collapsed-width)',
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
        account: 'hsl(var(--account-ring))',
      },
      boxShadow: {
        'ops-1': '0 1px 2px hsl(var(--ops-elevation-1))',
        'ops-2': '0 4px 12px hsl(var(--ops-elevation-2))',
        'account-1': '0 1px 2px hsl(var(--account-elevation-1))',
        'account-2': '0 4px 12px hsl(var(--account-elevation-2))',
      },
    },
  },
  plugins: [],
};

export default config;

