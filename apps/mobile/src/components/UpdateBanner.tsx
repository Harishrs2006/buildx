import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Updates from 'expo-updates';
import { Colors } from '../constants/colors';
import { Font } from '../constants/typography';
import { Icon } from './ui';

/**
 * A new over-the-air version has downloaded in the background. It is used automatically on the next start;
 * this lets the person switch now with one tap.
 */
export function UpdateBanner() {
  const { isUpdatePending } = Updates.useUpdates();
  const insets = useSafeAreaInsets();
  if (!Updates.isEnabled || !isUpdatePending) return null;
  return (
    <View pointerEvents="box-none" style={[styles.wrap, { bottom: insets.bottom + 84 }]}>
      <Pressable
        onPress={() => Updates.reloadAsync().catch(() => {})}
        style={styles.card}
        accessibilityRole="button"
        accessibilityLabel="A new version of the app is ready. Tap to restart and use it."
      >
        <Icon name="update" size={20} color={Colors.ink} />
        <Text style={styles.text}>A new version is ready. Tap to restart.</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 16, right: 16, alignItems: 'center', zIndex: 90, elevation: 18 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, borderRadius: 999, backgroundColor: Colors.lime },
  text: { fontFamily: Font.bold, fontSize: 14, color: Colors.ink },
});
