import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import auth from '@react-native-firebase/auth';
import { Colors } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/auth.store';
import { Button, Eyebrow, type } from '../../src/components/ui';

// The BuildX mark: two crossing beams, the lime one on top
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <View style={[logo.box, { width: size, height: size, borderRadius: size * 0.25 }]}>
      <Text style={[logo.x, { fontSize: size * 0.62, lineHeight: size * 0.78 }]}>X</Text>
    </View>
  );
}

const logo = StyleSheet.create({
  box: { backgroundColor: Colors.ink3, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: 'rgba(242,239,231,0.12)' },
  x: { color: Colors.lime, fontWeight: '900' },
});

export default function PhoneScreen() {
  const router = useRouter();
  const setPendingConfirmation = useAuthStore((s) => s.setPendingConfirmation);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleaned = phone.replace(/\D/g, '');
  const valid = /^[6-9]\d{9}$/.test(cleaned);

  async function sendOtp() {
    if (!valid) {
      setError('Enter a 10-digit Indian mobile number starting with 6, 7, 8 or 9.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const confirmation = await auth().signInWithPhoneNumber(`+91${cleaned}`);
      setPendingConfirmation(confirmation);
      router.push({ pathname: '/(auth)/otp', params: { phone: cleaned } });
    } catch (err: any) {
      setError(err?.code === 'auth/too-many-requests' ? 'Too many attempts. Try again in a few minutes.' : 'We could not send a code right now. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.hero}>
        <View style={styles.brandRow}>
          <LogoMark size={36} />
          <Text style={styles.brand}>BuildX</Text>
        </View>
        <Text style={styles.heroTitle}>
          Order for the site,{'\n'}
          <Text style={styles.heroAccent}>not the queue.</Text>
        </Text>
      </SafeAreaView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Eyebrow>Step 1 of 2</Eyebrow>
          <Text style={[type.title, styles.heading]}>Sign in or create an account</Text>
          <Text style={type.body}>Enter your mobile number. We will text you a 6-digit code.</Text>

          <Text style={styles.label}>Mobile number</Text>
          <View style={[styles.inputRow, error ? styles.inputRowError : null]}>
            <View style={styles.country}>
              <View style={styles.inBadge}><Text style={styles.inBadgeText}>IN</Text></View>
              <Text style={styles.countryText}>+91</Text>
            </View>
            <TextInput
              style={styles.input}
              value={phone}
              onChangeText={(t) => { setPhone(t.replace(/\D/g, '')); setError(null); }}
              placeholder="98765 43210"
              keyboardType="number-pad"
              textContentType="telephoneNumber"
              autoComplete="tel"
              maxLength={10}
              autoFocus
              placeholderTextColor={Colors.stoneLight}
              accessibilityLabel="Mobile number"
              returnKeyType="done"
              onSubmitEditing={sendOtp}
            />
          </View>
          {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : <Text style={styles.hint}>Indian mobile numbers only.</Text>}

          <Button title="Send code" onPress={sendOtp} disabled={!valid} loading={loading} style={styles.cta} />

          <Text style={styles.terms}>By continuing you agree to the BuildX Terms of Service and Privacy Policy. Standard SMS rates may apply.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.sand },
  flex: { flex: 1 },
  hero: { backgroundColor: Colors.ink, paddingHorizontal: 24, paddingBottom: 28, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 16 },
  brand: { color: Colors.sand, fontSize: 22, fontWeight: '800', letterSpacing: -0.8 },
  heroTitle: { marginTop: 36, color: Colors.sand, fontSize: 38, lineHeight: 40, fontWeight: '800', letterSpacing: -1.4 },
  heroAccent: { color: Colors.lime, fontStyle: 'italic', fontWeight: '400' },
  form: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40 },
  heading: { marginTop: 10, marginBottom: 8 },
  label: { marginTop: 28, marginBottom: 8, fontSize: 14, fontWeight: '700', color: Colors.ink },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.sand4, borderRadius: 16, backgroundColor: Colors.sand2 },
  inputRowError: { borderColor: Colors.error },
  country: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, borderRightWidth: 1, borderRightColor: Colors.sand4, alignSelf: 'stretch' },
  inBadge: { backgroundColor: Colors.ink, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  inBadgeText: { color: Colors.lime, fontSize: 10, fontWeight: '800' },
  countryText: { fontSize: 16, color: Colors.ink, fontWeight: '600' },
  input: { flex: 1, paddingHorizontal: 16, paddingVertical: 16, fontSize: 19, color: Colors.ink, letterSpacing: 1.2 },
  hint: { marginTop: 8, fontSize: 13, color: Colors.stone },
  error: { marginTop: 8, fontSize: 13, color: Colors.error },
  cta: { marginTop: 24 },
  terms: { marginTop: 20, fontSize: 12, lineHeight: 18, color: Colors.stone, textAlign: 'center' },
});
