import { Platform, TextStyle } from 'react-native';

// GymIt design tokens ("Ink and bone"). Every screen takes its colours, sizes
// and text styles from here, so the look stays consistent and can change in
// one place.

// Colours. Text colours are checked against the card background (#1C1C1C):
// text 15:1, textSoft 8:1, textMuted 5.8:1, textFaint 4.9:1. All pass the
// 4.5:1 minimum for normal text.
export const C = {
  bg: '#131313', // screen background
  card: '#1C1C1C', // cards, sheets, panels
  raised: '#272727', // inputs, chips, dividers and borders
  selected: '#3A3A3A', // selected toggle / segment

  text: '#F2F0EC',
  textSoft: '#B5B1AA',
  textMuted: '#9A968F', // secondary text
  textFaint: '#8C8A86', // captions, column headers, placeholders

  accent: '#D9D5CE', // bone: primary buttons, active tab, progress fills
  accentDim: '#77746E', // half-strength accent: lighter heatmap days, bars under target
  onAccent: '#171614', // text/icons on accent
  signal: '#E9A23B', // one warm highlight: streaks, PRs, "new"
  signalBg: '#3A2A12', // behind signal-coloured text: the PR badge

  success: '#1D9E75',
  successBg: '#1B2A24', // row tint for a finished set
  warning: '#E6B800',
  danger: '#E5544B',
  rest: '#FAC775', // rest timer running
  restOver: '#3A2020', // rest timer past its target
} as const;

export const R = { sm: 6, md: 10, lg: 14, xl: 20, pill: 999 } as const;

export const S = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 } as const;

// Barlow Condensed for numbers (timers, weights, stats); the system font for
// everything else. Loaded in app/_layout.tsx before the app is shown.
export const FONT = {
  num: 'BarlowCondensed_600SemiBold',
  numBold: 'BarlowCondensed_700Bold',
} as const;

// Type scale.
export const T = {
  title: { fontSize: 28, fontWeight: '700', color: C.text },
  heading: { fontSize: 20, fontWeight: '600', color: C.text },
  subheading: { fontSize: 16, fontWeight: '500', color: C.text },
  body: { fontSize: 15, color: C.text },
  label: { fontSize: 13, color: C.textMuted },
  caption: { fontSize: 12, color: C.textFaint },
  // Numbers line up digit-for-digit so timers don't jitter as they count.
  num: { fontFamily: FONT.num, fontVariant: ['tabular-nums'], color: C.text },
  numBig: { fontFamily: FONT.numBold, fontSize: 44, fontVariant: ['tabular-nums'], color: C.text },
} satisfies Record<string, TextStyle>;

// Minimum comfortable tap target (Apple HIG). Use as hitSlop on small icons.
export const HIT = { top: 12, bottom: 12, left: 12, right: 12 } as const;

// --- Legacy exports still used by leftover Expo template components ---------
const tintColorLight = C.accent;
const tintColorDark = C.accent;

export const Colors = {
  light: {
    text: '#11181C',
    background: '#fff',
    tint: tintColorLight,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: tintColorLight,
  },
  dark: {
    text: '#ECEDEE',
    background: '#151718',
    tint: tintColorDark,
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: tintColorDark,
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'system-ui',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'ui-monospace',
  },
  default: {
    sans: 'normal',
    serif: 'serif',
    rounded: 'normal',
    mono: 'monospace',
  },
  web: {
    sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
