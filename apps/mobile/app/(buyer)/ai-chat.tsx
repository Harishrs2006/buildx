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
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRef, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Colors } from '../../src/constants/colors';
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
          <Text style={styles.optionDelivery}>🕐 {opt.deliveryDays}d</Text>
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
        <Text style={styles.assistantBadgeText}>🤖 BuildX AI</Text>
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
        <Text style={styles.addAllBtnText}>🛒  Add Selected to Cart</Text>
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
          <Text style={styles.avatarEmoji}>🤖</Text>
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
        <Text style={styles.avatarEmoji}>🤖</Text>
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
      Alert.alert('Permission needed', 'Allow access to your photos to upload a materials list.');
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
      Alert.alert('Error', 'Could not read image. Please try again.');
      return;
    }
    const mime = asset.mimeType ?? 'image/jpeg';
    await analyzeImage(asset.base64, mime, asset.uri);
  }

  async function handleCamera() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Allow camera access to take a photo of your materials list.');
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
    const count = addSelectedToCart(msg);
    if (count === 0) {
      Alert.alert('Nothing added', 'No valid items selected or quantities missing.');
      return;
    }
    Alert.alert(
      `${count} item${count > 1 ? 's' : ''} added to cart`,
      'Continue shopping or go to cart to place your order.',
      [
        { text: 'Continue', style: 'cancel' },
        { text: 'View Cart', onPress: () => router.push('/(buyer)/cart') },
      ]
    );
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
              <Text style={styles.cartBtnText}>🛒 {cartCount}</Text>
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

        {/* Upload hint strip */}
        <View style={styles.uploadHint}>
          <Text style={styles.uploadHintText}>📸 Upload your materials list for instant price comparison</Text>
        </View>

        {/* Input bar */}
        <View style={styles.inputBar}>
          <TouchableOpacity style={styles.iconBtn} onPress={handleCamera} disabled={loading}>
            <Text style={styles.iconBtnText}>📷</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconBtn} onPress={handlePickImage} disabled={loading}>
            <Text style={styles.iconBtnText}>🖼️</Text>
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
            <Text style={styles.sendBtnText}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.surfaceAlt },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: 16, fontWeight: '700', color: Colors.text },
  headerSub: { fontSize: 12, color: Colors.textMuted, marginTop: 1 },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cartBtn: {
    backgroundColor: Colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  cartBtnText: { fontSize: 13, fontWeight: '700', color: Colors.primaryDark },
  clearBtn: { fontSize: 13, color: Colors.textMuted },

  messageList: { padding: 12, paddingBottom: 8 },

  bubbleRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end', gap: 6 },
  bubbleRowRight: { justifyContent: 'flex-end' },

  avatarDot: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: Colors.primaryLight,
    alignItems: 'center', justifyContent: 'center',
  },
  avatarEmoji: { fontSize: 14 },

  bubble: { maxWidth: '78%', borderRadius: 16, padding: 10 },
  userBubble: { backgroundColor: Colors.primary, borderBottomRightRadius: 4 },
  assistantBubble: { backgroundColor: Colors.surface, borderBottomLeftRadius: 4, elevation: 1 },
  bubbleText: { fontSize: 14, lineHeight: 20 },
  userBubbleText: { color: Colors.textInverse },
  assistantBubbleText: { color: Colors.text },

  typingBubble: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  typingText: { fontSize: 13, color: Colors.textMuted },

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
  assistantBadgeText: { fontSize: 11, fontWeight: '700', color: Colors.primaryDark },
  priceListSummary: { fontSize: 13, color: Colors.textSecondary, marginBottom: 12 },

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
  priceItemName: { fontSize: 14, fontWeight: '700', color: Colors.text, flex: 1 },
  priceItemQty: { fontSize: 13, color: Colors.textSecondary, marginLeft: 8 },
  notFound: { fontSize: 13, color: Colors.textMuted, fontStyle: 'italic' },

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
  optionRowSelected: { borderColor: Colors.primary, backgroundColor: '#FFF7ED' },
  radio: {
    width: 18, height: 18, borderRadius: 9,
    borderWidth: 2, borderColor: Colors.borderStrong,
    alignItems: 'center', justifyContent: 'center',
  },
  radioSelected: { borderColor: Colors.primary },
  radioDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: Colors.primary },

  optionInfo: { flex: 1 },
  optionName: { fontSize: 13, fontWeight: '600', color: Colors.text },
  optionSupplier: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  optionMeta: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 },
  optionDelivery: { fontSize: 11, color: Colors.textSecondary },
  outOfStock: { fontSize: 11, color: Colors.error, fontWeight: '600' },

  optionPriceCol: { alignItems: 'flex-end' },
  optionPrice: { fontSize: 14, fontWeight: '700', color: Colors.text },
  optionUnit: { fontSize: 10, color: Colors.textMuted },
  optionTotal: { fontSize: 11, color: Colors.textSecondary, marginTop: 2 },

  addAllBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  addAllBtnText: { color: Colors.textInverse, fontWeight: '700', fontSize: 14 },

  uploadHint: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.primaryLight,
  },
  uploadHintText: { fontSize: 12, color: Colors.primaryDark, textAlign: 'center' },

  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 8,
    paddingBottom: Platform.OS === 'ios' ? 20 : 8,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 6,
  },
  iconBtn: {
    width: 38, height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconBtnText: { fontSize: 18 },
  input: {
    flex: 1,
    minHeight: 38,
    maxHeight: 100,
    backgroundColor: Colors.surfaceAlt,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 19,
    paddingHorizontal: 14,
    paddingVertical: 9,
    fontSize: 14,
    color: Colors.text,
  },
  sendBtn: {
    width: 38, height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: { backgroundColor: Colors.border },
  sendBtnText: { color: Colors.textInverse, fontSize: 18, fontWeight: '700' },
});
