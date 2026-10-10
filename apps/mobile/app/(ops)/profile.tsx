import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import { useAuthStore } from '../../src/store/auth.store';
import { Colors } from '../../src/constants/colors';

export default function OpsProfileScreen() {
  const { user, clear } = useAuthStore();

  function signOut() {
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
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.phone}>{user?.phone}</Text>
          <Text style={styles.role}>{user?.role === 'ADMIN' ? 'ADMIN' : 'OPERATIONS'}</Text>
        </View>
        <Text style={styles.hint}>
          Account suspension is admin-only and available through the ops API. Every action you take here is saved on the order with your name.
        </Text>
        <TouchableOpacity style={styles.signOut} onPress={signOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surfaceAlt },
  container: { padding: 20, gap: 16 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text },
  card: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 4 },
  name: { fontSize: 17, fontWeight: '700', color: Colors.text },
  phone: { fontSize: 14, color: Colors.textSecondary },
  role: { fontSize: 11, fontWeight: '700', color: Colors.primary, letterSpacing: 1, marginTop: 4 },
  hint: { fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  signOut: { borderWidth: 1.5, borderColor: Colors.error, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  signOutText: { color: Colors.error, fontWeight: '700', fontSize: 15 },
});
