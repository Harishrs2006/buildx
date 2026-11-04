import { ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useOrders } from '../../src/hooks/useOrders';
import { Colors } from '../../src/constants/colors';
import { type } from '../../src/components/ui';
import { MenuRow, ProfileHeader, Section, SignOutFooter, StatTiles } from '../../src/components/Profile';

export default function ProfileScreen() {
  const router = useRouter();
  const { data } = useOrders();
  const orders = data?.data ?? [];
  const delivered = orders.filter((o) => o.status === 'DELIVERED').length;
  const inProgress = orders.filter((o) => !['DELIVERED', 'CANCELLED'].includes(o.status)).length;

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={[type.title, styles.title]}>Profile</Text>
        <ProfileHeader roleLabel="BUYER" />
        <StatTiles
          items={[
            { label: 'Orders', value: orders.length },
            { label: 'Delivered', value: delivered },
            { label: 'In progress', value: inProgress },
          ]}
        />
        <Section title="Shortcuts">
          <MenuRow icon="clipboard-text-outline" label="My orders" onPress={() => router.push('/(buyer)/orders' as never)} />
          <MenuRow icon="cart-outline" label="Cart" onPress={() => router.push('/(buyer)/cart' as never)} />
          <MenuRow icon="chat-processing-outline" label="Ask the materials assistant" onPress={() => router.push('/(buyer)/ai-chat' as never)} last />
        </Section>
        <SignOutFooter />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.sand },
  container: { padding: 20, paddingBottom: 32 },
  title: { marginBottom: 14 },
});
