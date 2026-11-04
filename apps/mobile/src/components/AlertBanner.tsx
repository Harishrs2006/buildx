import { useEffect } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Colors } from '../constants/colors';
import { Font } from '../constants/typography';
import { useInAppAlert } from '../hooks/usePushNotifications';
import { Icon } from './ui';

/** Shows a notification that arrives while the app is open (for example a new order for a supplier). */
export function AlertBanner() {
  const { alert, dismiss } = useInAppAlert();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(dismiss, 8000);
    return () => clearTimeout(t);
  }, [alert?.id]);

  if (!alert) return null;

  function open() {
    dismiss();
    if (alert?.path) router.push(alert.path as any);
  }

  return (
    <View pointerEvents="box-none" style={[styles.wrap, { top: insets.top + 8 }]}>
      <Pressable onPress={open} style={styles.card} accessibilityRole="button" accessibilityLiveRegion="assertive">
        <View style={styles.icon}><Icon name="bell-ring-outline" size={20} color={Colors.ink} /></View>
        <View style={styles.flex}>
          <Text style={styles.title} numberOfLines={1}>{alert.title}</Text>
          {alert.body ? <Text style={styles.body} numberOfLines={2}>{alert.body}</Text> : null}
        </View>
        <Pressable onPress={dismiss} hitSlop={12} accessibilityRole="button" accessibilityLabel="Dismiss">
          <Icon name="close" size={20} color={Colors.sand} />
        </Pressable>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 12, right: 12, zIndex: 100, elevation: 20 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 18, backgroundColor: Colors.ink },
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.lime, alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  title: { fontFamily: Font.bold, fontSize: 15, color: Colors.sand },
  body: { fontFamily: Font.regular, fontSize: 13, lineHeight: 18, color: 'rgba(242,239,231,0.75)', marginTop: 2 },
});
