import { Tabs } from 'expo-router';
import { TabItem, tabBarStyle } from '../../src/components/ui';

export default function SupplierLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle, tabBarShowLabel: false }}>
      <Tabs.Screen name="home" options={{ tabBarIcon: ({ focused }) => <TabItem label="Overview" icon="view-dashboard-outline" focused={focused} /> }} />
      <Tabs.Screen name="orders" options={{ tabBarIcon: ({ focused }) => <TabItem label="Orders" icon="clipboard-text-outline" focused={focused} /> }} />
      <Tabs.Screen name="products" options={{ tabBarIcon: ({ focused }) => <TabItem label="Products" icon="package-variant-closed" focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ tabBarIcon: ({ focused }) => <TabItem label="Profile" icon="account-circle-outline" focused={focused} /> }} />
    </Tabs>
  );
}

