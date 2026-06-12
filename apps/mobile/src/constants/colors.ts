// BuildX design system — matches PRD "Industrial Sophistication" brand
export const Colors = {
  primary: '#F97316',       // Orange 500 — the BuildX brand
  primaryDark: '#EA580C',   // Orange 600
  primaryLight: '#FED7AA',  // Orange 200

  surface: '#FFFFFF',
  surfaceAlt: '#F9FAFB',    // Gray 50
  border: '#E5E7EB',        // Gray 200
  borderStrong: '#D1D5DB',  // Gray 300

  text: '#111827',          // Gray 900
  textSecondary: '#6B7280', // Gray 500
  textMuted: '#9CA3AF',     // Gray 400
  textInverse: '#FFFFFF',

  success: '#10B981',
  successLight: '#D1FAE5',
  error: '#EF4444',
  errorLight: '#FEE2E2',
  warning: '#F59E0B',
  warningLight: '#FEF3C7',
  info: '#3B82F6',
  infoLight: '#DBEAFE',

  // Status chips
  statusDraft: { bg: '#FEF3C7', text: '#92400E' },
  statusActive: { bg: '#D1FAE5', text: '#065F46' },
  statusInactive: { bg: '#F3F4F6', text: '#6B7280' },
  statusPending: { bg: '#DBEAFE', text: '#1E40AF' },
  statusDelivered: { bg: '#D1FAE5', text: '#065F46' },
  statusCancelled: { bg: '#FEE2E2', text: '#991B1B' },
};

export type ColorKey = keyof typeof Colors;
