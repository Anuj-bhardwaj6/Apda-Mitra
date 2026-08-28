export const typography = {
  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  scale: {
    display: {
      size: '2.25rem', // 36px
      lineHeight: '2.5rem',
      fontWeight: '800',
      letterSpacing: '-0.025em',
    },
    heading: {
      size: '1.75rem', // 28px
      lineHeight: '2.1rem',
      fontWeight: '700',
      letterSpacing: '-0.02em',
    },
    title: {
      size: '1.375rem', // 22px
      lineHeight: '1.75rem',
      fontWeight: '700',
      letterSpacing: '-0.015em',
    },
    subtitle: {
      size: '1.125rem', // 18px
      lineHeight: '1.5rem',
      fontWeight: '600',
      letterSpacing: '-0.01em',
    },
    body: {
      size: '1rem', // 16px
      lineHeight: '1.5rem',
      fontWeight: '400',
      letterSpacing: '0',
    },
    bodyMedium: {
      size: '1rem', // 16px
      lineHeight: '1.5rem',
      fontWeight: '500',
      letterSpacing: '0',
    },
    caption: {
      size: '0.875rem', // 14px
      lineHeight: '1.25rem',
      fontWeight: '500',
      letterSpacing: '0.01em',
    },
    micro: {
      size: '0.75rem', // 12px
      lineHeight: '1rem',
      fontWeight: '600',
      letterSpacing: '0.02em',
    },
  },
} as const;
