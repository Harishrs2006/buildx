import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../src/constants/colors';
import { Font } from '../../src/constants/typography';
import { useAuthStore } from '../../src/store/auth.store';
import { signOutEverywhere } from '../../src/lib/googleAuth';
import { IS_PARTNER } from '../../src/lib/appVariant';
import { SthivaMark, Button, Eyebrow, Icon } from '../../src/components/ui';

const ROLE_NAMES: Record<string, string> = {
  BUYER: 'a buyer',
  SUPPLIER: 'a supplier',
  DELIVERY_PARTNER: 'a delivery partner',
  OPERATOR: 'a Sthiva operations',
  ADMIN: 'a Sthiva admin',
};

/** Shown when an account opens the app meant for the other side of the marketplace. */
export default function OtherAppScreen() {
  const { user, clear } = useAuthStore();
  const [leaving, setLeaving] = useState(false);
  const otherApp = IS_PARTNER ? 'Sthiva' : 'Sthiva Partner';
  const who = ROLE_NAMES[user?.role ?? ''] ?? 'another kind of';

  async function switchAccount() {
    setLeaving(true);
    await signOutEverywhere();
    clear();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.body}>
        <SthivaMark size={44} />
        <Eyebrow>Wrong app for this account</Eyebrow>
        <Text style={styles.heading}>
          Please use{'\n'}
          <Text style={styles.accent}>{otherApp}.</Text>
        </Text>
        <Text style={styles.text}>
          You are signed in with {who} account. {IS_PARTNER
            ? 'This app is for suppliers and delivery partners. Buying materials happens in the Sthiva app.'
            : 'This app is for buying materials. Suppliers and delivery partners manage their orders in the Sthiva Partner app.'}
        </Text>
        <View style={styles.tip}>
          <Icon name="information-outline" size={20} color={Colors.ink} />
          <Text style={styles.tipText}>
            Install {otherApp} and sign in with the same Google account or mobile number. Your orders and details are already there.
          </Text>
        </View>
      </View>
      <Button title="Use a different account" variant="ink" onPress={switchAccount} loading={leaving} style={styles.cta} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.sand, padding: 24, justifyContent: 'space-between' },
  body: { marginTop: 24 },
  heading: { fontFamily: Font.display, fontSize: 36, lineHeight: 38, letterSpacing: -1.2, color: Colors.ink, marginTop: 8 },
  accent: { fontFamily: Font.serifItalic, color: Colors.ink },
  text: { fontFamily: Font.regular, fontSize: 16, lineHeight: 23, color: Colors.ink, marginTop: 16 },
  tip: { flexDirection: 'row', gap: 10, marginTop: 20, padding: 14, borderRadius: 16, backgroundColor: Colors.sand2, borderWidth: 1, borderColor: Colors.sand4 },
  tipText: { flex: 1, fontFamily: Font.regular, fontSize: 14, lineHeight: 20, color: Colors.ink },
  cta: { marginBottom: 8 },
});
