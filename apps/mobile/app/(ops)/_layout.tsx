import { Tabs } from 'expo-router';
import { View, Text, StyleSheet } from 'react-native';
import { Colors } from '../../src/constants/colors';

function TabIcon({ label, emoji, focused }: { label: string; emoji: string; focused: boolean }) {
  return (
    <View style={styles.tabItem}>
      <Text style={[styles.emoji, focused && styles.emojiFocused]}>{emoji}</Text>
      <Text style={[styles.tabLabel, focused && styles.tabLabelFocused]}>{label}</Text>
    </View>
  );
}

// Operations panel for OPERATOR / ADMIN accounts
export default function OpsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: styles.tabBar, tabBarShowLabel: false }}>
      <Tabs.Screen name="attention" options={{ tabBarIcon: ({ focused }) => <TabIcon label="Attention" emoji="🚨" focused={focused} /> }} />
      <Tabs.Screen name="orders" options={{ tabBarIcon: ({ focused }) => <TabIcon label="Orders" emoji="📋" focused={focused} /> }} />
      <Tabs.Screen name="suppliers" options={{ tabBarIcon: ({ focused }) => <TabIcon label="Suppliers" emoji="🏭" focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ tabBarIcon: ({ focused }) => <TabIcon label="Profile" emoji="👤" focused={focused} /> }} />
      <Tabs.Screen name="order/[id]" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: { height: 64, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface, paddingBottom: 8 },
  tabItem: { alignItems: 'center', paddingTop: 6 },
  emoji: { fontSize: 22, opacity: 0.4 },
  emojiFocused: { opacity: 1 },
  tabLabel: { fontSize: 10, color: Colors.textMuted, marginTop: 2 },
  tabLabelFocused: { color: Colors.primary, fontWeight: '700' },
});
