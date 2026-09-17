export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  '2xl': '24px',
  '3xl': '32px',
  '4xl': '40px',
  touchTargetMin: '48px',
} as const;

export const radius = {
  sm: '8px',
  md: '14px',
  lg: '20px',
  xl: '24px',
  '2xl': '28px',
  full: '9999px',
} as const;

export const elevation = {
  1: '0 1px 3px rgba(15, 23, 42, 0.05), 0 1px 2px rgba(15, 23, 42, 0.03)',
  2: '0 4px 14px -2px rgba(15, 23, 42, 0.08), 0 2px 6px -1px rgba(15, 23, 42, 0.04)',
  3: '0 12px 28px -4px rgba(15, 23, 42, 0.12), 0 4px 10px -2px rgba(15, 23, 42, 0.06)',
  hero: '0 16px 36px -6px rgba(15, 76, 129, 0.16), 0 6px 12px -3px rgba(15, 76, 129, 0.08)',
  emergency: '0 12px 32px -4px rgba(211, 47, 47, 0.22), 0 4px 12px -2px rgba(211, 47, 47, 0.12)',
} as const;

export const motion = {
  duration: {
    instant: '100ms',
    fast: '200ms',
    normal: '300ms',
    slow: '500ms',
  },
  easing: {
    standard: 'cubic-bezier(0.16, 1, 0.3, 1)',
    decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
    accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
  },
} as const;
