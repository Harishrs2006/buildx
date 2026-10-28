import { useState, useRef, useEffect } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import auth from '@react-native-firebase/auth';
import { Colors } from '../../src/constants/colors';
import { useAuthStore } from '../../src/store/auth.store';
import { Eyebrow, type } from '../../src/components/ui';

const OTP_LENGTH = 6;
const RESEND_SECONDS = 30;

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const router = useRouter();
  const pendingConfirmation = useAuthStore((s) => s.pendingConfirmation);
  const setPendingConfirmation = useAuthStore((s) => s.setPendingConfirmation);

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(RESEND_SECONDS);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const focus = setTimeout(() => inputRef.current?.focus(), 300);
    const interval = setInterval(() => setResendTimer((t) => (t > 0 ? t - 1 : 0)), 1000);
    return () => {
      clearTimeout(focus);
      clearInterval(interval);
    };
  }, []);

  async function resendOtp() {
    if (resendTimer > 0) return;
    setError(null);
    try {
      const confirmation = await auth().signInWithPhoneNumber(`+91${phone}`);
      setPendingConfirmation(confirmation);
      setResendTimer(RESEND_SECONDS);
      setOtp('');
    } catch {
      setError('We could not send a new code right now. Please try again.');
    }
  }

  async function verifyOtp(code: string) {
    if (code.length !== OTP_LENGTH) return;
    if (!pendingConfirmation) {
      setError('This code has expired. Go back and request a new one.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await pendingConfirmation.confirm(code);
      // onAuthStateChanged in _layout.tsx fires here and calls syncWithBackend(),
      // which sets the user and navigates; nothing to do manually
    } catch (err: any) {
      setError(err?.code === 'auth/code-expired' ? 'That code expired. Request a new one.' : 'That code is incorrect. Check the SMS and try again.');
      setOtp('');
    } finally {
      setLoading(false);
    }
  }

  const digits = otp.split('').concat(Array(OTP_LENGTH - otp.length).fill(''));

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Pressable onPress={() => router.back()} style={styles.back} accessibilityRole="button" hitSlop={12}>
          <Text style={styles.backText}>‹ Change number</Text>
        </Pressable>

        <Eyebrow>Step 2 of 2</Eyebrow>
        <Text style={[type.title, styles.heading]}>Enter the code</Text>
        <Text style={type.body}>
          We sent a 6-digit code to <Text style={styles.phone}>+91 {phone}</Text>
        </Text>

        {/* One real input drives the six boxes; it also receives SMS autofill */}
        <TextInput
          ref={inputRef}
          value={otp}
          onChangeText={(v) => {
            const clean = v.replace(/\D/g, '').slice(0, OTP_LENGTH);
            setOtp(clean);
            setError(null);
            if (clean.length === OTP_LENGTH) verifyOtp(clean);
          }}
          keyboardType="number-pad"
          textContentType="oneTimeCode"
          autoComplete="sms-otp"
          maxLength={OTP_LENGTH}
          style={styles.hiddenInput}
          caretHidden
          accessibilityLabel="6-digit code"
        />

        <Pressable onPress={() => inputRef.current?.focus()} style={styles.boxRow} accessible={false}>
          {digits.map((d, i) => {
            const active = otp.length === i && !loading;
            return (
              <View key={i} style={[styles.box, d ? styles.boxFilled : null, active ? styles.boxActive : null, error ? styles.boxError : null]}>
                <Text style={styles.boxText}>{d}</Text>
              </View>
            );
          })}
        </Pressable>

        {error && <Text style={styles.error} accessibilityLiveRegion="polite">{error}</Text>}
        {loading && (
          <View style={styles.verifying}>
            <ActivityIndicator color={Colors.ink} />
            <Text style={styles.verifyingText}>Verifying</Text>
          </View>
        )}

        <Pressable onPress={resendOtp} disabled={resendTimer > 0} style={styles.resend} accessibilityRole="button">
          <Text style={[styles.resendText, resendTimer > 0 && styles.resendDisabled]}>
            {resendTimer > 0 ? `Resend code in 0:${String(resendTimer).padStart(2, '0')}` : 'Resend code'}
          </Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.sand },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 12 },
  back: { alignSelf: 'flex-start', marginBottom: 32, paddingVertical: 6 },
  backText: { fontSize: 15, color: Colors.cobalt, fontWeight: '600' },
  heading: { marginTop: 10, marginBottom: 8 },
  phone: { color: Colors.ink, fontWeight: '700' },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  boxRow: { flexDirection: 'row', gap: 10, marginTop: 32 },
  box: { flex: 1, height: 60, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.sand4, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.sand2 },
  boxFilled: { borderColor: Colors.ink },
  boxActive: { borderColor: Colors.ink, borderWidth: 2, shadowColor: Colors.lime, shadowOpacity: 1, shadowRadius: 6, shadowOffset: { width: 0, height: 0 }, elevation: 2 },
  boxError: { borderColor: Colors.error },
  boxText: { fontSize: 24, fontWeight: '700', color: Colors.ink },
  error: { marginTop: 14, fontSize: 14, color: Colors.error },
  verifying: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  verifyingText: { fontSize: 14, color: Colors.stone },
  resend: { alignSelf: 'center', marginTop: 32, paddingVertical: 8 },
  resendText: { fontSize: 15, color: Colors.cobalt, fontWeight: '600' },
  resendDisabled: { color: Colors.stone },
});
