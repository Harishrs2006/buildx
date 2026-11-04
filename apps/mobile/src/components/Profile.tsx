import { useState, type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { useAuthStore } from '../store/auth.store';
import { signOutEverywhere } from '../lib/googleAuth';
import { api } from '../lib/api';
import { Colors } from '../constants/colors';
import { Font } from '../constants/typography';
import { SthivaMark, ConfirmSheet, Eyebrow, Icon, type IconName } from './ui';

// Shared building blocks for the four role profile screens

export function ProfileHeader({ roleLabel }: { roleLabel: string }) {
  const user = useAuthStore((s) => s.user);
  return (
    <View style={styles.header}>
      <View style={styles.avatar}><Text style={styles.avatarText}>{user?.name?.charAt(0).toUpperCase() ?? '?'}</Text></View>
      <View style={styles.flex}>
        <Text style={styles.name} numberOfLines={1}>{user?.name}</Text>
        <Text style={styles.contact} numberOfLines={1}>{user?.phone ?? user?.email}</Text>
      </View>
      <View style={styles.rolePill}><Text style={styles.roleText}>{roleLabel}</Text></View>
    </View>
  );
}

export function StatTiles({ items }: { items: { label: string; value: string | number }[] }) {
  return (
    <View style={styles.stats}>
      {items.map((s) => (
        <View key={s.label} style={styles.stat}>
          <Text style={styles.statValue}>{s.value}</Text>
          <Text style={styles.statLabel}>{s.label}</Text>
        </View>
      ))}
    </View>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Eyebrow>{title}</Eyebrow>
      <View style={styles.sectionBody}>{children}</View>
    </View>
  );
}

export function MenuRow({ icon, label, onPress, last }: { icon: IconName; label: string; onPress: () => void; last?: boolean }) {
  return (
    <Pressable style={({ pressed }) => [styles.row, !last && styles.rowBorder, pressed && styles.rowPressed]} onPress={onPress} accessibilityRole="button">
      <Icon name={icon} size={22} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Icon name="chevron-right" size={20} color={Colors.stone} />
    </Pressable>
  );
}

export function InfoRow({ label, value, last }: { label: string; value?: string | number | null; last?: boolean }) {
  return (
    <View style={[styles.row, !last && styles.rowBorder]}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue} numberOfLines={2}>{value === undefined || value === null || value === '' ? 'Not set' : String(value)}</Text>
    </View>
  );
}

export function Tags({ items }: { items: string[] }) {
  return (
    <View style={styles.tags}>
      {items.map((t) => <View key={t} style={styles.tag}><Text style={styles.tagText}>{t}</Text></View>)}
    </View>
  );
}

// Sign out button with its confirm sheet, the delete-account option (buyers and suppliers; the app stores require
// it) and the app version under it
export function SignOutFooter() {
  const clear = useAuthStore((s) => s.clear);
  const role = useAuthStore((s) => s.user?.role);
  const [asking, setAsking] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const canDelete = role === 'BUYER' || role === 'SUPPLIER';

  async function deleteAccount() {
    setDeleteBusy(true);
    setDeleteError(null);
    try {
      // The API refuses (409) while an order is still open and says why
      await api.delete('/users/me');
      await signOutEverywhere();
      clear();
    } catch (err: any) {
      setDeleteError(err?.status === 409 && err?.message ? err.message : 'We could not delete your account. Please try again.');
      setDeleteBusy(false);
    }
  }
  return (
    <View style={styles.footer}>
      <Pressable style={styles.signOut} onPress={() => setAsking(true)} accessibilityRole="button">
        <Icon name="logout" size={20} color={Colors.error} />
        <Text style={styles.signOutText}>Sign out</Text>
      </Pressable>
      {canDelete ? (
        <Pressable style={styles.deleteLink} onPress={() => { setDeleteError(null); setDeleting(true); }} accessibilityRole="button">
          <Text style={styles.deleteText}>Delete my account</Text>
        </Pressable>
      ) : null}
      <View style={styles.brand}>
        <SthivaMark size={28} />
        <Text style={styles.version}>
          {Constants.expoConfig?.name ?? 'Sthiva'} {Constants.expoConfig?.version ?? ''}
          {Updates.isEnabled && !Updates.isEmbeddedLaunch && Updates.updateId ? ` · update ${Updates.updateId.slice(0, 8)}` : ''}
        </Text>
      </View>
      <ConfirmSheet
        visible={asking}
        title="Sign out?"
        body="You can sign back in any time with the same account."
        confirmLabel="Sign out"
        danger
        loading={busy}
        onConfirm={async () => {
          setBusy(true);
          await signOutEverywhere();
          clear();
          setBusy(false);
          setAsking(false);
        }}
        onCancel={() => setAsking(false)}
      />
      <ConfirmSheet
        visible={deleting}
        title="Delete your account?"
        body={role === 'SUPPLIER'
          ? 'Your details are erased, your listings are taken down and you are signed out. Past orders are kept without your contact details, because invoices must be kept by law.'
          : 'Your name, phone or email and saved addresses are erased and you are signed out. Past orders are kept without your contact details, because invoices must be kept by law.'}
        confirmLabel="Delete my account"
        danger
        loading={deleteBusy}
        onConfirm={deleteAccount}
        onCancel={() => setDeleting(false)}
      >
        {deleteError ? <Text style={styles.deleteError} accessibilityLiveRegion="polite">{deleteError}</Text> : null}
      </ConfirmSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 18, borderRadius: 24, backgroundColor: Colors.ink },
  avatar: { width: 52, height: 52, borderRadius: 26, backgroundColor: Colors.lime, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: Font.display, fontSize: 22, color: Colors.ink },
  name: { fontFamily: Font.display, fontSize: 20, color: Colors.sand },
  contact: { fontFamily: Font.regular, fontSize: 14, color: 'rgba(242,239,231,0.7)', marginTop: 2 },
  rolePill: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: 'rgba(242,239,231,0.12)' },
  roleText: { fontFamily: Font.monoBold, fontSize: 10, letterSpacing: 1, color: Colors.lime },
  stats: { flexDirection: 'row', gap: 10, marginTop: 12 },
  stat: { flex: 1, padding: 14, borderRadius: 18, backgroundColor: Colors.sand2, borderWidth: 1, borderColor: Colors.sand4 },
  statValue: { fontFamily: Font.display, fontSize: 24, color: Colors.ink },
  statLabel: { fontFamily: Font.mono, fontSize: 10, letterSpacing: 1, color: Colors.stone, textTransform: 'uppercase', marginTop: 2 },
  section: { marginTop: 22 },
  sectionBody: { marginTop: 10, borderRadius: 18, backgroundColor: Colors.sand2, borderWidth: 1, borderColor: Colors.sand4, paddingHorizontal: 14 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 10 },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: Colors.sand4 },
  rowPressed: { opacity: 0.6 },
  rowLabel: { fontFamily: Font.semiBold, flex: 1, fontSize: 15, color: Colors.ink },
  infoLabel: { fontFamily: Font.regular, flex: 1, fontSize: 14, color: Colors.stone },
  infoValue: { fontFamily: Font.semiBold, flex: 1, fontSize: 14, color: Colors.ink, textAlign: 'right' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingVertical: 12 },
  tag: { borderRadius: 999, backgroundColor: Colors.sand, borderWidth: 1, borderColor: Colors.sand4, paddingHorizontal: 12, paddingVertical: 5 },
  tagText: { fontFamily: Font.medium, fontSize: 13, color: Colors.ink },
  footer: { marginTop: 28, alignItems: 'stretch' },
  signOut: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 26, backgroundColor: Colors.errorLight },
  signOutText: { fontFamily: Font.bold, fontSize: 16, color: Colors.error },
  deleteLink: { alignSelf: 'center', marginTop: 14, padding: 8 },
  deleteText: { fontFamily: Font.semiBold, fontSize: 14, color: Colors.stone, textDecorationLine: 'underline' },
  deleteError: { fontFamily: Font.regular, fontSize: 14, lineHeight: 20, color: Colors.error, marginTop: 4 },
  brand: { alignItems: 'center', gap: 6, marginTop: 24 },
  version: { fontFamily: Font.mono, fontSize: 11, color: Colors.stone },
});
