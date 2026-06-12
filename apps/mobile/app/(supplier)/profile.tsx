import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import { useAuthStore } from '../../src/store/auth.store';
import { Colors } from '../../src/constants/colors';

export default function SupplierProfileScreen() {
  const { user, clear } = useAuthStore();

  async function signOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => { await auth().signOut(); clear(); } },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Profile</Text>

        <View style={styles.card}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.name}</Text>
            <Text style={styles.phone}>{user?.phone}</Text>
            <View style={styles.roleBadge}><Text style={styles.roleText}>SUPPLIER</Text></View>
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity style={styles.row}><Text style={styles.rowLabel}>📄  KYC Documents</Text><Text style={styles.rowArrow}>›</Text></TouchableOpacity>
          <TouchableOpacity style={styles.row}><Text style={styles.rowLabel}>🏦  Bank Account</Text><Text style={styles.rowArrow}>›</Text></TouchableOpacity>
          <TouchableOpacity style={styles.row}><Text style={styles.rowLabel}>📍  Service Areas</Text><Text style={styles.rowArrow}>›</Text></TouchableOpacity>
          <TouchableOpacity style={styles.row}><Text style={styles.rowLabel}>⭐  Reviews</Text><Text style={styles.rowArrow}>›</Text></TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  container: { flex: 1, paddingHorizontal: 20, paddingTop: 24 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 20 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, backgroundColor: Colors.surfaceAlt, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 24 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontWeight: '700', color: '#fff' },
  name: { fontSize: 16, fontWeight: '700', color: Colors.text },
  phone: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  roleBadge: { marginTop: 6, alignSelf: 'flex-start', backgroundColor: '#FFF7ED', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  roleText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  section: { marginBottom: 24 },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  rowLabel: { fontSize: 15, color: Colors.text },
  rowArrow: { fontSize: 18, color: Colors.textMuted },
  signOutBtn: { marginTop: 'auto', borderWidth: 1.5, borderColor: Colors.error, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  signOutText: { color: Colors.error, fontWeight: '700', fontSize: 15 },
});
