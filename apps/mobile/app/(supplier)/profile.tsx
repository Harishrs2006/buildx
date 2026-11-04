import { StyleSheet, ScrollView, Text, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../src/constants/colors';
import { useSupplierProfile } from '../../src/hooks/useSupplier';
import { type } from '../../src/components/ui';
import { InfoRow, ProfileHeader, Section, SignOutFooter, StatTiles, Tags } from '../../src/components/Profile';

const VERIFICATION: Record<string, string> = { VERIFIED: 'Verified', PENDING: 'Waiting for review', REJECTED: 'Not approved' };

export default function SupplierProfileScreen() {
  const { data: profileData, isLoading } = useSupplierProfile();
  const profile = profileData?.data;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.container}>
        <Text style={[type.title, styles.title]}>Profile</Text>
        <ProfileHeader roleLabel="SUPPLIER" />

        {isLoading ? (
          <ActivityIndicator color={Colors.ink} style={styles.loading} />
        ) : profile ? (
          <>
            <StatTiles
              items={[
                { label: 'Rating', value: profile.avgRating ? profile.avgRating.toFixed(1) : 'None' },
                { label: 'Reviews', value: profile.totalReviews },
                { label: 'Deliveries', value: profile.totalDeliveries },
              ]}
            />
            <Section title="Business">
              <InfoRow label="Business name" value={profile.businessName} />
              <InfoRow label="WhatsApp" value={profile.whatsappNumber} />
              <InfoRow label="Delivery radius" value={profile.deliveryRadiusKm ? `${profile.deliveryRadiusKm} km` : undefined} />
              <InfoRow label="Verification" value={VERIFICATION[profile.verificationStatus] ?? profile.verificationStatus} last />
            </Section>
            {profile.serviceAreas.length > 0 ? (
              <Section title="Service areas">
                <Tags items={profile.serviceAreas} />
              </Section>
            ) : null}
            {profile.categories.length > 0 ? (
              <Section title="Categories">
                <Tags items={profile.categories} />
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
  container: { padding: 20, paddingBottom: 32 },
  title: { marginBottom: 14 },
  loading: { marginVertical: 24 },
});
