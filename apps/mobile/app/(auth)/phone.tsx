import { useEffect, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import auth from '@react-native-firebase/auth';
import { Colors } from '../../src/constants/colors';
import { Font } from '../../src/constants/typography';
import { useAuthStore } from '../../src/store/auth.store';
import { BuildXMark, Button, Eyebrow, type } from '../../src/components/ui';
import { signInWithGoogle, signOutEverywhere } from '../../src/lib/googleAuth';

export default function PhoneScreen() {
  const router = useRouter();
  const setPendingConfirmation = useAuthStore((s) => s.setPendingConfirmation);
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);
  const [showPhone, setShowPhone] = useState(false);
  const syncError = useAuthStore((s) => s.syncError);
  const syncWithBackend = useAuthStore((s) => s.syncWithBackend);
  const clearAuth = useAuthStore((s) => s.clear);
  const [retrying, setRetrying] = useState(false);

  // Google worked but the API did not answer: stop the spinner and show the retry box
  useEffect(() => {
    if (syncError) setGoogleLoading(false);
  }, [syncError]);

  async function retrySync() {
    setRetrying(true);
    await syncWithBackend();
    setRetrying(false);
  }

  async function useDifferentAccount() {
    await signOutEverywhere();
    clearAuth();
  }

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
      setError(phoneErrorMessage(err?.code, err?.message));
    } finally {
      setLoading(false);
    }
  }

  async function continueWithGoogle() {
    setGoogleError(null);
    setGoogleLoading(true);
    try {
      // On success AuthGate (app/_layout.tsx) syncs with the API and routes on, so the spinner
      // stays until this screen goes away (or the retry box appears)
      const signedIn = await signInWithGoogle();
      if (!signedIn) setGoogleLoading(false);
    } catch (err: any) {
      setGoogleError(err?.message ?? 'We could not sign you in with Google. Please try again.');
      setGoogleLoading(false);
    }
  }

  return (
    <View style={styles.root}>
      <SafeAreaView edges={['top']} style={styles.hero}>
        <View style={styles.brandRow}>
          <BuildXMark size={40} tile />
          <Text style={styles.brand}>BuildX</Text>
        </View>
        <Text style={styles.heroTitle}>
          Order for the site,{'\n'}
          <Text style={styles.heroAccent}>not the queue.</Text>
        </Text>
      </SafeAreaView>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          <Eyebrow>Welcome</Eyebrow>
          <Text style={[type.title, styles.heading]}>Sign in or create an account</Text>
          <Text style={type.body}>Use your Google account. It is free and takes one tap.</Text>

          {syncError ? (
            <View style={styles.syncBox} accessibilityLiveRegion="polite">
              <Text style={styles.syncText}>{syncError}</Text>
              <Button title="Try again" onPress={retrySync} loading={retrying} style={styles.syncBtn} />
              <TouchableOpacity onPress={useDifferentAccount} style={styles.switch} accessibilityRole="button">
                <Text style={styles.switchText}>Use a different account</Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <Button title="Continue with Google" onPress={continueWithGoogle} loading={googleLoading} disabled={loading} style={styles.cta} />
          {googleError ? <Text style={styles.error} accessibilityLiveRegion="polite">{googleError}</Text> : null}

          {!showPhone ? (
            <TouchableOpacity onPress={() => setShowPhone(true)} style={styles.switch} accessibilityRole="button">
              <Text style={styles.switchText}>Use mobile number instead</Text>
            </TouchableOpacity>
          ) : (
            <>
              <View style={styles.dividerRow}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>or with your mobile number</Text>
                <View style={styles.dividerLine} />
              </View>

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
              {error ? <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text> : <Text style={styles.hint}>We will text you a 6-digit code. Indian mobile numbers only.</Text>}

              <Button title="Send code" onPress={sendOtp} disabled={!valid || googleLoading} loading={loading} variant="ghost" style={styles.cta} />
            </>
          )}

          <Text style={styles.terms}>By continuing you agree to the BuildX Terms of Service and Privacy Policy.</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

function phoneErrorMessage(code?: string, message?: string) {
  // Android reports a missing paid plan as auth/internal-error with BILLING_NOT_ENABLED in the message
  if (message?.includes('BILLING_NOT_ENABLED')) code = 'auth/billing-not-enabled';
  switch (code) {
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again in a few minutes.';
    // Text codes need Firebase's paid plan, which is not on yet
    case 'auth/billing-not-enabled':
    case 'auth/quota-exceeded':
      return 'Text message codes are not available yet. Please use Continue with Google.';
    default:
      return 'We could not send a code right now. Please try again.';
  }
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.sand },
  flex: { flex: 1 },
  hero: { backgroundColor: Colors.ink, paddingHorizontal: 24, paddingBottom: 28, borderBottomLeftRadius: 28, borderBottomRightRadius: 28 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 16 },
  brand: { fontFamily: Font.display, color: Colors.sand, fontSize: 22, letterSpacing: -0.8 },
  heroTitle: { fontFamily: Font.display, marginTop: 36, color: Colors.sand, fontSize: 38, lineHeight: 40, letterSpacing: -1.4 },
  heroAccent: { fontFamily: Font.serifItalic, color: Colors.lime },
  form: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 40 },
  heading: { marginTop: 10, marginBottom: 8 },
  label: { fontFamily: Font.bold, marginTop: 28, marginBottom: 8, fontSize: 14, color: Colors.ink },
  inputRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.sand4, borderRadius: 16, backgroundColor: Colors.sand2 },
  inputRowError: { borderColor: Colors.error },
  country: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, borderRightWidth: 1, borderRightColor: Colors.sand4, alignSelf: 'stretch' },
  inBadge: { backgroundColor: Colors.ink, borderRadius: 4, paddingHorizontal: 5, paddingVertical: 2 },
  inBadgeText: { fontFamily: Font.bold, color: Colors.lime, fontSize: 10 },
  countryText: { fontFamily: Font.semiBold, fontSize: 16, color: Colors.ink },
  input: { fontFamily: Font.regular, flex: 1, paddingHorizontal: 16, paddingVertical: 16, fontSize: 19, color: Colors.ink, letterSpacing: 1.2 },
  hint: { fontFamily: Font.regular, marginTop: 8, fontSize: 13, color: Colors.stone },
  error: { fontFamily: Font.regular, marginTop: 8, fontSize: 13, color: Colors.error },
  cta: { marginTop: 24 },
  syncBox: { marginTop: 24, padding: 16, borderRadius: 16, borderWidth: 1.5, borderColor: Colors.error, backgroundColor: Colors.sand2 },
  syncText: { fontFamily: Font.regular, fontSize: 15, lineHeight: 21, color: Colors.ink },
  syncBtn: { marginTop: 14 },
  switch: { marginTop: 20, alignSelf: 'center', paddingVertical: 8, paddingHorizontal: 12 },
  switchText: { fontFamily: Font.bold, fontSize: 15, color: Colors.ink, textDecorationLine: 'underline' },
  dividerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 28 },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.sand4 },
  dividerText: { fontFamily: Font.regular, fontSize: 13, color: Colors.stone },
  terms: { fontFamily: Font.regular, marginTop: 20, fontSize: 12, lineHeight: 18, color: Colors.stone, textAlign: 'center' },
});
