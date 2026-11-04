import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Colors } from '../../src/constants/colors';
import { Font } from '../../src/constants/typography';
import { SthivaMark, Icon, Notice } from '../../src/components/ui';
import { useAiChat, ChatMessage, AnalysedItem, PriceOption } from '../../src/hooks/useAiChat';
import { useCartStore } from '../../src/store/cart.store';

// ─── Price list card ────────────────────────────────────────────────────────

function OptionRow({
  opt,
  selected,
  onSelect,
}: {
  opt: PriceOption;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.optionRow, selected && styles.optionRowSelected]}
      onPress={onSelect}
      activeOpacity={0.75}
    >
      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioDot} />}
      </View>
      <View style={styles.optionInfo}>
        <Text style={styles.optionName} numberOfLines={1}>{opt.name}</Text>
        <Text style={styles.optionSupplier}>{opt.supplier}</Text>
        <View style={styles.optionMeta}>
          <View style={styles.inlineRow}><Icon name="clock-outline" size={13} color={Colors.stone} /><Text style={styles.optionDelivery}>{opt.deliveryDays} day{opt.deliveryDays === 1 ? '' : 's'}</Text></View>
          {!opt.inStock && <Text style={styles.outOfStock}>Out of stock</Text>}
        </View>
      </View>
      <View style={styles.optionPriceCol}>
        <Text style={styles.optionPrice}>₹{opt.pricePerUnit.toLocaleString('en-IN')}</Text>
        <Text style={styles.optionUnit}>/{opt.unit}</Text>
        {opt.totalWithGst > 0 && (
          <Text style={styles.optionTotal}>₹{opt.totalWithGst.toLocaleString('en-IN')} total</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

function PriceItemCard({
  item,
  itemIndex,
  messageId,
  onSelectOption,
}: {
  item: AnalysedItem;
  itemIndex: number;
  messageId: string;
  onSelectOption: (itemIndex: number, optionIndex: number) => void;
}) {
  const selected = item.selectedOptionIndex ?? 0;

  return (
    <View style={styles.priceItemCard}>
      <View style={styles.priceItemHeader}>
        <Text style={styles.priceItemName}>{item.requested}</Text>
        {item.quantity != null && (
          <Text style={styles.priceItemQty}>
            {item.quantity} {item.unit ?? ''}
          </Text>
        )}
      </View>
      {item.notFound ? (
        <Text style={styles.notFound}>Not found in catalogue</Text>
      ) : (
        item.options.map((opt, oi) => (
          <OptionRow
            key={opt.productId}
            opt={opt}
            selected={selected === oi}
            onSelect={() => onSelectOption(itemIndex, oi)}
          />
        ))
      )}
    </View>
  );
}

function PriceListBubble({
  msg,
  onSelectOption,
  onAddToCart,
}: {
  msg: Extract<ChatMessage, { type: 'price_list' }>;
  onSelectOption: (messageId: string, itemIndex: number, optionIndex: number) => void;
  onAddToCart: (msg: Extract<ChatMessage, { type: 'price_list' }>) => void;
}) {
  return (
    <View style={styles.priceListContainer}>
      <View style={styles.assistantBadge}>
        <View style={styles.inlineRow}><SthivaMark size={16} /><Text style={styles.assistantBadgeText}>Sthiva assistant</Text></View>
      </View>
      <Text style={styles.priceListSummary}>{msg.summary}</Text>
      {msg.items.map((item, idx) => (
        <PriceItemCard
          key={`${msg.id}-item-${idx}`}
          item={item}
          itemIndex={idx}
          messageId={msg.id}
          onSelectOption={(ii, oi) => onSelectOption(msg.id, ii, oi)}
        />
      ))}
      <TouchableOpacity
        style={styles.addAllBtn}
        onPress={() => onAddToCart(msg)}
        activeOpacity={0.85}
      >
        <View style={styles.inlineRow}><Icon name="cart-plus" size={18} color={Colors.ink} /><Text style={styles.addAllBtnText}>Add selected to cart</Text></View>
      </TouchableOpacity>
    </View>
  );
}

// ─── Message bubble ──────────────────────────────────────────────────────────

function MessageBubble({
  msg,
  onSelectOption,
  onAddToCart,
}: {
  msg: ChatMessage;
  onSelectOption: (messageId: string, itemIndex: number, optionIndex: number) => void;
  onAddToCart: (msg: Extract<ChatMessage, { type: 'price_list' }>) => void;
}) {
  if (msg.type === 'price_list') {
    return (
      <PriceListBubble msg={msg} onSelectOption={onSelectOption} onAddToCart={onAddToCart} />
    );
  }

  if (msg.type === 'image') {
    return (
      <View style={[styles.bubble, styles.userBubble]}>
        <Image source={{ uri: msg.uri }} style={styles.imagePreview} resizeMode="cover" />
        {msg.caption && <Text style={[styles.bubbleText, styles.userBubbleText]}>{msg.caption}</Text>}
      </View>
    );
  }

  const isUser = msg.role === 'user';
  return (
    <View style={[styles.bubbleRow, isUser && styles.bubbleRowRight]}>
      {!isUser && (
        <View style={styles.avatarDot}>
          <SthivaMark size={22} tile />
        </View>
      )}
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.assistantBubble]}>
        <Text style={[styles.bubbleText, isUser ? styles.userBubbleText : styles.assistantBubbleText]}>
          {msg.content}
        </Text>
      </View>
    </View>
  );
}

// ─── Typing indicator ────────────────────────────────────────────────────────

function TypingIndicator() {
  return (
    <View style={styles.bubbleRow}>
      <View style={styles.avatarDot}>
        <SthivaMark size={22} tile />
      </View>
      <View style={[styles.bubble, styles.assistantBubble, styles.typingBubble]}>
        <ActivityIndicator size="small" color={Colors.textMuted} />
        <Text style={styles.typingText}>Thinking…</Text>
      </View>
    </View>
  );
}

// ─── Main screen ─────────────────────────────────────────────────────────────

export default function AiChatScreen() {
  const { messages, loading, sendMessage, analyzeImage, selectOption, addSelectedToCart, clearChat } =
    useAiChat();
  const [inputText, setInputText] = useState('');
  const [notice, setNotice] = useState<{ tone: 'error' | 'success' | 'info'; text: string; cart?: boolean } | null>(null);
  const flatRef = useRef<FlatList>(null);
  const cartCount = useCartStore((s) => s.itemCount());

  function handleSend() {
    if (!inputText.trim()) return;
    sendMessage(inputText.trim());
    setInputText('');
  }

  async function handlePickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setNotice({ tone: 'info', text: 'Allow photo access in your phone settings to upload a materials list.' });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.8,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (!asset.base64) {
      setNotice({ tone: 'error', text: 'We could not read that image. Please try another photo.' });
      return;
    }
    const mime = asset.mimeType ?? 'image/jpeg';
    await analyzeImage(asset.base64, mime, asset.uri);
  }

  async function handleCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setNotice({ tone: 'info', text: 'Allow camera access in your phone settings to photograph a materials list.' });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      quality: 0.8,
      base64: true,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    if (!asset.base64) return;
    await analyzeImage(asset.base64, asset.mimeType ?? 'image/jpeg', asset.uri);
  }

  function handleAddToCart(msg: Extract<ChatMessage, { type: 'price_list' }>) {
    const r = addSelectedToCart(msg);
    if (r.status === 'nothing') {
      setNotice({ tone: 'info', text: 'Nothing was added. Pick an option and check the quantities first.' });
    } else if (r.status === 'mixed') {
      setNotice({
        tone: 'info',
        text: `One order comes from one supplier. Your picks are from ${r.suppliers.join(' and ')}. Choose options from one supplier, then order the rest separately.`,
      });
    } else if (r.status === 'cart_conflict') {
      setNotice({
        tone: 'info',
        text: `Your cart already has items from ${r.cartSupplier}. Place that order or empty your cart before adding items from ${r.supplier}.`,
        cart: true,
      });
    } else {
      setNotice({ tone: 'success', text: `${r.count} item${r.count > 1 ? 's' : ''} added to your cart.`, cart: true });
    }
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>AI Materials Assistant</Text>
          <Text style={styles.headerSub}>Compare prices · Order instantly</Text>
        </View>
        <View style={styles.headerRight}>
          {cartCount > 0 && (
            <TouchableOpacity style={styles.cartBtn} onPress={() => router.push('/(buyer)/cart')}>
              <View style={styles.inlineRow}><Icon name="cart-outline" size={18} color={Colors.sand} /><Text style={styles.cartBtnText}>{cartCount}</Text></View>
            </TouchableOpacity>
          )}
          <TouchableOpacity onPress={clearChat}>
            <Text style={styles.clearBtn}>Clear</Text>
          </TouchableOpacity>
        </View>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <FlatList
          ref={flatRef}
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
          ListFooterComponent={loading ? <TypingIndicator /> : null}
          renderItem={({ item }) => (
            <MessageBubble
              msg={item}
              onSelectOption={selectOption}
              onAddToCart={handleAddToCart}
            />
          )}
        />

        {notice ? (
          <Notice tone={notice.tone} onClose={() => setNotice(null)} style={styles.notice}>
            <Text style={styles.noticeText}>{notice.text}</Text>
            {notice.cart ? (
              <TouchableOpacity onPress={() => router.push('/(buyer)/cart')} accessibilityRole="button">
                <Text style={styles.noticeLink}>View cart</Text>
              </TouchableOpacity>
            ) : null}
          </Notice>
        ) : null}

        {/* Upload hint strip */}
        <View style={styles.uploadHint}>
          <View style={styles.inlineRow}><Icon name="camera-outline" size={16} color={Colors.ink} /><Text style={styles.uploadHintText}>Photograph your materials list to compare supplier prices</Text></View>
        </View>

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleCamera} disabled={loading}>
            <Icon name="camera-outline" size={22} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={handlePickImage} disabled={loading}>
            <Icon name="image-outline" size={22} />
          </TouchableOpacity>
          <TextInput
            style={styles.input}
            placeholder="Ask about materials, prices..."
            placeholderTextColor={Colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={500}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            editable={!loading}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || loading) && styles.sendBtnDisabled]}
            onPress={handleSend}
            disabled={!inputText.trim() || loading}
          >
            <Icon name="arrow-up" size={22} color={Colors.ink} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  inlineRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  notice: { marginHorizontal: 12, marginBottom: 8 },
  noticeText: { fontFamily: Font.regular, fontSize: 14, lineHeight: 20, color: Colors.ink },
  noticeLink: { fontFamily: Font.bold, fontSize: 14, color: Colors.ink, textDecorationLine: 'underline', marginTop: 4 },
  container: { flex: 1, backgroundColor: Colors.sand },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.sand,
    borderBottomWidth: 1,
    borderBottomColor: Colors.sand4,
  },
  headerTitle: { fontFamily: Font.display, fontSize: 22, letterSpacing: -0.5, color: Colors.ink },
  headerSub: { fontFamily: Font.mono, fontSize: 11, letterSpacing: 0.5, color: Colors.stone, marginTop: 2 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cartBtn: {
    backgroundColor: Colors.ink,
    paddingHorizontal: 12,
    height: 36,
    justifyContent: 'center',
    borderRadius: 18,
  },
  cartBtnText: { fontFamily: Font.bold, fontSize: 13, color: Colors.sand },
  clearBtn: { fontFamily: Font.semiBold, fontSize: 14, color: Colors.stone },

  messageList: { padding: 12, paddingBottom: 8 },

  bubbleRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end', gap: 6 },
  bubbleRowRight: { justifyContent: 'flex-end' },

  avatarDot: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarEmoji: { fontFamily: Font.regular, fontSize: 14 },

  bubble: { maxWidth: '78%', borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  userBubble: { backgroundColor: Colors.ink, borderBottomRightRadius: 4 },
  assistantBubble: { backgroundColor: Colors.sand2, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: Colors.sand4 },
  bubbleText: { fontFamily: Font.regular, fontSize: 15, lineHeight: 21 },
  userBubbleText: { color: Colors.sand },
  assistantBubbleText: { color: Colors.text },

  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typingText: { fontFamily: Font.regular, fontSize: 13, color: Colors.textMuted },

  imagePreview: { width: 200, height: 150, borderRadius: 8, marginBottom: 4 },

  // Price list
  priceListContainer: {
    marginBottom: 16,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 12,
    elevation: 2,
  },
  assistantBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 8,
  },
  assistantBadgeText: { fontFamily: Font.bold, fontSize: 11, color: Colors.primaryDark },
  priceListSummary: { fontFamily: Font.regular, fontSize: 13, color: Colors.textSecondary, marginBottom: 12 },

  priceItemCard: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    padding: 10,
    marginBottom: 8,
    backgroundColor: Colors.surfaceAlt,
  },
  priceItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  priceItemName: { fontFamily: Font.bold, fontSize: 14, color: Colors.text, flex: 1 },
  priceItemQty: { fontFamily: Font.regular, fontSize: 13, color: Colors.textSecondary, marginLeft: 8 },
  notFound: { fontFamily: Font.regular, fontSize: 13, color: Colors.textMuted },

  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    marginBottom: 4,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.border,
    gap: 8,
  },
  optionRowSelected: { borderColor: Colors.primary, backgroundColor: Colors.primaryLight },
  radio: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: Colors.borderStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: Colors.primary },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },

  optionInfo: { flex: 1 },
  optionName: { fontFamily: Font.semiBold, fontSize: 13, color: Colors.text },
  optionSupplier: { fontFamily: Font.regular, fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  optionMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  optionDelivery: { fontFamily: Font.regular, fontSize: 11, color: Colors.textSecondary },
  outOfStock: { fontFamily: Font.semiBold, fontSize: 11, color: Colors.error },

  optionPriceCol: { alignItems: 'flex-end' },
  optionPrice: { fontFamily: Font.bold, fontSize: 14, color: Colors.text },
  optionUnit: { fontFamily: Font.regular, fontSize: 10, color: Colors.textMuted },
  optionTotal: { fontFamily: Font.regular, fontSize: 11, color: Colors.textSecondary, marginTop: 2 },

  addAllBtn: {
    backgroundColor: Colors.lime,
    borderRadius: 26,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  addAllBtnText: { fontFamily: Font.bold, color: Colors.ink, fontSize: 15 },

  uploadHint: {
    backgroundColor: Colors.limeSoft,
    paddingHorizontal: 16,
    paddingVertical: 8,
    alignItems: 'center',
  },
  uploadHintText: { fontFamily: Font.medium, fontSize: 12, color: Colors.ink, textAlign: 'center' },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    backgroundColor: Colors.sand,
    borderTopWidth: 1,
    borderTopColor: Colors.sand4,
    gap: 6,
  },
  iconBtn: {
    width: 42, height: 42,
    borderRadius: 21,
    backgroundColor: Colors.sand2,
    borderWidth: 1,
    borderColor: Colors.sand4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: { fontFamily: Font.regular, fontSize: 18 },
  input: { fontFamily: Font.regular, flex: 1,
    minHeight: 42,
    maxHeight: 110,
    backgroundColor: Colors.sand2,
    borderWidth: 1.5,
    borderColor: Colors.sand4,
    borderRadius: 21,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 15,
    color: Colors.ink },
  sendBtn: {
    width: 42, height: 42,
    borderRadius: 21,
    backgroundColor: Colors.lime,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.sand3 },
  sendBtnText: { fontFamily: Font.bold, color: Colors.textInverse, fontSize: 18 },
});
