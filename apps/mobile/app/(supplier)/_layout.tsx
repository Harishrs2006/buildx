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

export default function SupplierLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle: styles.tabBar, tabBarShowLabel: false }}>
      <Tabs.Screen name="home" options={{ tabBarIcon: ({ focused }) => <TabIcon label="Dashboard" emoji="📊" focused={focused} /> }} />
      <Tabs.Screen name="orders" options={{ tabBarIcon: ({ focused }) => <TabIcon label="Orders" emoji="📦" focused={focused} /> }} />
      <Tabs.Screen name="products" options={{ tabBarIcon: ({ focused }) => <TabIcon label="Products" emoji="🏭" focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ tabBarIcon: ({ focused }) => <TabIcon label="Profile" emoji="👤" focused={focused} /> }} />
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
