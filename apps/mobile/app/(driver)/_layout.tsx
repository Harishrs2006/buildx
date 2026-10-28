import { Tabs } from 'expo-router';
import { TabItem, tabBarStyle } from '../../src/components/ui';

export default function DriverLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle, tabBarShowLabel: false }}>
      <Tabs.Screen name="available" options={{ tabBarIcon: ({ focused }) => <TabItem label="Available" focused={focused} /> }} />
      <Tabs.Screen name="deliveries" options={{ tabBarIcon: ({ focused }) => <TabItem label="Deliveries" focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ tabBarIcon: ({ focused }) => <TabItem label="Profile" focused={focused} /> }} />
    </Tabs>
  );
}

