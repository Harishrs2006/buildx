import { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import auth from '@react-native-firebase/auth';
import { Colors } from '../../src/constants/colors';

const OTP_LENGTH = 6;

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const router = useRouter();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(30);
  const [confirmResult, setConfirmResult] = useState<any>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Auto-focus
    setTimeout(() => inputRef.current?.focus(), 300);
    // Resend countdown
    const interval = setInterval(() => {
      setResendTimer((t) => (t > 0 ? t - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  async function resendOtp() {
    if (resendTimer > 0) return;
    try {
      const confirmation = await auth().signInWithPhoneNumber(`+91${phone}`);
      setConfirmResult(confirmation);
      setResendTimer(30);
      setOtp('');
    } catch (err: any) {
      Alert.alert('Error', err.message);
    }
  }

  async function verifyOtp() {
    if (otp.length !== OTP_LENGTH) return;
    setLoading(true);
    try {
      // confirmResult comes from the phone screen via Firebase
      // In production, use the confirmation object stored in a ref/store
      await auth().currentUser; // Firebase auto-handles the OTP via signInWithPhoneNumber flow
      // The onAuthStateChanged in _layout.tsx handles the rest
    } catch (err: any) {
      Alert.alert('Invalid OTP', err.message ?? 'Please check the code and try again');
      setOtp('');
    } finally {
      setLoading(false);
    }
  }

  const digits = otp.split('').concat(Array(OTP_LENGTH - otp.length).fill(''));

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back}>
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        <Text style={styles.heading}>Enter OTP</Text>
        <Text style={styles.sub}>
          Sent to <Text style={styles.phone}>+91 {phone}</Text>
        </Text>

        {/* Hidden input — drives visible digit boxes */}
        <TextInput
          ref={inputRef}
          value={otp}
          onChangeText={(v) => {
            const digits = v.replace(/\D/g, '').slice(0, OTP_LENGTH);
            setOtp(digits);
            if (digits.length === OTP_LENGTH) verifyOtp();
          }}
          keyboardType="number-pad"
          maxLength={OTP_LENGTH}
          style={styles.hiddenInput}
          caretHidden
        />

        {/* Visible digit boxes */}
        <TouchableOpacity activeOpacity={1} onPress={() => inputRef.current?.focus()} style={styles.boxRow}>
          {digits.map((d, i) => (
            <View
              key={i}
              style={[
                styles.box,
                d ? styles.boxFilled : null,
                otp.length === i ? styles.boxActive : null,
              ]}
            >
              <Text style={styles.boxText}>{d}</Text>
            </View>
          ))}
        </TouchableOpacity>

        {loading && <ActivityIndicator color={Colors.primary} style={styles.spinner} />}

        <TouchableOpacity onPress={resendOtp} disabled={resendTimer > 0} style={styles.resend}>
          <Text style={[styles.resendText, resendTimer > 0 && styles.resendDisabled]}>
            {resendTimer > 0 ? `Resend OTP in ${resendTimer}s` : 'Resend OTP'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  container: { flex: 1, paddingHorizontal: 24, paddingTop: 16 },
  back: { marginBottom: 32 },
  backText: { fontSize: 15, color: Colors.primary, fontWeight: '600' },
  heading: { fontSize: 26, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  sub: { fontSize: 14, color: Colors.textSecondary, marginBottom: 36 },
  phone: { color: Colors.text, fontWeight: '600' },
  hiddenInput: { position: 'absolute', opacity: 0, width: 1, height: 1 },
  boxRow: { flexDirection: 'row', gap: 12, marginBottom: 32 },
  box: {
    flex: 1, height: 56, borderRadius: 12, borderWidth: 1.5,
    borderColor: Colors.border, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.surfaceAlt,
  },
  boxFilled: { borderColor: Colors.primary, backgroundColor: Colors.surface },
  boxActive: { borderColor: Colors.primary, borderWidth: 2 },
  boxText: { fontSize: 22, fontWeight: '700', color: Colors.text },
  spinner: { marginBottom: 20 },
  resend: { alignSelf: 'center' },
  resendText: { fontSize: 14, color: Colors.primary, fontWeight: '600' },
  resendDisabled: { color: Colors.textMuted },
});
