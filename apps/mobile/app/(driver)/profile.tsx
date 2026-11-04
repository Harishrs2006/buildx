import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { signOutEverywhere } from '../../src/lib/googleAuth';
import { useAuthStore } from '../../src/store/auth.store';
import { Colors } from '../../src/constants/colors';
import { Font } from '../../src/constants/typography';
import { useDriverProfile, useDriverStats, useUpdateDriverProfile, VEHICLE_LABELS, VEHICLE_ICONS } from '../../src/hooks/useDelivery';

export default function DriverProfileScreen() {
  const { user, clear } = useAuthStore();
  const { data: profileData, isLoading } = useDriverProfile();
  const { data: statsData } = useDriverStats();
  const { mutate: updateProfile } = useUpdateDriverProfile();

  const profile = profileData?.data;
  const stats = statsData?.data;

  async function signOut() {
    Alert.alert('Sign out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign out', style: 'destructive', onPress: async () => { await signOutEverywhere(); clear(); } },
    ]);
  }

  function toggleAvailability(value: boolean) {
    updateProfile({ isAvailable: value });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        <Text style={styles.title}>Profile</Text>

        {/* User card */}
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase()}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.name}>{user?.name}</Text>
            <Text style={styles.phone}>{user?.phone ?? user?.email}</Text>
            <View style={styles.roleBadge}>
              <Text style={styles.roleText}>DELIVERY PARTNER</Text>
            </View>
          </View>
        </View>

        {isLoading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: 24 }} />
        ) : profile ? (
          <>
            {/* Availability toggle */}
            <View style={styles.toggleCard}>
              <View>
                <Text style={styles.toggleTitle}>{stats?.isAvailable ? 'You are Online' : 'You are Offline'}</Text>
                <Text style={styles.toggleSub}>
                  {stats?.isAvailable ? 'New pickups will appear in Available tab' : 'Toggle on to start receiving orders'}
                </Text>
              </View>
              <Switch
                value={stats?.isAvailable ?? false}
                onValueChange={toggleAvailability}
                trackColor={{ false: Colors.border, true: Colors.success }}
                thumbColor="#fff"
              />
            </View>

            {/* Stats */}
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{stats?.totalDeliveries ?? 0}</Text>
                <Text style={styles.statLbl}>Deliveries</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{stats?.todayDeliveries ?? 0}</Text>
                <Text style={styles.statLbl}>Today</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statNum}>{(stats?.avgRating ?? 0).toFixed(1)}</Text>
                <Text style={styles.statLbl}>Rating</Text>
              </View>
            </View>

            {/* Vehicle info */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vehicle Details</Text>
              <View style={styles.infoCard}>
                <View style={styles.vehicleRow}>
                  <Text style={styles.vehicleIcon}>{VEHICLE_ICONS[profile.vehicleType] ?? '🚗'}</Text>
                  <View>
                    <Text style={styles.vehicleType}>{VEHICLE_LABELS[profile.vehicleType] ?? profile.vehicleType}</Text>
                    <Text style={styles.vehicleNumber}>{profile.vehicleNumber}</Text>
                  </View>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>License No.</Text>
                  <Text style={styles.infoValue}>{profile.licenseNumber}</Text>
                </View>
              </View>
            </View>

            {/* Service areas */}
            {profile.serviceAreas.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Service Areas</Text>
                <View style={styles.tags}>
                  {profile.serviceAreas.map((area) => (
                    <View key={area} style={styles.tag}>
                      <Text style={styles.tagText}>{area}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </>
        ) : null}

        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  container: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 40 },
  title: { fontFamily: Font.displayBold, fontSize: 22, color: Colors.text, marginBottom: 20 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 16, padding: 16, backgroundColor: Colors.surfaceAlt, borderRadius: 14, borderWidth: 1, borderColor: Colors.border, marginBottom: 16 },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: Font.displayBold, fontSize: 22, color: '#fff' },
  name: { fontFamily: Font.bold, fontSize: 16, color: Colors.text },
  phone: { fontFamily: Font.regular, fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  roleBadge: { marginTop: 6, alignSelf: 'flex-start', backgroundColor: Colors.infoLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  roleText: { fontFamily: Font.bold, fontSize: 10, color: Colors.info },
  toggleCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: Colors.border, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, elevation: 2 },
  toggleTitle: { fontFamily: Font.bold, fontSize: 15, color: Colors.text },
  toggleSub: { fontFamily: Font.regular, fontSize: 12, color: Colors.textSecondary, marginTop: 2, maxWidth: 220 },
  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },
  statBox: { flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 14, alignItems: 'center', borderWidth: 1, borderColor: Colors.border },
  statNum: { fontFamily: Font.display, fontSize: 22, color: Colors.text },
  statLbl: { fontFamily: Font.regular, fontSize: 11, color: Colors.textSecondary, marginTop: 2 },
  section: { marginBottom: 20 },
  sectionTitle: { fontFamily: Font.bold, fontSize: 15, color: Colors.text, marginBottom: 10 },
  infoCard: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: Colors.border, overflow: 'hidden' },
  vehicleRow: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderBottomWidth: 1, borderBottomColor: Colors.border },
  vehicleIcon: { fontFamily: Font.regular, fontSize: 32 },
  vehicleType: { fontFamily: Font.bold, fontSize: 15, color: Colors.text },
  vehicleNumber: { fontFamily: Font.regular, fontSize: 13, color: Colors.textSecondary, marginTop: 2 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 14, paddingVertical: 12 },
  infoLabel: { fontFamily: Font.regular, fontSize: 13, color: Colors.textSecondary },
  infoValue: { fontFamily: Font.semiBold, fontSize: 13, color: Colors.text },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: Colors.surfaceAlt, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1, borderColor: Colors.border },
  tagText: { fontFamily: Font.regular, fontSize: 12, color: Colors.text },
  signOutBtn: { borderWidth: 1.5, borderColor: Colors.error, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 8 },
  signOutText: { fontFamily: Font.bold, color: Colors.error, fontSize: 15 },
});
