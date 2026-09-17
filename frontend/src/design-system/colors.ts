export const colors = {
  // Brand Base
  canvas: {
    light: '#F7F8FA',
    dark: '#0B111A',
  },
  surface: {
    light: '#FFFFFF',
    lightSubtle: '#F1F5F9',
    lightMuted: '#E2E8F0',
    dark: '#131D2A',
    darkSubtle: '#1B2738',
    darkMuted: '#24344B',
  },
  // Government Grade Primary
  primary: {
    DEFAULT: '#0F4C81',
    hover: '#0C3D68',
    light: '#EBF3FA',
    border: '#D0E2F2',
    contrast: '#FFFFFF',
  },
  // Accent Slate Ocean
  accent: {
    DEFAULT: '#3F72AF',
    hover: '#2B578F',
    light: '#EFF6FF',
  },
  // Semantic Status System
  status: {
    safe: {
      DEFAULT: '#2E7D32',
      bg: '#E8F5E9',
      border: '#A5D6A7',
      text: '#1B5E20',
      label: 'Safe',
    },
    alert: {
      DEFAULT: '#E65100',
      bg: '#FFF3E0',
      border: '#FFE082',
      text: '#BF360C',
      label: 'Stay Alert',
    },
    action: {
      DEFAULT: '#D32F2F',
      bg: '#FFEBEE',
      border: '#FFCDD2',
      text: '#B71C1C',
      label: 'Take Action',
    },
    info: {
      DEFAULT: '#0288D1',
      bg: '#E1F5FE',
      border: '#81D4FA',
      text: '#01579B',
    },
  },
  // High Contrast Text Tokens
  text: {
    primary: {
      light: '#1F2937',
      dark: '#F9FAFB',
    },
    secondary: {
      light: '#4B5563',
      dark: '#9CA3AF',
    },
    muted: {
      light: '#6B7280',
      dark: '#6B7280',
    },
    inverse: '#FFFFFF',
  },
  // Subtle Dividers
  border: {
    subtle: '#E5E7EB',
    medium: '#D1D5DB',
    dark: '#24344B',
  },
} as const;
