import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Colors } from '../../src/constants/colors';

export default function OrderSuccessScreen() {
  const { orderNumber } = useLocalSearchParams<{ orderNumber: string }>();
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.icon}>✅</Text>
        <Text style={styles.title}>Order Placed!</Text>
        <Text style={styles.orderNum}>{orderNumber}</Text>
        <Text style={styles.sub}>
          Your order is confirmed. Pay in cash when the materials arrive at your site.
          The supplier will contact you before dispatch.
        </Text>

        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={() => router.replace('/(buyer)/orders' as never)}
        >
          <Text style={styles.primaryBtnText}>Track My Order</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.secondaryBtn}
          onPress={() => router.replace('/(buyer)/home' as never)}
        >
          <Text style={styles.secondaryBtnText}>Back to Home</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  icon: { fontSize: 72, marginBottom: 20 },
  title: { fontSize: 28, fontWeight: '800', color: Colors.text, marginBottom: 10 },
  orderNum: {
    fontSize: 14, fontWeight: '700', color: Colors.primary,
    backgroundColor: Colors.primaryLight, paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 20, marginBottom: 20,
  },
  sub: {
    fontSize: 15, color: Colors.textSecondary, textAlign: 'center',
    lineHeight: 22, marginBottom: 36,
  },
  primaryBtn: {
    width: '100%', backgroundColor: Colors.primary,
    borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginBottom: 12,
  },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  secondaryBtn: {
    width: '100%', borderWidth: 1.5, borderColor: Colors.border,
    borderRadius: 14, paddingVertical: 15, alignItems: 'center',
  },
  secondaryBtnText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 15 },
});
