import { useId, type ComponentProps, type ReactNode } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Defs, G, Mask, Path, Polygon, Rect } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../constants/colors';
import { Font } from '../constants/typography';
import { BRAND_COLORS, MARK } from '../constants/brand';
import { IS_WORK_APP } from '../lib/appVariant';

// Hi-Vis building blocks for the app, matching the websites (docs/DESIGN_SYSTEM.md)

// Tab bar shared by every role: an ink bar, the active tab filled with lime. It sits in normal
// layout flow (not floating) so it can never cover a screen's bottom buttons.
export const tabBarStyle: ViewStyle = {
  height: 80,
  backgroundColor: Colors.ink,
  borderTopWidth: 0,
  paddingTop: 6,
  paddingBottom: 10,
  paddingHorizontal: 6,
};

export function TabItem({ label, focused, icon }: { label: string; focused: boolean; icon?: IconName }) {
  return (
    <View style={[tabStyles.item, focused && tabStyles.itemFocused]} accessibilityState={{ selected: focused }}>
      {icon ? <Icon name={icon} size={20} color={focused ? Colors.ink : 'rgba(242,239,231,0.65)'} /> : null}
      <Text numberOfLines={1} style={[tabStyles.label, focused && tabStyles.labelFocused]}>{label}</Text>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  item: { minWidth: 68, height: 54, paddingHorizontal: 10, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 2 },
  itemFocused: { backgroundColor: Colors.lime },
  label: { fontSize: 11, fontFamily: Font.semiBold, color: 'rgba(242,239,231,0.65)' },
  labelFocused: { color: Colors.ink, fontFamily: Font.bold },
});

type ButtonVariant = 'ink' | 'lime' | 'ghost' | 'ghostLight' | 'danger';

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
  ghostLight: { box: { backgroundColor: 'transparent', borderWidth: 1, borderColor: 'rgba(242,239,231,0.25)' }, text: { color: Colors.sand } },
  danger: { box: { backgroundColor: Colors.errorLight }, text: { color: Colors.error } },
};

const btn = StyleSheet.create({
  base: { minHeight: 52, borderRadius: 26, paddingHorizontal: 22, alignItems: 'center', justifyContent: 'center' },
  text: { fontSize: 16, fontFamily: Font.bold },
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
  text: { fontSize: 11, fontFamily: Font.monoBold, letterSpacing: 1 },
});

export const type = StyleSheet.create({
  eyebrow: { fontSize: 11, fontFamily: Font.mono, letterSpacing: 2, textTransform: 'uppercase' },
  display: { fontSize: 34, lineHeight: 36, fontFamily: Font.display, letterSpacing: -1.2, color: Colors.ink },
  title: { fontSize: 24, lineHeight: 28, fontFamily: Font.display, letterSpacing: -0.6, color: Colors.ink },
  heading: { fontSize: 18, lineHeight: 23, fontFamily: Font.bold, color: Colors.ink },
  body: { fontSize: 16, lineHeight: 23, fontFamily: Font.regular, color: Colors.stone },
  small: { fontSize: 13, lineHeight: 18, fontFamily: Font.regular, color: Colors.stone },
  accent: { fontFamily: Font.serifItalic, fontWeight: 'normal', fontStyle: 'normal' },
});

// Material Community Icons: the same Material family the websites use (Material Symbols)
export type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];
export function Icon({ name, size = 22, color = Colors.ink }: { name: IconName; size?: number; color?: string }) {
  return <MaterialCommunityIcons name={name} size={size} color={color} />;
}

// The Sthiva mark: a hexagon split by an S into two halves (docs/brand). `tile` draws it like the app icon:
// yellow tile in Sthiva, ink tile in Sthiva Partner. Without a tile: ink and yellow halves, white and yellow on dark.
export function SthivaMark({ size = 32, onDark = false, tile = false }: { size?: number; onDark?: boolean; tile?: boolean }) {
  const maskId = `sthiva-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const [left, right] = tile
    ? IS_WORK_APP ? [BRAND_COLORS.white, BRAND_COLORS.yellow] : [BRAND_COLORS.ink, BRAND_COLORS.white]
    : [onDark ? BRAND_COLORS.white : BRAND_COLORS.ink, BRAND_COLORS.yellow];
  const mark = (
    <Svg width={tile ? size * 0.76 : size} height={tile ? size * 0.76 : size} viewBox={MARK.viewBox}>
      <Defs>
        <Mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="1536" height="1536">
          <Polygon points={MARK.hex} fill="#fff" stroke="#fff" strokeWidth={MARK.cornerRound} strokeLinejoin="round" />
          <Path d={MARK.curve} fill="none" stroke="#000" strokeWidth={MARK.gap} />
        </Mask>
      </Defs>
      <G mask={`url(#${maskId})`}>
        <Rect x={0} y={0} width={1536} height={1536} fill={right} />
        <Path d={MARK.left} fill={left} />
      </G>
    </Svg>
  );
  if (!tile) return <View accessibilityElementsHidden importantForAccessibility="no">{mark}</View>;
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{ width: size, height: size, borderRadius: size * 0.23, backgroundColor: IS_WORK_APP ? BRAND_COLORS.ink : BRAND_COLORS.yellow, alignItems: 'center', justifyContent: 'center' }}
    >
      {mark}
    </View>
  );
}

type Tone = 'error' | 'success' | 'info' | 'warning';
const TONE: Record<Tone, { bg: string; fg: string; icon: IconName }> = {
  error: { bg: Colors.errorLight, fg: Colors.error, icon: 'alert-circle-outline' },
  success: { bg: Colors.successLight, fg: Colors.success, icon: 'check-circle-outline' },
  info: { bg: Colors.cobaltSoft, fg: Colors.cobalt, icon: 'information-outline' },
  warning: { bg: Colors.warningLight, fg: Colors.warning, icon: 'alert-outline' },
};

// In-screen message: used instead of pop-up alerts for errors and confirmations of success
export function Notice({ tone = 'info', title, children, onClose, style }: {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  onClose?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const t = TONE[tone];
  return (
    <View
      style={[notice.box, { backgroundColor: t.bg }, style]}
      accessibilityLiveRegion="polite"
      accessibilityRole={tone === 'error' ? 'alert' : undefined}
    >
      <Icon name={t.icon} size={20} color={t.fg} />
      <View style={notice.body}>
        {title ? <Text style={notice.title}>{title}</Text> : null}
        {typeof children === 'string' ? <Text style={notice.text}>{children}</Text> : children}
      </View>
      {onClose ? (
        <Pressable onPress={onClose} hitSlop={12} accessibilityRole="button" accessibilityLabel="Dismiss">
          <Icon name="close" size={18} color={Colors.stone} />
        </Pressable>
      ) : null}
    </View>
  );
}

const notice = StyleSheet.create({
  box: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, padding: 14, borderRadius: 16 },
  body: { flex: 1 },
  title: { fontSize: 15, lineHeight: 20, fontFamily: Font.bold, color: Colors.ink },
  text: { fontSize: 14, lineHeight: 20, fontFamily: Font.regular, color: Colors.ink },
});

// Bottom sheet for "are you sure?" moments: replaces the system confirm dialog
export function ConfirmSheet({
  visible,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Go back',
  danger,
  loading,
  onConfirm,
  onCancel,
  children,
}: {
  visible: boolean;
  title: string;
  body?: string;
  confirmLabel: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel} statusBarTranslucent>
      <Pressable style={sheet.scrim} onPress={loading ? undefined : onCancel} accessibilityLabel="Close" />
      <SafeAreaView edges={['bottom']} style={sheet.panel}>
        <View style={sheet.grabber} />
        <Text style={sheet.title}>{title}</Text>
        {body ? <Text style={[type.body, sheet.body]}>{body}</Text> : null}
        {children}
        <Button title={confirmLabel} variant={danger ? 'danger' : 'ink'} onPress={onConfirm} loading={loading} style={sheet.confirm} />
        <Button title={cancelLabel} variant="ghost" onPress={onCancel} disabled={loading} style={sheet.cancel} />
      </SafeAreaView>
    </Modal>
  );
}

const sheet = StyleSheet.create({
  scrim: { flex: 1, backgroundColor: 'rgba(11,12,10,0.45)' },
  panel: { backgroundColor: Colors.sand, borderTopLeftRadius: 28, borderTopRightRadius: 28, paddingHorizontal: 22, paddingTop: 10, paddingBottom: 16 },
  grabber: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: Colors.sand4, marginBottom: 16 },
  title: { fontSize: 22, lineHeight: 26, fontFamily: Font.display, letterSpacing: -0.5, color: Colors.ink },
  body: { marginTop: 8 },
  confirm: { marginTop: 22 },
  cancel: { marginTop: 10 },
  options: { marginTop: 18, gap: 8 },
  option: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 60, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 18, backgroundColor: Colors.sand2, borderWidth: 1, borderColor: Colors.sand4 },
  optionDanger: { backgroundColor: Colors.errorLight, borderColor: Colors.errorLight },
  optionPressed: { borderColor: Colors.ink },
  optionText: { flex: 1 },
  optionLabel: { fontFamily: Font.bold, fontSize: 16, color: Colors.ink },
  optionLabelDanger: { color: Colors.error },
  optionHint: { fontFamily: Font.regular, fontSize: 13, lineHeight: 18, color: Colors.stone, marginTop: 2 },
});

// Bottom sheet with several choices (replaces multi-button system alerts)
export function ChoiceSheet({ visible, title, body, options, cancelLabel = 'Go back', onCancel }: {
  visible: boolean;
  title: string;
  body?: string;
  options: { label: string; hint?: string; icon?: IconName; danger?: boolean; onPress: () => void }[];
  cancelLabel?: string;
  onCancel: () => void;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onCancel} statusBarTranslucent>
      <Pressable style={sheet.scrim} onPress={onCancel} accessibilityLabel="Close" />
      <SafeAreaView edges={['bottom']} style={sheet.panel}>
        <View style={sheet.grabber} />
        <Text style={sheet.title}>{title}</Text>
        {body ? <Text style={[type.body, sheet.body]}>{body}</Text> : null}
        <View style={sheet.options}>
          {options.map((o) => (
            <Pressable
              key={o.label}
              style={({ pressed }) => [sheet.option, o.danger && sheet.optionDanger, pressed && sheet.optionPressed]}
              onPress={o.onPress}
              accessibilityRole="button"
            >
              {o.icon ? <Icon name={o.icon} size={22} color={o.danger ? Colors.error : Colors.ink} /> : null}
              <View style={sheet.optionText}>
                <Text style={[sheet.optionLabel, o.danger && sheet.optionLabelDanger]}>{o.label}</Text>
                {o.hint ? <Text style={sheet.optionHint}>{o.hint}</Text> : null}
              </View>
              <Icon name="chevron-right" size={20} color={Colors.stone} />
            </Pressable>
          ))}
        </View>
        <Button title={cancelLabel} variant="ghost" onPress={onCancel} style={sheet.cancel} />
      </SafeAreaView>
    </Modal>
  );
}

// Empty lists and first-time screens
export function EmptyState({ icon, title, body, action, style }: {
  icon: IconName;
  title: string;
  body?: string;
  action?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[empty.box, style]}>
      <View style={empty.badge}><Icon name={icon} size={28} color={Colors.ink} /></View>
      <Text style={empty.title}>{title}</Text>
      {body ? <Text style={[type.body, empty.body]}>{body}</Text> : null}
      {action ? <View style={empty.action}>{action}</View> : null}
    </View>
  );
}

const empty = StyleSheet.create({
  box: { alignItems: 'center', paddingHorizontal: 28, paddingVertical: 40 },
  badge: { width: 64, height: 64, borderRadius: 32, backgroundColor: Colors.lime, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 16, fontSize: 20, lineHeight: 24, fontFamily: Font.display, color: Colors.ink, textAlign: 'center' },
  body: { marginTop: 6, textAlign: 'center' },
  action: { marginTop: 20, alignSelf: 'stretch' },
});

// Title row for pushed screens: round back button, eyebrow and title
export function ScreenHeader({ title, eyebrow, onBack, right }: {
  title: string;
  eyebrow?: string;
  onBack?: () => void;
  right?: ReactNode;
}) {
  return (
    <View style={header.row}>
      {onBack ? (
        <Pressable onPress={onBack} style={header.back} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back">
          <Icon name="arrow-left" size={22} />
        </Pressable>
      ) : null}
      <View style={header.text}>
        {eyebrow ? <Eyebrow>{eyebrow}</Eyebrow> : null}
        <Text style={header.title} numberOfLines={2}>{title}</Text>
      </View>
      {right}
    </View>
  );
}

const header = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12 },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.sand2, borderWidth: 1, borderColor: Colors.sand4, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1 },
  title: { fontSize: 24, lineHeight: 28, fontFamily: Font.display, letterSpacing: -0.6, color: Colors.ink },
});
