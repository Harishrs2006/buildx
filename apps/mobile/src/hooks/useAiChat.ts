import { useState, useCallback } from 'react';
import { api } from '../lib/api';
import { useCartStore } from '../store/cart.store';

export type ChatRole = 'user' | 'assistant';

export type PriceOption = {
  productId: string;
  name: string;
  supplier: string;
  supplierId: string;
  pricePerUnit: number;
  unit: string;
  gstRate: number;
  totalBeforeGst: number;
  gstAmount: number;
  totalWithGst: number;
  inStock: boolean;
  stockQuantity: number;
  deliveryDays: number;
};

export type AnalysedItem = {
  requested: string;
  quantity: number | null;
  unit: string | null;
  options: PriceOption[];
  notFound: boolean;
  selectedOptionIndex?: number;
};

export type ChatMessage =
  | { id: string; role: ChatRole; type: 'text'; content: string }
  | { id: string; role: 'assistant'; type: 'price_list'; items: AnalysedItem[]; summary: string }
  | { id: string; role: 'user'; type: 'image'; uri: string; caption?: string };

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function useAiChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: uid(),
      role: 'assistant',
      type: 'text',
      content: "Hi! I'm BuildX Assistant. I can help you find materials, compare prices, and place orders.\n\nYou can also **upload a photo** of your materials list and I'll calculate prices instantly across brands.",
    },
  ]);
  const [loading, setLoading] = useState(false);
  const addToCart = useCartStore((s) => s.addItem);

  const history = messages
    .filter((m): m is Extract<ChatMessage, { type: 'text' }> => m.type === 'text')
    .map((m) => ({ role: m.role, content: m.content }));

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { id: uid(), role: 'user', type: 'text', content: text.trim() };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      const { data } = await api.post('/ai/chat', {
        message: text.trim(),
        history: history.slice(-10),
      });
      const assistantMsg: ChatMessage = { id: uid(), role: 'assistant', type: 'text', content: data.reply };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: uid(), role: 'assistant', type: 'text', content: "Sorry, I'm having trouble connecting right now. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  }, [loading, history]);

  const analyzeImage = useCallback(async (base64: string, mimeType: string, uri: string) => {
    if (loading) return;

    const userImg: ChatMessage = { id: uid(), role: 'user', type: 'image', uri, caption: 'Materials list' };
    const thinkingMsg: ChatMessage = { id: uid(), role: 'assistant', type: 'text', content: 'Reading your materials list and fetching prices...' };
    setMessages((prev) => [...prev, userImg, thinkingMsg]);
    setLoading(true);

    try {
      const { data } = await api.post('/ai/analyze-list', { imageBase64: base64, mimeType });

      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== thinkingMsg.id);
        if (data.success && data.items.length > 0) {
          return [
            ...filtered,
            { id: uid(), role: 'assistant', type: 'price_list', items: data.items, summary: data.message },
          ];
        }
        return [
          ...filtered,
          { id: uid(), role: 'assistant', type: 'text', content: data.message },
        ];
      });
    } catch {
      setMessages((prev) => {
        const filtered = prev.filter((m) => m.id !== thinkingMsg.id);
        return [...filtered, { id: uid(), role: 'assistant', type: 'text', content: "Couldn't analyse the image. Please try a clearer photo." }];
      });
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const selectOption = useCallback((messageId: string, itemIndex: number, optionIndex: number) => {
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== messageId || m.type !== 'price_list') return m;
        const items = [...m.items];
        items[itemIndex] = { ...items[itemIndex], selectedOptionIndex: optionIndex };
        return { ...m, items };
      })
    );
  }, []);

  const addSelectedToCart = useCallback(
    (msg: Extract<ChatMessage, { type: 'price_list' }>) => {
      let addedCount = 0;
      for (const item of msg.items) {
        const idx = item.selectedOptionIndex ?? 0;
        const opt = item.options[idx];
        if (!opt || !item.quantity || item.notFound) continue;
        addToCart({
          productId: opt.productId,
          name: opt.name,
          image: '',
          supplierId: opt.supplierId,
          supplierName: opt.supplier,
          basePrice: opt.pricePerUnit,
          unit: opt.unit,
          gstRate: opt.gstRate,
        }, item.quantity);
        addedCount++;
      }
      return addedCount;
    },
    [addToCart]
  );

  const clearChat = useCallback(() => {
    setMessages([
      {
        id: uid(),
        role: 'assistant',
        type: 'text',
        content: "Hi! I'm BuildX Assistant. Upload a photo of your materials list or ask me anything.",
      },
    ]);
  }, []);

  return { messages, loading, sendMessage, analyzeImage, selectOption, addSelectedToCart, clearChat };
}
