import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Image, FlatList, Dimensions, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState, useRef } from 'react';
import { useProduct, getProductImageUrl, type ProductImage } from '../../../src/hooks/useProducts';
import { useCartStore } from '../../../src/store/cart.store';
import { Colors } from '../../../src/constants/colors';

const { width: SCREEN_W } = Dimensions.get('window');

function ImageGallery({ images }: { images: ProductImage[] }) {
  const urls = images.map((img) => img.url);
  const [active, setActive] = useState(0);
  const ref = useRef<FlatList>(null);

  if (!urls || urls.length === 0) {
    return (
      <View style={galStyles.placeholder}>
        <Text style={{ fontSize: 64 }}>🏗️</Text>
      </View>
    );
  }

  return (
    <View>
      <FlatList
        ref={ref}
        data={urls}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={(e) => {
          setActive(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W));
        }}
        renderItem={({ item }) => (
          <Image source={{ uri: item }} style={galStyles.image} resizeMode="cover" />
        )}
      />
      {urls.length > 1 && (
        <View style={galStyles.dots}>
          {urls.map((_, i) => (
            <View key={i} style={[galStyles.dot, i === active && galStyles.dotActive]} />
          ))}
        </View>
      )}
    </View>
  );
}

const galStyles = StyleSheet.create({
  placeholder: { width: SCREEN_W, height: 280, backgroundColor: Colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  image: { width: SCREEN_W, height: 280 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6, paddingVertical: 10 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: Colors.border },
  dotActive: { backgroundColor: Colors.primary, width: 18 },
});

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: product, isLoading } = useProduct(id);

  const minQty = product?.minOrderQuantity ?? 1;
  const [qty, setQty] = useState(minQty);
  const addItem = useCartStore((s) => s.addItem);
  const cartItems = useCartStore((s) => s.items);
  const cartCount = useCartStore((s) => s.itemCount());
  const inCart = cartItems.some((i) => i.productId === id);
  const outOfStock = (product?.stockQuantity ?? 1) === 0;

  function handleAddToCart() {
    if (!product || outOfStock) return;
    addItem({
      productId: product._id,
      name: product.name,
      image: getProductImageUrl(product.images),
      unit: product.unit,
      basePrice: product.basePrice,
      gstRate: product.gstRate,
      supplierId: product.supplierId?._id ?? '',
      supplierName: product.supplierId?.businessName ?? '',
    }, qty);
    Alert.alert('Added to cart', `${qty} × ${product.unit} of ${product.name}`, [
      { text: 'Continue shopping', style: 'cancel' },
      { text: 'View cart', onPress: () => router.push('/(buyer)/cart' as never) },
    ]);
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.errorText}>Product not found.</Text>
          <TouchableOpacity onPress={() => router.back()}><Text style={{ color: Colors.primary, marginTop: 12 }}>Go back</Text></TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const effectivePrice = (() => {
    if (product.bulkPricing && product.bulkPricing.length > 0) {
      const tier = [...product.bulkPricing]
        .sort((a, b) => b.minQty - a.minQty)
        .find((t) => qty >= t.minQty);
      if (tier) return tier.price;
    }
    return product.basePrice;
  })();

  const lineTotal = effectivePrice * qty;
  const gstAmount = lineTotal * (product.gstRate / 100);

  const specs = product.specifications
    ? Object.entries(product.specifications as Record<string, string>)
    : [];

  return (
    <SafeAreaView style={styles.safe}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.cartBtn} onPress={() => router.push('/(buyer)/cart' as never)}>
          <Text style={styles.cartIcon}>🛒</Text>
          {cartCount > 0 && (
            <View style={styles.cartBadge}><Text style={styles.cartBadgeText}>{cartCount}</Text></View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <ImageGallery images={product.images} />

        <View style={styles.body}>
          {/* Category + name */}
          <Text style={styles.category}>{product.categoryId?.name}</Text>
          <Text style={styles.name}>{product.name}</Text>

          {/* Price */}
          <View style={styles.priceBlock}>
            <Text style={styles.price}>₹{effectivePrice.toLocaleString('en-IN')}</Text>
            <Text style={styles.priceUnit}>/ {product.unit}</Text>
            {effectivePrice < product.basePrice && (
              <View style={styles.saveBadge}>
                <Text style={styles.saveText}>Bulk price applied</Text>
              </View>
            )}
          </View>
          <Text style={styles.gstNote}>+ ₹{gstAmount.toFixed(0)} GST ({product.gstRate}%) on {qty} {product.unit}</Text>

          {/* Bulk pricing tiers */}
          {product.bulkPricing && product.bulkPricing.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Bulk Pricing</Text>
              <View style={styles.tiersRow}>
                {product.bulkPricing.map((tier) => (
                  <View key={tier.minQty} style={[styles.tierCard, qty >= tier.minQty && styles.tierCardActive]}>
                    <Text style={styles.tierQty}>{tier.minQty}+ {product.unit}</Text>
                    <Text style={styles.tierPrice}>₹{tier.price.toLocaleString('en-IN')}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Quantity selector */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quantity</Text>
            <View style={styles.qtyRow}>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => setQty((q) => Math.max(minQty, q - 1))}>
                <Text style={styles.qtyBtnText}>−</Text>
              </TouchableOpacity>
              <Text style={styles.qtyVal}>{qty}</Text>
              <TouchableOpacity style={styles.qtyBtn} onPress={() => setQty((q) => Math.min(product.stockQuantity, q + 1))}>
                <Text style={styles.qtyBtnText}>+</Text>
              </TouchableOpacity>
              <Text style={styles.qtyUnit}>{product.unit}s</Text>
              <Text style={styles.qtyTotal}>= ₹{lineTotal.toLocaleString('en-IN')}</Text>
            </View>
            {product.stockQuantity < 20 && (
              <Text style={styles.stockWarn}>Only {product.stockQuantity} {product.unit}s left</Text>
            )}
          </View>

          {/* Supplier card */}
          {product.supplierId && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Supplier</Text>
              <View style={styles.supplierCard}>
                <View style={styles.supplierAvatar}>
                  <Text style={styles.supplierAvatarText}>
                    {product.supplierId.businessName?.charAt(0).toUpperCase()}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.supplierName}>{product.supplierId.businessName}</Text>
                  {product.supplierId.avgRating > 0 && (
                    <Text style={styles.supplierRating}>
                      ⭐ {product.supplierId.avgRating.toFixed(1)} · {product.supplierId.totalDeliveries ?? 0} deliveries
                    </Text>
                  )}
                </View>
                {product.supplierId.verificationStatus === 'VERIFIED' && (
                  <View style={styles.verifiedBadge}><Text style={styles.verifiedText}>✓ Verified</Text></View>
                )}
              </View>
            </View>
          )}

          {/* Specs */}
          {specs.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Specifications</Text>
              {specs.map(([key, val]) => (
                <View key={key} style={styles.specRow}>
                  <Text style={styles.specKey}>{key}</Text>
                  <Text style={styles.specVal}>{val}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Tags */}
          {product.tags && product.tags.length > 0 && (
            <View style={[styles.section, styles.tagsRow]}>
              {product.tags.map((tag) => (
                <View key={tag} style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>
              ))}
            </View>
          )}

          <View style={{ height: 100 }} />
        </View>
      </ScrollView>

      {/* Sticky Add to Cart */}
      <View style={styles.stickyBar}>
        <View style={styles.stickyTotal}>
          <Text style={styles.stickyTotalLabel}>Total incl. GST</Text>
          <Text style={styles.stickyTotalValue}>₹{(lineTotal + gstAmount).toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
        </View>
        <TouchableOpacity
          style={[styles.addToCartBtn, inCart && styles.addToCartBtnActive, outOfStock && styles.addToCartBtnDisabled]}
          onPress={handleAddToCart}
          activeOpacity={0.85}
          disabled={outOfStock}
        >
          <Text style={styles.addToCartText}>
            {outOfStock ? 'Out of Stock' : inCart ? '+ Add More' : 'Add to Cart'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  errorText: { fontSize: 16, color: Colors.textSecondary },
  topBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 18, color: Colors.text },
  cartBtn: { position: 'relative', width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.9)', alignItems: 'center', justifyContent: 'center' },
  cartIcon: { fontSize: 18 },
  cartBadge: { position: 'absolute', top: -2, right: -2, backgroundColor: Colors.primary, borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center' },
  cartBadgeText: { fontSize: 9, fontWeight: '700', color: '#fff' },
  body: { paddingHorizontal: 20, paddingTop: 16 },
  category: { fontSize: 12, color: Colors.textMuted, fontWeight: '600', marginBottom: 4 },
  name: { fontSize: 20, fontWeight: '800', color: Colors.text, lineHeight: 26, marginBottom: 14 },
  priceBlock: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 4 },
  price: { fontSize: 28, fontWeight: '800', color: Colors.primary },
  priceUnit: { fontSize: 14, color: Colors.textSecondary },
  saveBadge: { backgroundColor: Colors.successLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  saveText: { fontSize: 11, fontWeight: '700', color: Colors.success },
  gstNote: { fontSize: 12, color: Colors.textMuted, marginBottom: 20 },
  section: { marginBottom: 22 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  tiersRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  tierCard: { borderWidth: 1, borderColor: Colors.border, borderRadius: 10, padding: 10, alignItems: 'center', minWidth: 80, backgroundColor: Colors.surfaceAlt },
  tierCardActive: { borderColor: Colors.primary, backgroundColor: '#FFF7ED' },
  tierQty: { fontSize: 11, color: Colors.textSecondary, marginBottom: 4 },
  tierPrice: { fontSize: 14, fontWeight: '700', color: Colors.text },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  qtyBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 18, color: Colors.primary, fontWeight: '700', lineHeight: 22 },
  qtyVal: { fontSize: 20, fontWeight: '800', color: Colors.text, minWidth: 28, textAlign: 'center' },
  qtyUnit: { fontSize: 14, color: Colors.textSecondary },
  qtyTotal: { marginLeft: 'auto', fontSize: 15, fontWeight: '700', color: Colors.text },
  stockWarn: { fontSize: 12, color: Colors.warning, marginTop: 8, fontWeight: '600' },
  supplierCard: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, backgroundColor: Colors.surfaceAlt, borderRadius: 12, borderWidth: 1, borderColor: Colors.border },
  supplierAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.primary, alignItems: 'center', justifyContent: 'center' },
  supplierAvatarText: { fontSize: 16, fontWeight: '700', color: '#fff' },
  supplierName: { fontSize: 14, fontWeight: '700', color: Colors.text },
  supplierRating: { fontSize: 12, color: Colors.textSecondary, marginTop: 2 },
  verifiedBadge: { backgroundColor: Colors.successLight, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  verifiedText: { fontSize: 11, fontWeight: '700', color: Colors.success },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.border },
  specKey: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  specVal: { fontSize: 13, fontWeight: '600', color: Colors.text, flex: 1, textAlign: 'right' },
  tagsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { backgroundColor: Colors.surfaceAlt, borderWidth: 1, borderColor: Colors.border, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  tagText: { fontSize: 12, color: Colors.textSecondary },
  stickyBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.border, backgroundColor: Colors.surface, gap: 16 },
  stickyTotal: { flex: 1 },
  stickyTotalLabel: { fontSize: 11, color: Colors.textMuted },
  stickyTotalValue: { fontSize: 18, fontWeight: '800', color: Colors.text },
  addToCartBtn: { backgroundColor: Colors.primary, borderRadius: 14, paddingHorizontal: 28, paddingVertical: 15 },
  addToCartBtnActive: { backgroundColor: Colors.primaryDark },
  addToCartBtnDisabled: { backgroundColor: Colors.border },
  addToCartText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
