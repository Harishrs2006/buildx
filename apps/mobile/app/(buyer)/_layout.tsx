import { Tabs } from 'expo-router';
import { TabItem, tabBarStyle } from '../../src/components/ui';

export default function BuyerLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="home"
        options={{ tabBarIcon: ({ focused }) => <TabItem label="Home" focused={focused} /> }}
      />
      <Tabs.Screen
        name="orders"
        options={{ tabBarIcon: ({ focused }) => <TabItem label="Orders" focused={focused} /> }}
      />
      <Tabs.Screen
        name="ai-chat"
        options={{ tabBarIcon: ({ focused }) => <TabItem label="AI Chat" focused={focused} /> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ tabBarIcon: ({ focused }) => <TabItem label="Profile" focused={focused} /> }}
      />
      {/* Non-tab screens — hidden from tab bar */}
      <Tabs.Screen name="products" options={{ href: null }} />
      <Tabs.Screen name="search" options={{ href: null }} />
      <Tabs.Screen name="product" options={{ href: null }} />
      <Tabs.Screen name="cart" options={{ href: null }} />
    </Tabs>
  );
}

