import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useSubmitReview, useOrderReview } from '../../../src/hooks/useReviews';
import { Colors } from '../../../src/constants/colors';

const TAGS = [
  'Fast delivery', 'Good quality', 'True to description',
  'Great packaging', 'Would buy again', 'Helpful supplier',
];

function StarRating({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={star.row}>
      {[1, 2, 3, 4, 5].map((n) => (
        <TouchableOpacity key={n} onPress={() => onChange(n)} activeOpacity={0.7}>
          <Text style={[star.star, n <= value && star.starActive]}>★</Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const star = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8 },
  star: { fontSize: 40, color: Colors.border },
  starActive: { color: '#F59E0B' },
});

const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very Good', 'Excellent'];

export default function ReviewScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const { data: existing, isLoading } = useOrderReview(orderId);
  const { mutateAsync: submit, isPending } = useSubmitReview(orderId);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  function toggleTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  }

  async function handleSubmit() {
    if (rating === 0) {
      Alert.alert('Rating required', 'Please select a star rating before submitting.');
      return;
    }
    try {
      await submit({ rating, comment: comment.trim() || undefined, tags: selectedTags });
      Alert.alert('Thank you!', 'Your review has been submitted.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Error', err?.message ?? 'Could not submit review. Please try again.');
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}><ActivityIndicator size="large" color={Colors.primary} /></View>
      </SafeAreaView>
    );
  }

  if (existing?.data) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <Text style={s.backIcon}>←</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Your Review</Text>
        </View>
        <View style={s.center}>
          <Text style={{ fontSize: 52, marginBottom: 16 }}>⭐</Text>
          <Text style={s.alreadyTitle}>Review submitted!</Text>
          <View style={star.row}>
            {[1, 2, 3, 4, 5].map((n) => (
              <Text key={n} style={[{ fontSize: 28 }, n <= existing.data!.rating && { color: '#F59E0B' }]}>★</Text>
            ))}
          </View>
          {existing.data.comment ? (
            <Text style={s.alreadyComment}>"{existing.data.comment}"</Text>
          ) : null}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Text style={s.backIcon}>←</Text>
        </TouchableOpacity>
        <Text style={s.headerTitle}>Rate this Order</Text>
      </View>

      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Star picker */}
        <View style={s.card}>
          <Text style={s.cardTitle}>How would you rate this order?</Text>
          <StarRating value={rating} onChange={setRating} />
          {rating > 0 && (
            <Text style={s.ratingLabel}>{LABELS[rating]}</Text>
          )}
        </View>

        {/* Quick tags */}
        <View style={s.card}>
          <Text style={s.cardTitle}>What went well? (optional)</Text>
          <View style={s.tagsWrap}>
            {TAGS.map((tag) => (
              <TouchableOpacity
                key={tag}
                style={[s.tag, selectedTags.includes(tag) && s.tagActive]}
                onPress={() => toggleTag(tag)}
              >
                <Text style={[s.tagText, selectedTags.includes(tag) && s.tagTextActive]}>
                  {tag}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Comment */}
        <View style={s.card}>
          <Text style={s.cardTitle}>Write a comment (optional)</Text>
          <TextInput
            style={s.input}
            value={comment}
            onChangeText={setComment}
            placeholder="Share your experience with this supplier..."
            placeholderTextColor={Colors.textMuted}
            multiline
            numberOfLines={4}
            maxLength={500}
          />
          <Text style={s.charCount}>{comment.length}/500</Text>
        </View>

        <TouchableOpacity
          style={[s.submitBtn, (isPending || rating === 0) && s.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={isPending || rating === 0}
          activeOpacity={0.85}
        >
          {isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={s.submitText}>Submit Review</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surfaceAlt },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  backBtn: { padding: 4, marginRight: 8 },
  backIcon: { fontSize: 20, color: Colors.text },
  headerTitle: { fontSize: 17, fontWeight: '700', color: Colors.text },
  scroll: { padding: 16, gap: 12 },
  card: { backgroundColor: Colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: Colors.border, gap: 14 },
  cardTitle: { fontSize: 14, fontWeight: '700', color: Colors.text },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  alreadyTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  alreadyComment: { fontSize: 14, color: Colors.textSecondary, fontStyle: 'italic', textAlign: 'center', paddingHorizontal: 24, marginTop: 8 },
  ratingLabel: { fontSize: 15, fontWeight: '600', color: Colors.primary },
  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surfaceAlt,
  },
  tagActive: { borderColor: Colors.primary, backgroundColor: '#FFF7ED' },
  tagText: { fontSize: 13, color: Colors.textSecondary },
  tagTextActive: { color: Colors.primary, fontWeight: '600' },
  input: {
    borderWidth: 1.5, borderColor: Colors.border, borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12, fontSize: 15,
    color: Colors.text, backgroundColor: Colors.surfaceAlt, textAlignVertical: 'top', minHeight: 100,
  },
  charCount: { fontSize: 11, color: Colors.textMuted, textAlign: 'right' },
  submitBtn: {
    backgroundColor: Colors.primary, borderRadius: 16,
    paddingVertical: 16, alignItems: 'center', marginTop: 4,
  },
  submitBtnDisabled: { opacity: 0.5 },
  submitText: { color: '#fff', fontWeight: '800', fontSize: 16 },
});
