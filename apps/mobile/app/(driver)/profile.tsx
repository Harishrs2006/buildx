import { View, Text, StyleSheet, ScrollView, Switch, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../src/constants/colors';
import { Font } from '../../src/constants/typography';
import { useDriverProfile, useDriverStats, useUpdateDriverProfile, VEHICLE_LABELS, VEHICLE_ICONS } from '../../src/hooks/useDelivery';
import { Icon, Notice, type } from '../../src/components/ui';
import { InfoRow, ProfileHeader, Section, SignOutFooter, StatTiles, Tags } from '../../src/components/Profile';

export default function DriverProfileScreen() {
  const { data: profileData, isLoading } = useDriverProfile();
  const { data: statsData } = useDriverStats();
  const { mutate: updateProfile, isPending, isError } = useUpdateDriverProfile();
  const profile = profileData?.data;
  const stats = statsData?.data;
  const online = stats?.isAvailable ?? false;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        <Text style={[type.title, styles.title]}>Profile</Text>
        <ProfileHeader roleLabel="DRIVER" />

        {isLoading ? (
          <ActivityIndicator color={Colors.ink} style={styles.loading} />
        ) : profile ? (
          <>
            <View style={[styles.toggle, online && styles.toggleOn]}>
              <View style={[styles.dot, online && styles.dotOn]} />
              <View style={styles.flex}>
                <Text style={styles.toggleTitle}>{online ? 'You are online' : 'You are offline'}</Text>
                <Text style={styles.toggleSub}>
                  {online ? 'New pickups show up in Available.' : 'Go online to get new pickups.'}
                </Text>
              </View>
              <Switch
                value={online}
                onValueChange={(value) => updateProfile({ isAvailable: value })}
                disabled={isPending}
                trackColor={{ false: Colors.sand4, true: Colors.ink }}
                thumbColor={online ? Colors.lime : Colors.sand2}
                accessibilityLabel="Available for pickups"
              />
            </View>
            {isError ? <Notice tone="error" style={styles.notice}>We could not change your status. Try again.</Notice> : null}

            <StatTiles
              items={[
                { label: 'Deliveries', value: stats?.totalDeliveries ?? 0 },
                { label: 'Today', value: stats?.todayDeliveries ?? 0 },
                { label: 'Rating', value: stats?.avgRating ? stats.avgRating.toFixed(1) : 'None' },
              ]}
            />

            <Section title="Vehicle">
              <View style={styles.vehicle}>
                <View style={styles.vehicleIcon}><Icon name={VEHICLE_ICONS[profile.vehicleType] ?? 'car'} size={26} /></View>
                <View>
                  <Text style={styles.vehicleType}>{VEHICLE_LABELS[profile.vehicleType] ?? profile.vehicleType}</Text>
                  <Text style={styles.vehicleNumber}>{profile.vehicleNumber}</Text>
                </View>
              </View>
              <InfoRow label="Licence number" value={profile.licenseNumber} last />
            </Section>

            {profile.serviceAreas.length > 0 ? (
              <Section title="Service areas">
                <Tags items={profile.serviceAreas} />
              </Section>
            ) : null}
          </>
        ) : null}

        <SignOutFooter />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.sand },
  flex: { flex: 1 },
  container: { padding: 20, paddingBottom: 32 },
  title: { marginBottom: 14 },
  loading: { marginVertical: 24 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 12, padding: 16, borderRadius: 18, backgroundColor: Colors.sand2, borderWidth: 1, borderColor: Colors.sand4 },
  toggleOn: { backgroundColor: Colors.limeSoft, borderColor: Colors.lime },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: Colors.stoneLight },
  dotOn: { backgroundColor: Colors.success },
  toggleTitle: { fontFamily: Font.bold, fontSize: 16, color: Colors.ink },
  toggleSub: { fontFamily: Font.regular, fontSize: 13, color: Colors.stone, marginTop: 2 },
  notice: { marginTop: 10 },
  vehicle: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.sand4 },
  vehicleIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.lime, alignItems: 'center', justifyContent: 'center' },
  vehicleType: { fontFamily: Font.bold, fontSize: 16, color: Colors.ink },
  vehicleNumber: { fontFamily: Font.monoBold, fontSize: 14, letterSpacing: 1, color: Colors.stone, marginTop: 2 },
});
