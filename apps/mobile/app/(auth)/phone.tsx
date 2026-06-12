import { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import auth from '@react-native-firebase/auth';
import { Colors } from '../../src/constants/colors';

export default function PhoneScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const confirmRef = useRef<any>(null);

  async function sendOtp() {
    const cleaned = phone.replace(/\s/g, '');
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
      Alert.alert('Invalid number', 'Enter a valid 10-digit Indian mobile number');
      return;
    }
    setLoading(true);
    try {
      const confirmation = await auth().signInWithPhoneNumber(`+91${cleaned}`);
      confirmRef.current = confirmation;
      router.push({ pathname: '/(auth)/otp', params: { phone: cleaned } });
    } catch (err: any) {
      Alert.alert('Error', err.message ?? 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <View style={styles.container}>
          {/* Logo area */}
          <View style={styles.logoArea}>
            <Text style={styles.logo}>BuildX</Text>
            <Text style={styles.tagline}>Construction materials, simplified.</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <Text style={styles.heading}>Enter your mobile number</Text>
            <Text style={styles.sub}>We'll send a one-time password to verify your number.</Text>

            <View style={styles.inputRow}>
              <View style={styles.countryCode}>
                <Text style={styles.countryCodeText}>🇮🇳  +91</Text>
              </View>
              <TextInput
                style={styles.input}
                value={phone}
                onChangeText={setPhone}
                placeholder="98765 43210"
                keyboardType="phone-pad"
                maxLength={10}
                autoFocus
                placeholderTextColor={Colors.textMuted}
              />
            </View>

            <TouchableOpacity
              style={[styles.btn, (!phone || loading) && styles.btnDisabled]}
              onPress={sendOtp}
              disabled={!phone || loading}
              activeOpacity={0.8}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.btnText}>Send OTP</Text>
              )}
            </TouchableOpacity>

            <Text style={styles.terms}>
              By continuing, you agree to BuildX's Terms of Service and Privacy Policy.
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  flex: { flex: 1 },
  container: { flex: 1, paddingHorizontal: 24 },
  logoArea: { paddingTop: 48, paddingBottom: 40 },
  logo: { fontSize: 36, fontWeight: '700', color: Colors.primary, letterSpacing: -1 },
  tagline: { fontSize: 14, color: Colors.textSecondary, marginTop: 4 },
  form: { flex: 1 },
  heading: { fontSize: 22, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  sub: { fontSize: 14, color: Colors.textSecondary, marginBottom: 28, lineHeight: 20 },
  inputRow: { flexDirection: 'row', borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12, overflow: 'hidden', marginBottom: 20 },
  countryCode: { paddingHorizontal: 14, paddingVertical: 16, backgroundColor: Colors.surfaceAlt, justifyContent: 'center', borderRightWidth: 1, borderRightColor: Colors.border },
  countryCodeText: { fontSize: 15, color: Colors.text, fontWeight: '500' },
  input: { flex: 1, paddingHorizontal: 16, paddingVertical: 16, fontSize: 18, color: Colors.text, letterSpacing: 1 },
  btn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginBottom: 20 },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  terms: { fontSize: 12, color: Colors.textMuted, textAlign: 'center', lineHeight: 18 },
});
