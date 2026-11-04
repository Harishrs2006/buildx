import { View, Text, TouchableOpacity, StyleSheet, Alert, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { signOutEverywhere } from '../../src/lib/googleAuth';
import { useAuthStore } from '../../src/store/auth.store';
import { useOrders } from '../../src/hooks/useOrders';
import { Colors } from '../../src/constants/colors';
import { Font } from '../../src/constants/typography';

export default function ProfileScreen() {
  const { user, clear } = useAuthStore();
  const router = useRouter();
  const { data } = useOrders();
  const orders = data?.data ?? [];
  const delivered = orders.filter((o) => o.status === 'DELIVERED').length;
  const pending = orders.filter((o) => !['DELIVERED', 'CANCELLED'].includes(o.status)).length;

  async function signOut() {
    Alert.alert('Sign out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOutEverywhere();
          clear();
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.title}>My Profile</Text>

        {/* Avatar card */}
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={styles.info}>
            <Text style={styles.name}>{user?.name}</Text>
            <Text style={styles.phone}>{user?.phone ?? user?.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>BUYER</Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statNum}>{orders.length}</Text>
            <Text style={styles.statLabel}>Total Orders</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: Colors.success }]}>{delivered}</Text>
            <Text style={styles.statLabel}>Delivered</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={[styles.statNum, { color: Colors.warning }]}>{pending}</Text>
            <Text style={styles.statLabel}>In Progress</Text>
          </View>
        </View>

        {/* Quick actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <TouchableOpacity style={styles.row} onPress={() => router.push('/(buyer)/orders' as never)}>
            <Text style={styles.rowLabel}>📦  My Orders</Text>
            <Text style={styles.rowArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={() => router.push('/(buyer)/cart' as never)}>
            <Text style={styles.rowLabel}>🛒  My Cart</Text>
            <Text style={styles.rowArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row} onPress={() => router.push('/(buyer)/ai-chat' as never)}>
            <Text style={styles.rowLabel}>🤖  AI Materials Assistant</Text>
            <Text style={styles.rowArrow}>›</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <TouchableOpacity style={styles.row}>
            <Text style={styles.rowLabel}>📍  Saved Addresses</Text>
            <Text style={styles.rowArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row}>
            <Text style={styles.rowLabel}>🔔  Notifications</Text>
            <Text style={styles.rowArrow}>›</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.row}>
            <Text style={styles.rowLabel}>🌐  Language</Text>
            <Text style={styles.rowArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {/* About */}
        <View style={styles.aboutBox}>
          <Text style={styles.aboutTitle}>BuildX</Text>
          <Text style={styles.aboutSub}>B2B Construction Marketplace{'\n'}Tumakuru, Karnataka</Text>
          <Text style={styles.version}>v1.0.0</Text>
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  container: { paddingHorizontal: 20, paddingTop: 24 },
  title: { fontFamily: Font.displayBold, fontSize: 22, color: Colors.text, marginBottom: 20 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, backgroundColor: Colors.surfaceAlt, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 20 },
  avatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: Font.displayBold, fontSize: 24, color: '#fff' },
  info: { flex: 1 },
  name: { fontFamily: Font.bold, fontSize: 16, color: Colors.text },
  phone: { fontFamily: Font.regular, fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  roleBadge: { marginTop: 6, alignSelf: 'flex-start', backgroundColor: Colors.primaryLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  roleText: { fontFamily: Font.bold, fontSize: 11, color: Colors.primary },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: Colors.surfaceAlt, borderRadius: 12, borderWidth: 1, borderColor: Colors.border, padding: 14, alignItems: 'center' },
  statNum: { fontFamily: Font.display, fontSize: 22, color: Colors.text },
  statLabel: { fontFamily: Font.regular, fontSize: 11, color: Colors.textMuted, marginTop: 4 },
  section: { marginBottom: 24 },
  sectionTitle: { fontFamily: Font.bold, fontSize: 12, color: Colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowLabel: { fontFamily: Font.regular, fontSize: 15, color: Colors.text },
  rowArrow: { fontFamily: Font.regular, fontSize: 18, color: Colors.textMuted },
  aboutBox: { backgroundColor: Colors.surfaceAlt, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, padding: 16, alignItems: 'center', marginBottom: 24 },
  aboutTitle: { fontFamily: Font.bold, fontSize: 18, color: Colors.primary },
  aboutSub: { fontFamily: Font.regular, fontSize: 12, color: Colors.textSecondary, textAlign: 'center', marginTop: 4, lineHeight: 18 },
  version: { fontFamily: Font.regular, fontSize: 11, color: Colors.textMuted, marginTop: 8 },
  signOutBtn: { borderWidth: 1.5, borderColor: Colors.error, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  signOutText: { fontFamily: Font.bold, color: Colors.error, fontSize: 15 },
});
