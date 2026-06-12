import { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, ScrollView, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { api } from '../../src/lib/api';
import { useAuthStore } from '../../src/store/auth.store';
import { Colors } from '../../src/constants/colors';

type Role = 'BUYER' | 'SUPPLIER';

export default function RoleScreen() {
  const router = useRouter();
  const { syncWithBackend } = useAuthStore();
  const [role, setRole] = useState<Role | null>(null);
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleContinue() {
    if (!role || !name.trim()) return;
    if (role === 'SUPPLIER' && (!businessName.trim() || !whatsapp.trim())) return;

    setLoading(true);
    try {
      await api.post('/auth/onboard', {
        name: name.trim(),
        role,
        ...(role === 'SUPPLIER' && {
          businessName: businessName.trim(),
          whatsappNumber: whatsapp.replace(/\s/g, ''),
        }),
      });
      await syncWithBackend();
      // AuthGate in _layout.tsx will redirect to correct home
    } catch (err: any) {
      Alert.alert('Error', err.message);
    } finally {
      setLoading(false);
    }
  }

  const canContinue = role && name.trim() &&
    (role === 'BUYER' || (businessName.trim() && /^[6-9]\d{9}$/.test(whatsapp.replace(/\s/g, ''))));

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.heading}>Who are you on BuildX?</Text>
        <Text style={styles.sub}>This helps us personalise your experience.</Text>

        {/* Role cards */}
        <View style={styles.cards}>
          {(['BUYER', 'SUPPLIER'] as Role[]).map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.card, role === r && styles.cardSelected]}
              onPress={() => setRole(r)}
              activeOpacity={0.8}
            >
              <Text style={styles.cardEmoji}>{r === 'BUYER' ? '🏗️' : '🏭'}</Text>
              <Text style={[styles.cardTitle, role === r && styles.cardTitleSelected]}>
                {r === 'BUYER' ? 'Contractor / Buyer' : 'Supplier / Dealer'}
              </Text>
              <Text style={styles.cardDesc}>
                {r === 'BUYER'
                  ? 'I buy construction materials for projects'
                  : 'I sell construction materials or equipment'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Common fields */}
        <Text style={styles.label}>Your name *</Text>
        <TextInput
          style={styles.input}
          value={name}
          onChangeText={setName}
          placeholder="e.g. Rajan Gowda"
          placeholderTextColor={Colors.textMuted}
          autoCapitalize="words"
        />

        {/* Supplier-specific fields */}
        {role === 'SUPPLIER' && (
          <>
            <Text style={styles.label}>Business name *</Text>
            <TextInput
              style={styles.input}
              value={businessName}
              onChangeText={setBusinessName}
              placeholder="e.g. Ramappa Sand & Aggregates"
              placeholderTextColor={Colors.textMuted}
              autoCapitalize="words"
            />

            <Text style={styles.label}>WhatsApp number *</Text>
            <View style={styles.inputRow}>
              <Text style={styles.prefix}>+91</Text>
              <TextInput
                style={[styles.input, styles.inputFlex]}
                value={whatsapp}
                onChangeText={setWhatsapp}
                placeholder="98765 43210"
                placeholderTextColor={Colors.textMuted}
                keyboardType="phone-pad"
                maxLength={10}
              />
            </View>
            <Text style={styles.hint}>Customers will contact you on this number for orders.</Text>
          </>
        )}

        <TouchableOpacity
          style={[styles.btn, !canContinue && styles.btnDisabled]}
          onPress={handleContinue}
          disabled={!canContinue || loading}
          activeOpacity={0.8}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.btnText}>Get Started</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  container: { paddingHorizontal: 24, paddingTop: 32, paddingBottom: 40 },
  heading: { fontSize: 26, fontWeight: '700', color: Colors.text, marginBottom: 8 },
  sub: { fontSize: 14, color: Colors.textSecondary, marginBottom: 28 },
  cards: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  card: {
    flex: 1, padding: 16, borderRadius: 14, borderWidth: 1.5,
    borderColor: Colors.border, backgroundColor: Colors.surfaceAlt,
  },
  cardSelected: { borderColor: Colors.primary, backgroundColor: '#FFF7ED' },
  cardEmoji: { fontSize: 28, marginBottom: 8 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: Colors.textSecondary, marginBottom: 4 },
  cardTitleSelected: { color: Colors.primary },
  cardDesc: { fontSize: 12, color: Colors.textMuted, lineHeight: 16 },
  label: { fontSize: 13, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 14, fontSize: 15,
    color: Colors.text, backgroundColor: Colors.surface, marginBottom: 16,
  },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputFlex: { flex: 1 },
  prefix: { fontSize: 15, fontWeight: '600', color: Colors.text, marginBottom: 16 },
  hint: { fontSize: 12, color: Colors.textMuted, marginTop: -10, marginBottom: 20 },
  btn: {
    backgroundColor: Colors.primary, borderRadius: 12,
    paddingVertical: 16, alignItems: 'center', marginTop: 8,
  },
  btnDisabled: { opacity: 0.5 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
});
