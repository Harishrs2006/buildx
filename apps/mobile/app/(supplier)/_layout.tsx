import { Tabs } from 'expo-router';
import { TabItem, tabBarStyle } from '../../src/components/ui';

export default function SupplierLayout() {
  return (
    <Tabs screenOptions={{ headerShown: false, tabBarStyle, tabBarShowLabel: false }}>
      <Tabs.Screen name="home" options={{ tabBarIcon: ({ focused }) => <TabItem label="Overview" icon="view-dashboard-outline" focused={focused} /> }} />
      <Tabs.Screen name="orders" options={{ tabBarIcon: ({ focused }) => <TabItem label="Orders" icon="clipboard-text-outline" focused={focused} /> }} />
      <Tabs.Screen name="products" options={{ tabBarIcon: ({ focused }) => <TabItem label="Products" icon="package-variant-closed" focused={focused} /> }} />
      <Tabs.Screen name="payouts" options={{ tabBarIcon: ({ focused }) => <TabItem label="Payouts" icon="cash-multiple" focused={focused} /> }} />
      <Tabs.Screen name="profile" options={{ tabBarIcon: ({ focused }) => <TabItem label="Profile" icon="account-circle-outline" focused={focused} /> }} />
      {/* Pushed screens, not tabs */}
      <Tabs.Screen name="weekly" options={{ href: null }} />
      <Tabs.Screen name="analytics" options={{ href: null }} />
      <Tabs.Screen name="product/add" options={{ href: null }} />
      <Tabs.Screen name="product/edit" options={{ href: null }} />
    </Tabs>
  );
}

