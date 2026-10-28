import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Colors } from '../constants/colors';

// Hi-Vis building blocks for the app, matching the websites (docs/DESIGN_SYSTEM.md)

// Tab bar shared by every role: an ink bar, the active tab filled with lime. It sits in normal
// layout flow (not floating) so it can never cover a screen's bottom buttons.
export const tabBarStyle: ViewStyle = {
  height: 76,
  backgroundColor: Colors.ink,
  borderTopWidth: 0,
  paddingTop: 6,
  paddingBottom: 10,
  paddingHorizontal: 6,
};

export function TabItem({ label, focused }: { label: string; focused: boolean }) {
  return (
    <View style={[tabStyles.item, focused && tabStyles.itemFocused]} accessibilityState={{ selected: focused }}>
      <Text numberOfLines={1} style={[tabStyles.label, focused && tabStyles.labelFocused]}>{label}</Text>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  item: { minWidth: 72, height: 44, paddingHorizontal: 12, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  itemFocused: { backgroundColor: Colors.lime },
  label: { fontSize: 12, fontWeight: '600', color: 'rgba(242,239,231,0.65)' },
  labelFocused: { color: Colors.ink, fontWeight: '700' },
});

type ButtonVariant = 'ink' | 'lime' | 'ghost' | 'danger';

export function Button({
  title,
  onPress,
  variant = 'ink',
  disabled,
  loading,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const v = BUTTON[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled || !!loading, busy: !!loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [btn.base, v.box, (disabled || loading) && btn.disabled, pressed && btn.pressed, style]}
    >
      {loading ? <ActivityIndicator color={v.text.color} /> : <Text style={[btn.text, v.text]}>{title}</Text>}
    </Pressable>
  );
}

const BUTTON: Record<ButtonVariant, { box: ViewStyle; text: { color: string } }> = {
  ink: { box: { backgroundColor: Colors.ink }, text: { color: Colors.sand } },
  lime: { box: { backgroundColor: Colors.lime }, text: { color: Colors.ink } },
  ghost: { box: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(11,12,10,0.18)' }, text: { color: Colors.ink } },
  danger: { box: { backgroundColor: Colors.errorLight }, text: { color: Colors.error } },
};

const btn = StyleSheet.create({
  base: { minHeight: 52, borderRadius: 26, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 16, fontWeight: '700' },
  disabled: { opacity: 0.4 },
  pressed: { transform: [{ scale: 0.97 }] },
});

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[card.base, style]}>{children}</View>;
}

const card = StyleSheet.create({
  base: { backgroundColor: Colors.sand2, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(220,215,201,0.8)', padding: 16 },
});

export function Eyebrow({ children, color = Colors.stone }: { children: ReactNode; color?: string }) {
  return <Text style={[type.eyebrow, { color }]}>{children}</Text>;
}

export function Pill({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <View style={[pill.base, { backgroundColor: bg }]}>
      <Text style={[pill.text, { color }]}>{label.toUpperCase()}</Text>
    </View>
  );
}

const pill = StyleSheet.create({
  base: { alignSelf: 'flex-start', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  text: { fontSize: 11, fontWeight: '700', letterSpacing: 1 },
});

export const type = StyleSheet.create({
  eyebrow: { fontSize: 11, fontWeight: '600', letterSpacing: 2, textTransform: 'uppercase' },
  display: { fontSize: 34, lineHeight: 36, fontWeight: '800', letterSpacing: -1.2, color: Colors.ink },
  title: { fontSize: 24, lineHeight: 28, fontWeight: '800', letterSpacing: -0.6, color: Colors.ink },
  body: { fontSize: 16, lineHeight: 23, color: Colors.stone },
});

