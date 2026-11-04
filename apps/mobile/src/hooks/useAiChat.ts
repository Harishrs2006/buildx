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

export type AddResult =
  | { status: 'added'; count: number }
  | { status: 'nothing' }
  | { status: 'mixed'; suppliers: string[] }
  | { status: 'cart_conflict'; cartSupplier: string; supplier: string };

/**
 * One order comes from one supplier (the API refuses mixed carts). Start each item on the option from the
 * supplier that can cover the most items in the list, so the default picks can go into one order.
 */
export function preselectOneSupplier(items: AnalysedItem[]): AnalysedItem[] {
  const coverage = new Map<string, number>();
  for (const it of items) {
    for (const sid of new Set(it.options.map((o) => o.supplierId))) coverage.set(sid, (coverage.get(sid) ?? 0) + 1);
  }
  return items.map((it) => {
    if (it.notFound || it.options.length === 0) return it;
    let best = 0;
    it.options.forEach((o, i) => {
      if ((coverage.get(o.supplierId) ?? 0) > (coverage.get(it.options[best].supplierId) ?? 0)) best = i;
    });
    return { ...it, selectedOptionIndex: best };
  });
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function useAiChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: uid(),
      role: 'assistant',
      type: 'text',
      content: "Hi! I'm Sthiva Assistant. I can help you find materials, compare prices, and place orders.\n\nYou can also **upload a photo** of your materials list and I'll calculate prices instantly across brands.",
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
            { id: uid(), role: 'assistant', type: 'price_list', items: preselectOneSupplier(data.items), summary: data.message },
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
    (msg: Extract<ChatMessage, { type: 'price_list' }>): AddResult => {
      const picks = msg.items
        .filter((item) => !item.notFound && !!item.quantity)
        .map((item) => ({ item, opt: item.options[item.selectedOptionIndex ?? 0] }))
        .filter((p): p is { item: AnalysedItem; opt: PriceOption } => !!p.opt);
      if (picks.length === 0) return { status: 'nothing' };

      const suppliers = [...new Map(picks.map((p) => [p.opt.supplierId, p.opt.supplier])).values()];
      if (suppliers.length > 1) return { status: 'mixed', suppliers };

      const cart = useCartStore.getState();
      const { supplierId, supplier } = picks[0].opt;
      if (cart.hasConflict(supplierId)) {
        return { status: 'cart_conflict', cartSupplier: cart.items[0]?.supplierName ?? 'another supplier', supplier };
      }

      for (const { item, opt } of picks) {
        addToCart({
          productId: opt.productId,
          name: opt.name,
          image: '',
          supplierId: opt.supplierId,
          supplierName: opt.supplier,
          basePrice: opt.pricePerUnit,
          unit: opt.unit,
          gstRate: opt.gstRate,
        }, item.quantity!);
      }
      return { status: 'added', count: picks.length };
    },
    [addToCart]
  );

  const clearChat = useCallback(() => {
    setMessages([
      {
        id: uid(),
        role: 'assistant',
        type: 'text',
        content: "Hi! I'm Sthiva Assistant. Upload a photo of your materials list or ask me anything.",
      },
    ]);
  }, []);

  return { messages, loading, sendMessage, analyzeImage, selectOption, addSelectedToCart, clearChat };
}
