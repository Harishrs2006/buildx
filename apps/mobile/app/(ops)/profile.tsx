import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signOutEverywhere } from '../../src/lib/googleAuth';
import { useAuthStore } from '../../src/store/auth.store';
import { Colors } from '../../src/constants/colors';
import { Font } from '../../src/constants/typography';

export default function OpsProfileScreen() {
  const { user, clear } = useAuthStore();

  function signOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => { await signOutEverywhere(); clear(); } },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.title}>Profile</Text>
        <View style={styles.card}>
          <Text style={styles.name}>{user?.name}</Text>
          <Text style={styles.phone}>{user?.phone ?? user?.email}</Text>
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
  title: { fontFamily: Font.displayBold, fontSize: 22, color: Colors.text },
  card: { backgroundColor: Colors.surface, borderRadius: 14, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 4 },
  name: { fontFamily: Font.bold, fontSize: 17, color: Colors.text },
  phone: { fontFamily: Font.regular, fontSize: 14, color: Colors.textSecondary },
  role: { fontFamily: Font.bold, fontSize: 11, color: Colors.primary, letterSpacing: 1, marginTop: 4 },
  hint: { fontFamily: Font.regular, fontSize: 12, color: Colors.textSecondary, lineHeight: 18 },
  signOut: { borderWidth: 1.5, borderColor: Colors.error, borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  signOutText: { fontFamily: Font.bold, color: Colors.error, fontSize: 15 },
});
