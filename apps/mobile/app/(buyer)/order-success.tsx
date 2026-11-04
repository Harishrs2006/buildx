import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { Font } from '../../src/constants/typography';
import { Button, Eyebrow, Icon } from '../../src/components/ui';

export default function OrderSuccessScreen() {
  const { orderNumber } = useLocalSearchParams<{ orderNumber: string }>();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <View style={styles.badge}><Icon name="check-bold" size={40} color={Colors.ink} /></View>
        <Eyebrow color={Colors.lime}>Order {orderNumber}</Eyebrow>
        <Text style={styles.title}>
          Order placed.{'\n'}
          <Text style={styles.accent}>Now we build.</Text>
        </Text>
        <Text style={styles.sub}>
          The supplier has your order. Pay in cash when the materials reach the site. You can follow every step in Orders.
        </Text>
      </View>
      <View style={styles.actions}>
        <Button title="Track my order" variant="lime" onPress={() => router.replace('/(buyer)/orders' as never)} />
        <Button title="Back to home" variant="ghostLight" onPress={() => router.replace('/(buyer)/home' as never)} style={styles.secondary} />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.ink },
  container: { flex: 1, justifyContent: 'center', paddingHorizontal: 28 },
  badge: { width: 76, height: 76, borderRadius: 38, backgroundColor: Colors.lime, alignItems: 'center', justifyContent: 'center', marginBottom: 28 },
  title: { fontFamily: Font.display, fontSize: 40, lineHeight: 42, letterSpacing: -1.5, color: Colors.sand, marginTop: 10 },
  accent: { fontFamily: Font.serifItalic, color: Colors.lime },
  sub: { fontFamily: Font.regular, fontSize: 16, lineHeight: 24, color: 'rgba(242,239,231,0.72)', marginTop: 16 },
  actions: { paddingHorizontal: 20, paddingBottom: 20 },
  secondary: { marginTop: 10 },
});
