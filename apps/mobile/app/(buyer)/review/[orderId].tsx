import { View, Text, StyleSheet, Pressable, TextInput, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import { useSubmitReview, useOrderReview } from '../../../src/hooks/useReviews';
import { Colors } from '../../../src/constants/colors';
import { Font } from '../../../src/constants/typography';
import { Button, EmptyState, Eyebrow, Icon, Notice, ScreenHeader } from '../../../src/components/ui';

const TAGS = ['Fast delivery', 'Good quality', 'True to description', 'Good packaging', 'Would buy again', 'Helpful supplier'];
const LABELS = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];

function Stars({ value, onChange, size = 40 }: { value: number; onChange?: (v: number) => void; size?: number }) {
  return (
    <View style={styles.stars} accessibilityRole={onChange ? 'adjustable' : undefined} accessibilityLabel={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((n) => {
        const icon = <Icon name={n <= value ? 'star' : 'star-outline'} size={size} color={n <= value ? Colors.ink : Colors.sand4} />;
        return onChange ? (
          <Pressable key={n} onPress={() => onChange(n)} hitSlop={4} accessibilityRole="button" accessibilityLabel={`${n} star${n > 1 ? 's' : ''}`}>
            {icon}
          </Pressable>
        ) : (
          <View key={n}>{icon}</View>
        );
      })}
    </View>
  );
}

export default function ReviewScreen() {
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const router = useRouter();
  const { data: existing, isLoading } = useOrderReview(orderId);
  const { mutateAsync: submit, isPending } = useSubmitReview(orderId);

  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function toggleTag(tag: string) {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  }

  async function handleSubmit() {
    if (rating === 0) {
      setError('Pick a star rating first.');
      return;
    }
    setError(null);
    try {
      await submit({ rating, comment: comment.trim() || undefined, tags: selectedTags });
      setDone(true);
    } catch (err: any) {
      setError(err?.message ?? 'We could not send your review. Please try again.');
    }
  }

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ActivityIndicator color={Colors.ink} style={styles.loading} />
      </SafeAreaView>
    );
  }

  const saved = existing?.data;
  if (saved || done) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScreenHeader title="Your review" onBack={() => router.back()} />
        <EmptyState
          icon="star-check-outline"
          title={done ? 'Thanks for the review' : 'You reviewed this order'}
          body={saved?.comment ? `“${saved.comment}”` : done && comment.trim() ? `“${comment.trim()}”` : undefined}
          action={
            <View style={styles.center}>
              <Stars value={saved?.rating ?? rating} size={28} />
              <Button title="Back to order" variant="ghost" onPress={() => router.back()} style={styles.back} />
            </View>
          }
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
        <ScreenHeader eyebrow="Delivered" title="Rate this order" onBack={() => router.back()} />
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          <View style={styles.card}>
            <Eyebrow>Your rating</Eyebrow>
            <View style={styles.starWrap}><Stars value={rating} onChange={(v) => { setRating(v); setError(null); }} /></View>
            <Text style={styles.ratingLabel}>{rating > 0 ? LABELS[rating] : 'Tap a star'}</Text>
          </View>

          <View style={styles.card}>
            <Eyebrow>What went well (optional)</Eyebrow>
            <View style={styles.tags}>
              {TAGS.map((tag) => {
                const on = selectedTags.includes(tag);
                return (
                  <Pressable key={tag} style={[styles.tag, on && styles.tagOn]} onPress={() => toggleTag(tag)} accessibilityRole="checkbox" accessibilityState={{ checked: on }}>
                    {on ? <Icon name="check" size={14} color={Colors.sand} /> : null}
                    <Text style={[styles.tagText, on && styles.tagTextOn]}>{tag}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.card}>
            <Eyebrow>Comment (optional)</Eyebrow>
            <TextInput
              style={styles.input}
              value={comment}
              onChangeText={setComment}
              placeholder="How were the materials and the delivery?"
              placeholderTextColor={Colors.stoneLight}
              multiline
              maxLength={500}
              accessibilityLabel="Comment"
            />
            <Text style={styles.count}>{comment.length}/500</Text>
          </View>

          {error ? <Notice tone="error">{error}</Notice> : null}
        </ScrollView>
        <SafeAreaView edges={['bottom']} style={styles.bottom}>
          <Button title="Send review" variant="lime" onPress={handleSubmit} loading={isPending} />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.sand },
  flex: { flex: 1 },
  loading: { marginTop: 60 },
  center: { alignItems: 'center' },
  back: { marginTop: 20, alignSelf: 'stretch' },
  scroll: { paddingHorizontal: 20, paddingBottom: 20, gap: 12 },
  card: { padding: 16, borderRadius: 18, backgroundColor: Colors.sand2, borderWidth: 1, borderColor: Colors.sand4 },
  stars: { flexDirection: 'row', gap: 6 },
  starWrap: { marginTop: 12 },
  ratingLabel: { fontFamily: Font.display, fontSize: 20, color: Colors.ink, marginTop: 8 },
  tags: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  tag: { flexDirection: 'row', alignItems: 'center', gap: 4, height: 38, paddingHorizontal: 14, borderRadius: 19, borderWidth: 1, borderColor: Colors.sand4, backgroundColor: Colors.sand },
  tagOn: { backgroundColor: Colors.ink, borderColor: Colors.ink },
  tagText: { fontFamily: Font.semiBold, fontSize: 13, color: Colors.ink },
  tagTextOn: { color: Colors.sand },
  input: { fontFamily: Font.regular, minHeight: 100, marginTop: 10, borderRadius: 14, borderWidth: 1.5, borderColor: Colors.sand4, backgroundColor: Colors.sand, padding: 14, fontSize: 15, color: Colors.ink, textAlignVertical: 'top' },
  count: { fontFamily: Font.mono, fontSize: 11, color: Colors.stone, textAlign: 'right', marginTop: 6 },
  bottom: { paddingHorizontal: 20, paddingTop: 10, paddingBottom: 12, backgroundColor: Colors.sand },
});
