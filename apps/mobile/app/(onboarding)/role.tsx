import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../../src/lib/api';
import { useAuthStore } from '../../src/store/auth.store';
import { signOutEverywhere } from '../../src/lib/googleAuth';
import { Colors } from '../../src/constants/colors';
import { Font } from '../../src/constants/typography';
import { VEHICLE_ICONS, VEHICLE_LABELS } from '../../src/hooks/useDelivery';
import { IS_PARTNER } from '../../src/lib/appVariant';
import { BuildXMark, Button, Eyebrow, Icon, Notice, type IconName } from '../../src/components/ui';

type Role = 'BUYER' | 'SUPPLIER' | 'DELIVERY_PARTNER';

const ALL_ROLES: { r: Role; icon: IconName; title: string; desc: string }[] = [
  { r: 'BUYER', icon: 'hard-hat', title: 'I buy materials', desc: 'Contractors, builders and site owners' },
  { r: 'SUPPLIER', icon: 'storefront-outline', title: 'I sell materials', desc: 'Dealers, traders and equipment owners' },
  { r: 'DELIVERY_PARTNER', icon: 'truck-outline', title: 'I deliver orders', desc: 'Drivers with their own vehicle' },
];
// BuildX (buyer app) creates buyer accounts; BuildX Partner creates supplier and delivery partner accounts
const ROLES = ALL_ROLES.filter(({ r }) => (IS_PARTNER ? r !== 'BUYER' : r === 'BUYER'));
const VEHICLES = ['BIKE', 'AUTO', 'MINI_TRUCK', 'TEMPO', 'TRUCK', 'TRACTOR'];

export default function RoleScreen() {
  const { syncWithBackend, user, clear } = useAuthStore();
  const [role, setRole] = useState<Role | null>(ROLES.length === 1 ? ROLES[0].r : null);
  const [name, setName] = useState(user?.name ?? '');
  const [businessName, setBusinessName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [vehicleType, setVehicleType] = useState('TEMPO');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const whatsappOk = /^[6-9]\d{9}$/.test(whatsapp.replace(/\s/g, ''));
  const canContinue = !!role && !!name.trim() && (
    role === 'BUYER' ||
    (role === 'SUPPLIER' && !!businessName.trim() && whatsappOk) ||
    (role === 'DELIVERY_PARTNER' && !!vehicleType && !!vehicleNumber.trim() && !!licenseNumber.trim())
  );

  async function handleContinue() {
    if (!role || !canContinue) return;
    setError(null);
    setLoading(true);
    try {
      await api.post('/auth/onboard', {
        name: name.trim(),
        role,
        ...(role === 'SUPPLIER' && {
          businessName: businessName.trim(),
          whatsappNumber: whatsapp.replace(/\s/g, ''),
        }),
        ...(role === 'DELIVERY_PARTNER' && {
          vehicleType,
          vehicleNumber: vehicleNumber.trim().toUpperCase(),
          licenseNumber: licenseNumber.trim().toUpperCase(),
        }),
      });
      await syncWithBackend();
      // AuthGate in _layout.tsx sends the account to its home screen
    } catch (err: any) {
      setError(err?.message ?? 'We could not save your details. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <BuildXMark size={40} />
          <Eyebrow>Last step</Eyebrow>
          <Text style={styles.heading}>
            {IS_PARTNER ? 'How will you work with' : 'Welcome to'}{'\n'}
            <Text style={styles.accent}>{IS_PARTNER ? 'BuildX?' : 'BuildX.'}</Text>
          </Text>

          {ROLES.length > 1 ? <View style={styles.cards}>
            {ROLES.map(({ r, icon, title, desc }) => {
              const on = role === r;
              return (
                <Pressable
                  key={r}
                  style={[styles.card, on && styles.cardOn]}
                  onPress={() => setRole(r)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: on }}
                >
                  <View style={[styles.cardIcon, on && styles.cardIconOn]}><Icon name={icon} size={24} color={Colors.ink} /></View>
                  <View style={styles.flex}>
                    <Text style={[styles.cardTitle, on && styles.cardTitleOn]}>{title}</Text>
                    <Text style={[styles.cardDesc, on && styles.cardDescOn]}>{desc}</Text>
                  </View>
                  <Icon name={on ? 'radiobox-marked' : 'radiobox-blank'} size={22} color={on ? Colors.lime : Colors.stoneLight} />
                </Pressable>
              );
            })}
          </View> : null}

          {role ? (
            <>
              <Text style={styles.label}>Your name</Text>
              <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Rajan Gowda" placeholderTextColor={Colors.stoneLight} autoCapitalize="words" />
            </>
          ) : null}

          {role === 'SUPPLIER' ? (
            <>
              <Text style={styles.label}>Business name</Text>
              <TextInput style={styles.input} value={businessName} onChangeText={setBusinessName} placeholder="e.g. Ramappa Sand and Aggregates" placeholderTextColor={Colors.stoneLight} autoCapitalize="words" />

              <Text style={styles.label}>WhatsApp number</Text>
              <View style={styles.phoneRow}>
                <Text style={styles.prefix}>+91</Text>
                <TextInput
                  style={styles.phoneInput}
                  value={whatsapp}
                  onChangeText={(t) => setWhatsapp(t.replace(/\D/g, ''))}
                  placeholder="98765 43210"
                  placeholderTextColor={Colors.stoneLight}
                  keyboardType="phone-pad"
                  maxLength={10}
                />
              </View>
              <Text style={styles.hint}>Buyers and BuildX contact you on this number about orders.</Text>
            </>
          ) : null}

          {role === 'DELIVERY_PARTNER' ? (
            <>
              <Text style={styles.label}>Vehicle</Text>
              <View style={styles.vehicles}>
                {VEHICLES.map((v) => {
                  const on = vehicleType === v;
                  return (
                    <Pressable key={v} style={[styles.vehicle, on && styles.vehicleOn]} onPress={() => setVehicleType(v)} accessibilityRole="radio" accessibilityState={{ selected: on }}>
                      <Icon name={VEHICLE_ICONS[v]} size={22} color={on ? Colors.sand : Colors.ink} />
                      <Text style={[styles.vehicleLabel, on && styles.vehicleLabelOn]}>{VEHICLE_LABELS[v]}</Text>
                    </Pressable>
                  );
                })}
              </View>

              <Text style={styles.label}>Vehicle number</Text>
              <TextInput style={styles.input} value={vehicleNumber} onChangeText={setVehicleNumber} placeholder="e.g. KA 06 AB 1234" placeholderTextColor={Colors.stoneLight} autoCapitalize="characters" />

              <Text style={styles.label}>Driving licence number</Text>
              <TextInput style={styles.input} value={licenseNumber} onChangeText={setLicenseNumber} placeholder="e.g. KA0620200012345" placeholderTextColor={Colors.stoneLight} autoCapitalize="characters" />
            </>
          ) : null}

          {error ? <Notice tone="error" style={styles.notice}>{error}</Notice> : null}

          <Button title="Continue" variant="lime" onPress={handleContinue} disabled={!canContinue} loading={loading} style={styles.cta} />
          <Pressable onPress={async () => { await signOutEverywhere(); clear(); }} style={styles.switch} accessibilityRole="button">
            <Text style={styles.switchText}>Use a different account</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.sand },
  flex: { flex: 1 },
  container: { padding: 24, paddingBottom: 40 },
  heading: { fontFamily: Font.display, fontSize: 36, lineHeight: 38, letterSpacing: -1.2, color: Colors.ink, marginTop: 8 },
  accent: { fontFamily: Font.serifItalic, color: Colors.ink },
  cards: { gap: 10, marginTop: 24 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16, borderRadius: 20, backgroundColor: Colors.sand2, borderWidth: 1.5, borderColor: Colors.sand4 },
  cardOn: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  cardIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.sand, alignItems: 'center', justifyContent: 'center' },
  cardIconOn: { backgroundColor: Colors.lime },
  cardTitle: { fontFamily: Font.bold, fontSize: 17, color: Colors.ink },
  cardTitleOn: { color: Colors.sand },
  cardDesc: { fontFamily: Font.regular, fontSize: 13, color: Colors.stone, marginTop: 2 },
  cardDescOn: { color: 'rgba(242,239,231,0.7)' },
  label: { fontFamily: Font.semiBold, fontSize: 14, color: Colors.ink, marginTop: 20, marginBottom: 8 },
  input: { fontFamily: Font.regular, borderWidth: 1.5, borderColor: Colors.sand4, borderRadius: 16, backgroundColor: Colors.sand2, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: Colors.ink },
  phoneRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.sand4, borderRadius: 16, backgroundColor: Colors.sand2 },
  prefix: { fontFamily: Font.semiBold, fontSize: 16, color: Colors.ink, paddingHorizontal: 14, borderRightWidth: 1, borderRightColor: Colors.sand4 },
  phoneInput: { fontFamily: Font.regular, flex: 1, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: Colors.ink },
  hint: { fontFamily: Font.regular, fontSize: 13, color: Colors.stone, marginTop: 6 },
  vehicles: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vehicle: { width: '31%', flexGrow: 1, alignItems: 'center', gap: 4, paddingVertical: 12, borderRadius: 16, backgroundColor: Colors.sand2, borderWidth: 1, borderColor: Colors.sand4 },
  vehicleOn: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  vehicleLabel: { fontFamily: Font.semiBold, fontSize: 13, color: Colors.ink },
  vehicleLabelOn: { color: Colors.sand },
  notice: { marginTop: 16 },
  cta: { marginTop: 28 },
  switch: { alignSelf: 'center', marginTop: 16, padding: 8 },
  switchText: { fontFamily: Font.semiBold, fontSize: 14, color: Colors.stone, textDecorationLine: 'underline' },
});
