import { StyleSheet, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../src/store/auth.store';
import { Colors } from '../../src/constants/colors';
import { Notice, type } from '../../src/components/ui';
import { ProfileHeader, SignOutFooter } from '../../src/components/Profile';

export default function OpsProfileScreen() {
  const role = useAuthStore((s) => s.user?.role);

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={[type.title, styles.title]}>Profile</Text>
        <ProfileHeader roleLabel={role === 'ADMIN' ? 'ADMIN' : 'OPERATIONS'} />
        <Notice tone="info" style={styles.notice}>
          Every action you take here is saved on the order with your name. Suspending accounts is admin-only and done from the ops console.
        </Notice>
        <SignOutFooter />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.sand },
  container: { padding: 20, paddingBottom: 32 },
  title: { marginBottom: 14 },
  notice: { marginTop: 14 },
});
