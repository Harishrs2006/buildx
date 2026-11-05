import { Tabs } from 'expo-router';
import { TabItem, tabBarStyle } from '../../src/components/ui';

export default function DriverLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle, tabBarShowLabel: false }}>
      <Tabs.Screen name="available" options={{ tabBarIcon: ({ focused }) => <TabItem label="Available" icon="truck-fast-outline" focused={focused} /> }} />
      <Tabs.Screen name="deliveries" options={{ tabBarIcon: ({ focused }) => <TabItem label="Deliveries" icon="map-marker-path" focused={focused} /> }} />
      <Tabs.Screen name="payouts" options={{ tabBarIcon: ({ focused }) => <TabItem label="Payouts" icon="cash-multiple" focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ tabBarIcon: ({ focused }) => <TabItem label="Profile" icon="account-circle-outline" focused={focused} /> }} />
      {/* Pushed screen, not a tab */}
      <Tabs.Screen name="order/[id]" options={{ href: null }} />
    </Tabs>
  );
}

