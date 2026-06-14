import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import auth from '@react-native-firebase/auth';
import { useAuthStore } from '../../src/store/auth.store';
import { Colors } from '../../src/constants/colors';
import { useSupplierProfile } from '../../src/hooks/useSupplier';

export default function SupplierProfileScreen() {
  const { user, clear } = useAuthStore();
  const { data: profileData, isLoading } = useSupplierProfile();
  const profile = profileData?.data;

  async function signOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => { await auth().signOut(); clear(); } },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        <Text style={styles.title}>Profile</Text>

        {/* User card */}
        <View style={styles.card}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.name}</Text>
            <Text style={styles.phone}>{user?.phone}</Text>
            <View style={styles.roleBadge}><Text style={styles.roleText}>SUPPLIER</Text></View>
          </View>
        </View>

        {/* Business info */}
        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: 24 }} />
        ) : profile ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Business Details</Text>
            <View style={styles.infoCard}>
              <InfoRow label="Business Name" value={profile.businessName} />
              <InfoRow label="WhatsApp" value={profile.whatsappNumber} />
              <InfoRow label="Delivery Radius" value={`${profile.deliveryRadiusKm} km`} />
              <InfoRow label="Verification" value={profile.verificationStatus} last />
            </View>

            {profile.serviceAreas.length > 0 && (
              <View style={styles.tagsContainer}>
                <Text style={styles.tagsLabel}>Service Areas</Text>
                <View style={styles.tags}>
                  {profile.serviceAreas.map((area) => (
                    <View key={area} style={styles.tag}><Text style={styles.tagText}>{area}</Text></View>
                  ))}
                </View>
              </View>
            )}

            {profile.categories.length > 0 && (
              <View style={styles.tagsContainer}>
                <Text style={styles.tagsLabel}>Categories</Text>
                <View style={styles.tags}>
                  {profile.categories.map((cat) => (
                    <View key={cat} style={styles.tag}><Text style={styles.tagText}>{cat}</Text></View>
                  ))}
                </View>
              </View>
            )}

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{profile.avgRating.toFixed(1)}</Text>
                <Text style={styles.statLbl}>Rating</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{profile.totalReviews}</Text>
                <Text style={styles.statLbl}>Reviews</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{profile.totalDeliveries}</Text>
                <Text style={styles.statLbl}>Deliveries</Text>
              </View>
            </View>
          </View>
        ) : null}

        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function InfoRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <View style={[styles.infoRow, !last && styles.infoRowBorder]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  container: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 20 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, backgroundColor: Colors.surfaceAlt, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 24 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontWeight: '700', color: '#fff' },
  name: { fontSize: 16, fontWeight: '700', color: Colors.text },
  phone: { fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  roleBadge: { marginTop: 6, alignSelf: 'flex-start', backgroundColor: '#FFF7ED', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  roleText: { fontSize: 11, fontWeight: '700', color: Colors.primary },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  infoCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: Colors.border, marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
  infoRowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.border },
  infoLabel: { fontSize: 13, color: Colors.textSecondary },
  infoValue: { fontSize: 13, fontWeight: '600', color: Colors.text },
  tagsContainer: { marginBottom: 16 },
  tagsLabel: { fontSize: 13, color: Colors.textSecondary, marginBottom: 8 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: Colors.surfaceAlt, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: Colors.border },
  tagText: { fontSize: 12, color: Colors.text },
  statsRow: { flexDirection: 'row', gap: 10 },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  statNum: { fontSize: 20, fontWeight: '800', color: Colors.text },
  statLbl: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  signOutBtn: { borderWidth: 1.5, borderColor: Colors.error, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  signOutText: { color: Colors.error, fontWeight: '700', fontSize: 15 },
});
