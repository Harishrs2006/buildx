import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/auth.store';
import { Colors } from '../../src/constants/colors';

export default function SupplierHome() {
  const { user } = useAuthStore();

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.greeting}>Welcome back, {user?.name?.split(' ')[0]}</Text>
          <Text style={styles.sub}>Your supplier dashboard</Text>
        </View>

        {/* Verification banner */}
        <View style={styles.verifyBanner}>
          <Text style={styles.verifyEmoji}>⏳</Text>
          <View style={{ flex: 1 }}>
            <Text style={styles.verifyTitle}>Verification Pending</Text>
            <Text style={styles.verifySub}>Upload your Aadhaar and GST certificate to go live.</Text>
          </View>
          <TouchableOpacity style={styles.verifyBtn}>
            <Text style={styles.verifyBtnText}>Upload</Text>
          </TouchableOpacity>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          {[
            { label: 'Orders Today', value: '0', emoji: '📦' },
            { label: 'Total Revenue', value: '₹0', emoji: '💰' },
            { label: 'Active Products', value: '0', emoji: '🏭' },
          ].map((s) => (
            <View key={s.label} style={styles.statCard}>
              <Text style={styles.statEmoji}>{s.emoji}</Text>
              <Text style={styles.statValue}>{s.value}</Text>
              <Text style={styles.statLabel}>{s.label}</Text>
            </View>
          ))}
        </View>

        {/* Quick actions */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actions}>
          {[
            { label: 'Add Product', emoji: '➕', desc: 'List a new material' },
            { label: 'View Orders', emoji: '📋', desc: 'Check incoming orders' },
            { label: 'Update Stock', emoji: '📊', desc: 'Manage inventory' },
            { label: 'WhatsApp Orders', emoji: '💬', desc: 'Manage WhatsApp orders' },
          ].map((a) => (
            <TouchableOpacity key={a.label} style={styles.actionCard} activeOpacity={0.8}>
              <Text style={styles.actionEmoji}>{a.emoji}</Text>
              <Text style={styles.actionLabel}>{a.label}</Text>
              <Text style={styles.actionDesc}>{a.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16 },
  greeting: { fontSize: 22, fontWeight: '700', color: Colors.text },
  sub: { fontSize: 14, color: Colors.textSecondary, marginTop: 2 },
  verifyBanner: { marginHorizontal: 20, marginBottom: 20, flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: Colors.warningLight, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.warning },
  verifyEmoji: { fontSize: 24 },
  verifyTitle: { fontSize: 13, fontWeight: '700', color: Colors.text },
  verifySub: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  verifyBtn: { backgroundColor: Colors.warning, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  verifyBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  statsRow: { flexDirection: 'row', paddingHorizontal: 20, gap: 10, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 14, alignItems: 'center' },
  statEmoji: { fontSize: 20, marginBottom: 6 },
  statValue: { fontSize: 18, fontWeight: '800', color: Colors.text },
  statLabel: { fontSize: 11, color: Colors.textSecondary, textAlign: 'center', marginTop: 2 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginHorizontal: 20, marginBottom: 12 },
  actions: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10, paddingBottom: 32 },
  actionCard: { width: '47%', backgroundColor: Colors.surfaceAlt, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 16 },
  actionEmoji: { fontSize: 26, marginBottom: 8 },
  actionLabel: { fontSize: 13, fontWeight: '700', color: Colors.text },
  actionDesc: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
});
