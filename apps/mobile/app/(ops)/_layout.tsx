import { Tabs } from 'expo-router';
import { TabItem, tabBarStyle } from '../../src/components/ui';

// Operations panel for OPERATOR / ADMIN accounts
export default function OpsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle, tabBarShowLabel: false }}>
      <Tabs.Screen name="attention" options={{ tabBarIcon: ({ focused }) => <TabItem label="Attention" focused={focused} /> }} />
      <Tabs.Screen name="orders" options={{ tabBarIcon: ({ focused }) => <TabItem label="Orders" focused={focused} /> }} />
      <Tabs.Screen name="suppliers" options={{ tabBarIcon: ({ focused }) => <TabItem label="Suppliers" focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ tabBarIcon: ({ focused }) => <TabItem label="Profile" focused={focused} /> }} />
      <Tabs.Screen name="order/[id]" options={{ href: null }} />
    </Tabs>
  );
}

