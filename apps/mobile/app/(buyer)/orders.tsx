import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../src/constants/colors';

export default function OrdersScreen() {
  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>My Orders</Text>
        <Text style={styles.empty}>No orders yet.{'\n'}Browse materials and place your first order!</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 24 },
  empty: { textAlign: 'center', color: Colors.textSecondary, lineHeight: 24, marginTop: 80, fontSize: 15 },
});
