import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useCartStore } from '../store/cart.store';
import { Colors } from '../constants/colors';
import { Font } from '../constants/typography';
import { Icon } from './ui';

// Round ink cart button with a lime count, used in the browsing screens' headers
export function CartButton() {
  const router = useRouter();
  const count = useCartStore((s) => s.itemCount());
  return (
    <Pressable
      style={styles.btn}
      onPress={() => router.push('/(buyer)/cart' as never)}
      accessibilityRole="button"
      accessibilityLabel={count > 0 ? `Cart, ${count} items` : 'Cart'}
      hitSlop={6}
    >
      <Icon name="cart-outline" size={22} color={Colors.sand} />
      {count > 0 ? (
        <View style={styles.badge}><Text style={styles.badgeText}>{count > 99 ? '99+' : count}</Text></View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.ink, alignItems: 'center', justifyContent: 'center' },
  badge: { position: 'absolute', top: -2, right: -4, minWidth: 20, height: 20, borderRadius: 10, paddingHorizontal: 5, backgroundColor: Colors.lime, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: Colors.sand },
  badgeText: { fontFamily: Font.bold, fontSize: 10, color: Colors.ink },
});
