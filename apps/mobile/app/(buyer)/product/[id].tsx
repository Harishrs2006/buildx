import { View, Text, StyleSheet, ScrollView, Pressable, FlatList, Dimensions, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { useProduct, type ProductImage } from '../../../src/hooks/useProducts';
import { useCartStore } from '../../../src/store/cart.store';
import { Colors } from '../../../src/constants/colors';
import { Font } from '../../../src/constants/typography';
import { Button, EmptyState, Eyebrow, Icon, Notice, ScreenHeader } from '../../../src/components/ui';
import { CartButton } from '../../../src/components/CartButton';
import { useAddToCart } from '../../../src/components/useAddToCart';

const { width: SCREEN_W } = Dimensions.get('window');
const rupees = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

function ImageGallery({ images }: { images: ProductImage[] }) {
  const urls = images.map((img) => img.url);
  const [active, setActive] = useState(0);

  if (urls.length === 0) {
    return (
      <View style={[gal.image, gal.empty]}>
        <Icon name="package-variant-closed" size={56} color={Colors.stone} />
      </View>
    );
  }

  return (
    <View>
      <FlatList
        data={urls}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        keyExtractor={(_, i) => String(i)}
        onMomentumScrollEnd={(e) => setActive(Math.round(e.nativeEvent.contentOffset.x / SCREEN_W))}
        renderItem={({ item }) => <Image source={{ uri: item }} style={gal.image} contentFit="cover" transition={150} />}
      />
      {urls.length > 1 ? (
        <View style={gal.dots}>
          {urls.map((_, i) => <View key={i} style={[gal.dot, i === active && gal.dotOn]} />)}
        </View>
      ) : null}
    </View>
  );
}

const gal = StyleSheet.create({
  image: { width: SCREEN_W, height: SCREEN_W * 0.8, backgroundColor: Colors.sand3 },
  empty: { alignItems: 'center', justifyContent: 'center' },
  dots: { position: 'absolute', bottom: 12, alignSelf: 'center', flexDirection: 'row', gap: 6, padding: 6, borderRadius: 999, backgroundColor: 'rgba(11,12,10,0.5)' },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: 'rgba(242,239,231,0.5)' },
  dotOn: { backgroundColor: Colors.lime, width: 18 },
});

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { data: product, isLoading, refetch } = useProduct(id);
  const { add, sheet } = useAddToCart();

  const minQty = Math.max(1, product?.minOrderQuantity ?? 1);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  // Start at the supplier's minimum order once the product has loaded
  useEffect(() => {
    if (product) setQty(Math.max(1, product.minOrderQuantity ?? 1));
  }, [product?._id]);

  const inCart = useCartStore((s) => s.items.some((i) => i.productId === id));

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={Colors.ink} style={styles.loading} />
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Product" onBack={() => router.back()} />
        <EmptyState
          icon="package-variant-remove"
          title="We could not find this product"
          body="It may have been removed by the supplier."
          action={<Button title="Try again" variant="ghost" onPress={() => refetch()} />}
        />
      </SafeAreaView>
    );
  }

  const outOfStock = product.stockQuantity <= 0;
  const maxQty = Math.max(minQty, product.stockQuantity);

  const effectivePrice = (() => {
    if (product.bulkPricing && product.bulkPricing.length > 0) {
      const tier = [...product.bulkPricing].sort((a, b) => b.minQty - a.minQty).find((t) => qty >= t.minQty);
      if (tier) return tier.price;
    }
    return product.basePrice;
  })();

  // GST-inclusive products already contain tax in their price; back it out instead of adding
  // more on top. Mirrors apps/api/src/features/orders/pricing.ts and src/store/cart.store.ts.
  const gross = effectivePrice * qty;
  const taxable = product.isGstInclusive ? gross / (1 + product.gstRate / 100) : gross;
  const gstAmount = product.isGstInclusive ? gross - taxable : gross * (product.gstRate / 100);
  const total = taxable + gstAmount;

  const specs = product.specifications ? Object.entries(product.specifications as Record<string, string>) : [];

  function handleAdd() {
    if (!product || outOfStock) return;
    if (add(product, qty)) setAdded(true);
  }

  return (
    <SafeAreaView edges={['top']} style={styles.safe}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View>
          <ImageGallery images={product.images} />
          <View style={styles.floatBar}>
            <Pressable onPress={() => router.back()} style={styles.floatBtn} hitSlop={8} accessibilityRole="button" accessibilityLabel="Back">
              <Icon name="arrow-left" size={22} />
            </Pressable>
            <CartButton />
          </View>
        </View>

        <View style={styles.body}>
          <Eyebrow>{product.categoryId?.name}</Eyebrow>
          <Text style={styles.name}>{product.name}</Text>

          <View style={styles.priceRow}>
            <Text style={styles.price}>{rupees(effectivePrice)}</Text>
            <Text style={styles.priceUnit}>/ {product.unit}</Text>
            {effectivePrice < product.basePrice ? (
              <View style={styles.bulkPill}><Text style={styles.bulkPillText}>Bulk price</Text></View>
            ) : null}
          </View>
          <Text style={styles.gstNote}>
            {product.isGstInclusive ? `Includes ${product.gstRate}% GST` : `Plus ${product.gstRate}% GST`}
          </Text>

          {product.description || product.shortDescription ? (
            <Text style={styles.description}>{product.description || product.shortDescription}</Text>
          ) : null}

          {product.bulkPricing && product.bulkPricing.length > 0 ? (
            <View style={styles.section}>
              <Eyebrow>Bulk prices</Eyebrow>
              <View style={styles.tiers}>
                {product.bulkPricing.map((tier) => {
                  const on = qty >= tier.minQty && effectivePrice === tier.price;
                  return (
                    <Pressable
                      key={tier.minQty}
                      style={[styles.tier, on && styles.tierOn]}
                      onPress={() => setQty(Math.min(maxQty, tier.minQty))}
                      accessibilityRole="button"
                      accessibilityLabel={`${tier.minQty} or more for ${rupees(tier.price)} each`}
                    >
                      <Text style={styles.tierQty}>{tier.minQty}+ {product.unit}</Text>
                      <Text style={styles.tierPrice}>{rupees(tier.price)}</Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>
          ) : null}

          <View style={styles.section}>
            <Eyebrow>Quantity</Eyebrow>
            <View style={styles.qtyRow}>
              <View style={styles.stepper}>
                <Pressable style={styles.stepBtn} onPress={() => setQty((q) => Math.max(minQty, q - 1))} accessibilityRole="button" accessibilityLabel="One less" disabled={qty <= minQty}>
                  <Icon name="minus" size={20} color={qty <= minQty ? Colors.stoneLight : Colors.ink} />
                </Pressable>
                <Text style={styles.qtyVal}>{qty}</Text>
                <Pressable style={styles.stepBtn} onPress={() => setQty((q) => Math.min(maxQty, q + 1))} accessibilityRole="button" accessibilityLabel="One more" disabled={qty >= maxQty}>
                  <Icon name="plus" size={20} color={qty >= maxQty ? Colors.stoneLight : Colors.ink} />
                </Pressable>
              </View>
              <Text style={styles.qtyUnit}>{product.unit}</Text>
            </View>
            {minQty > 1 ? <Text style={styles.hint}>Minimum order {minQty} {product.unit}</Text> : null}
            {outOfStock ? (
              <Text style={styles.warn}>Out of stock right now</Text>
            ) : product.stockQuantity < 20 ? (
              <Text style={styles.warn}>Only {product.stockQuantity} {product.unit} left</Text>
            ) : null}
          </View>

          {product.supplierId ? (
            <View style={styles.section}>
              <Eyebrow>Supplier</Eyebrow>
              <View style={styles.supplier}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{product.supplierId.businessName?.charAt(0).toUpperCase()}</Text></View>
                <View style={styles.flex}>
                  <Text style={styles.supplierName}>{product.supplierId.businessName}</Text>
                  {product.supplierId.avgRating > 0 ? (
                    <View style={styles.ratingRow}>
                      <Icon name="star" size={14} color={Colors.ink} />
                      <Text style={styles.supplierMeta}>
                        {product.supplierId.avgRating.toFixed(1)}
                        {product.supplierId.totalDeliveries ? ` · ${product.supplierId.totalDeliveries} deliveries` : ''}
                      </Text>
                    </View>
                  ) : null}
                </View>
                {product.supplierId.verificationStatus === 'VERIFIED' ? (
                  <View style={styles.verified}>
                    <Icon name="check-decagram" size={14} color={Colors.success} />
                    <Text style={styles.verifiedText}>Verified</Text>
                  </View>
                ) : null}
              </View>
            </View>
          ) : null}

          {specs.length > 0 ? (
            <View style={styles.section}>
              <Eyebrow>Specifications</Eyebrow>
              <View style={styles.specs}>
                {specs.map(([key, val], i) => (
                  <View key={key} style={[styles.specRow, i > 0 && styles.specBorder]}>
                    <Text style={styles.specKey}>{key}</Text>
                    <Text style={styles.specVal}>{val}</Text>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {product.tags && product.tags.length > 0 ? (
            <View style={[styles.section, styles.tags]}>
              {product.tags.map((tag) => <View key={tag} style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>)}
            </View>
          ) : null}
        </View>
      </ScrollView>

      {added ? (
        <Notice tone="success" title="Added to cart" onClose={() => setAdded(false)} style={styles.added}>
          <Pressable onPress={() => router.push('/(buyer)/cart' as never)} hitSlop={8} accessibilityRole="button">
            <Text style={styles.addedLink}>View cart</Text>
          </Pressable>
        </Notice>
      ) : null}

      <SafeAreaView edges={['bottom']} style={styles.stickyBar}>
        <View>
          <Text style={styles.stickyLabel}>{qty} {product.unit} · incl. GST</Text>
          <Text style={styles.stickyTotal}>{rupees(Math.round(total))}</Text>
        </View>
        <Button
          title={outOfStock ? 'Out of stock' : inCart ? 'Add more' : 'Add to cart'}
          variant="lime"
          onPress={handleAdd}
          disabled={outOfStock}
          style={styles.cta}
        />
      </SafeAreaView>
      {sheet}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.sand },
  flex: { flex: 1 },
  loading: { marginTop: 60 },
  floatBar: { position: 'absolute', top: 12, left: 16, right: 16, flexDirection: 'row', justifyContent: 'space-between' },
  floatBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.sand, alignItems: 'center', justifyContent: 'center' },
  body: { padding: 20, paddingBottom: 32 },
  name: { fontFamily: Font.display, fontSize: 28, lineHeight: 31, letterSpacing: -0.8, color: Colors.ink, marginTop: 6 },
  priceRow: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 14, flexWrap: 'wrap' },
  price: { fontFamily: Font.display, fontSize: 32, color: Colors.ink },
  priceUnit: { fontFamily: Font.regular, fontSize: 16, color: Colors.stone },
  bulkPill: { backgroundColor: Colors.lime, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3, alignSelf: 'center' },
  bulkPillText: { fontFamily: Font.semiBold, fontSize: 12, color: Colors.ink },
  gstNote: { fontFamily: Font.regular, fontSize: 14, color: Colors.stone, marginTop: 4 },
  description: { fontFamily: Font.regular, fontSize: 15, lineHeight: 22, color: Colors.ink, marginTop: 16 },
  section: { marginTop: 24 },
  tiers: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  tier: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 1, borderColor: Colors.sand4, backgroundColor: Colors.sand2 },
  tierOn: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  tierQty: { fontFamily: Font.mono, fontSize: 11, color: Colors.stone },
  tierPrice: { fontFamily: Font.bold, fontSize: 16, color: Colors.ink, marginTop: 2 },
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10 },
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: 26, borderWidth: 1, borderColor: Colors.sand4, backgroundColor: Colors.sand2 },
  stepBtn: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  qtyVal: { fontFamily: Font.display, fontSize: 20, color: Colors.ink, minWidth: 44, textAlign: 'center' },
  qtyUnit: { fontFamily: Font.regular, fontSize: 15, color: Colors.stone },
  hint: { fontFamily: Font.regular, fontSize: 13, color: Colors.stone, marginTop: 8 },
  warn: { fontFamily: Font.semiBold, fontSize: 13, color: Colors.warning, marginTop: 8 },
  supplier: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 10, padding: 14, borderRadius: 18, backgroundColor: Colors.sand2, borderWidth: 1, borderColor: Colors.sand4 },
  avatar: { width: 44, height: 44, borderRadius: 22, backgroundColor: Colors.ink, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: Font.display, fontSize: 18, color: Colors.lime },
  supplierName: { fontFamily: Font.bold, fontSize: 15, color: Colors.ink },
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  supplierMeta: { fontFamily: Font.regular, fontSize: 13, color: Colors.stone },
  verified: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: Colors.successLight, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 4 },
  verifiedText: { fontFamily: Font.semiBold, fontSize: 12, color: Colors.success },
  specs: { marginTop: 10, borderRadius: 18, backgroundColor: Colors.sand2, borderWidth: 1, borderColor: Colors.sand4, paddingHorizontal: 14 },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 16, paddingVertical: 12 },
  specBorder: { borderTopWidth: 1, borderTopColor: Colors.sand4 },
  specKey: { fontFamily: Font.regular, fontSize: 14, color: Colors.stone, flex: 1 },
  specVal: { fontFamily: Font.semiBold, fontSize: 14, color: Colors.ink, flex: 1, textAlign: 'right' },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: { borderRadius: 999, borderWidth: 1, borderColor: Colors.sand4, paddingHorizontal: 12, paddingVertical: 5 },
  tagText: { fontFamily: Font.medium, fontSize: 12, color: Colors.stone },
  added: { marginHorizontal: 16, marginBottom: 8 },
  addedLink: { fontFamily: Font.bold, fontSize: 14, color: Colors.ink, textDecorationLine: 'underline', marginTop: 2 },
  stickyBar: { flexDirection: 'row', alignItems: 'center', gap: 16, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12, backgroundColor: Colors.ink, borderTopLeftRadius: 24, borderTopRightRadius: 24 },
  stickyLabel: { fontFamily: Font.mono, fontSize: 11, letterSpacing: 0.5, color: 'rgba(242,239,231,0.6)' },
  stickyTotal: { fontFamily: Font.display, fontSize: 22, color: Colors.sand },
  cta: { flex: 1 },
});
