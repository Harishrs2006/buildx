// BuildX "Hi-Vis" design system, shared with the websites (docs/DESIGN_SYSTEM.md).
// Ink and sand carry the screen; signal lime marks the one thing to act on; cobalt is for info.
// The older semantic names (primary, surface, text...) are kept so every screen picks up the
// new palette; new code can use the brand names (ink, sand, lime, cobalt, stone) directly.

const ink = '#0B0C0A';
const sand = '#F2EFE7';
const lime = '#C8FF3D';

export const Colors = {
  // brand primitives
  ink,
  ink2: '#141512',
  ink3: '#1D1F1A',
  sand,
  sand2: '#FAF8F3',
  sand3: '#E8E4D9',
  sand4: '#DCD7C9',
  lime,
  limeDeep: '#A6E01C',
  limeSoft: '#EEFFC2',
  cobalt: '#2457FF',
  cobaltSoft: '#E3EAFF',
  stone: '#5E5B52',
  stoneLight: '#A3A197',

  // semantic (used across existing screens)
  primary: ink, // primary actions on light: ink fill, light text
  primaryDark: '#000000',
  primaryLight: '#EEFFC2', // soft lime tint behind selected chips and highlights

  surface: '#FAF8F3', // cards and screens
  surfaceAlt: sand, // page background, grouped sections
  border: '#DCD7C9',
  borderStrong: '#C9C4B5',

  text: ink,
  textSecondary: '#5E5B52',
  textMuted: '#8A877D',
  textInverse: sand,

  success: '#1F7A3A',
  successLight: '#E3F4E8',
  error: '#C8282E',
  errorLight: '#FDE3E3',
  warning: '#B26B00',
  warningLight: '#FFF4D6',
  info: '#2457FF',
  infoLight: '#E3EAFF',

  // status chips
  statusDraft: { bg: '#E8E4D9', text: '#5E5B52' },
  statusActive: { bg: lime, text: ink },
  statusInactive: { bg: '#E8E4D9', text: '#5E5B52' },
  statusPending: { bg: '#FFF4D6', text: '#5C4300' },
  statusDelivered: { bg: ink, text: lime },
  statusCancelled: { bg: '#FDE3E3', text: '#7A0E12' },
};

export type ColorKey = keyof typeof Colors;
