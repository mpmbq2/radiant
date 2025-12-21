/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './src/**/*.{html,js,svelte,ts}',
    './index.html',
  ],
  plugins: [
    require('@tailwindcss/typography'),
  ],
  theme: {
    extend: {
      typography: {
        DEFAULT: {
          css: {
            '--tw-prose-body': 'var(--color-text-primary, #1f2937)',
            '--tw-prose-headings': 'var(--color-text-primary, #111827)',
            '--tw-prose-code': 'var(--color-text-primary, #1f2937)',
            '--tw-prose-code-bg': 'var(--color-bg-code, #f3f4f6)',
            '--tw-prose-pre-bg': 'var(--color-bg-pre, #1f2937)',
            '--tw-prose-pre-code': 'var(--color-text-pre, #f3f4f6)',
            '--tw-prose-quotes': 'var(--color-text-muted, #6b7280)',
            '--tw-prose-quote-borders': 'var(--color-border, #d1d5db)',
            maxWidth: 'none',
          },
        },
      },
    },
  },
};
