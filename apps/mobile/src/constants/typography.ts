// Hi-Vis type, shared with the websites (docs/DESIGN_SYSTEM.md). All four families are SIL Open
// Font License; the files live in assets/fonts and are loaded once in app/_layout.tsx under these
// names. Custom fonts carry their own weight, so styles set fontFamily and leave fontWeight out
// (Android falls back to the system font when both are set).

export const fontFiles = {
  BricolageGrotesque_700Bold: require('../../assets/fonts/BricolageGrotesque_700Bold.ttf'),
  BricolageGrotesque_800ExtraBold: require('../../assets/fonts/BricolageGrotesque_800ExtraBold.ttf'),
  Geist_400Regular: require('../../assets/fonts/Geist_400Regular.ttf'),
  Geist_500Medium: require('../../assets/fonts/Geist_500Medium.ttf'),
  Geist_600SemiBold: require('../../assets/fonts/Geist_600SemiBold.ttf'),
  Geist_700Bold: require('../../assets/fonts/Geist_700Bold.ttf'),
  GeistMono_500Medium: require('../../assets/fonts/GeistMono_500Medium.ttf'),
  GeistMono_600SemiBold: require('../../assets/fonts/GeistMono_600SemiBold.ttf'),
  InstrumentSerif_400Regular_Italic: require('../../assets/fonts/InstrumentSerif_400Regular_Italic.ttf'),
};

export const Font = {
  // Headlines and big numbers
  display: 'BricolageGrotesque_800ExtraBold',
  displayBold: 'BricolageGrotesque_700Bold',
  // UI and body
  regular: 'Geist_400Regular',
  medium: 'Geist_500Medium',
  semiBold: 'Geist_600SemiBold',
  bold: 'Geist_700Bold',
  // Eyebrow labels, order numbers, codes
  mono: 'GeistMono_500Medium',
  monoBold: 'GeistMono_600SemiBold',
  // One accent word per headline at most
  serifItalic: 'InstrumentSerif_400Regular_Italic',
};

export const FontSize = {
  xs: 11,
  sm: 13,
  base: 15,
  md: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 28,
  '4xl': 32,
  display: 40,
};
