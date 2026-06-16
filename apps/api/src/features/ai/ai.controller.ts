import { Request, Response, NextFunction } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import { env } from '../../config/env';
import { Product } from '../../infrastructure/database/models/Product.model';
import { AppError } from '../../shared/errors/AppError';

const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });

const SYSTEM_PROMPT = `You are BuildX Assistant — a customer care AI for a B2B construction materials marketplace serving contractors and builders in Tumakuru, Karnataka, India.

Your role:
- Help buyers find the right materials for their projects
- Answer questions about products, pricing, GST, delivery timelines
- Explain material specifications in simple terms
- Guide users through ordering on BuildX
- Support both English and Kannada (mix is fine)

Tone: Friendly, knowledgeable, concise. Like a trusted hardware store owner.
Currency: Always use Indian Rupees (₹). Include GST context.
When you don't know something specific (like live stock), say so honestly.
Never fabricate prices or availability — those come from our database.`;

// ─── TEXT CHAT ─────────────────────────────────────────────────────────────

export async function chat(req: Request, res: Response, next: NextFunction) {
  try {
    const { message, history = [] } = req.body as {
      message: string;
      history?: { role: 'user' | 'assistant'; content: string }[];
    };

    if (!message?.trim()) throw AppError.badRequest('Message is required');

    const messages: Anthropic.MessageParam[] = [
      ...history.map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: message.trim() },
    ];

    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    });

    const text = response.content.find((c) => c.type === 'text')?.text ?? '';
    res.json({ reply: text });
  } catch (err) { next(err); }
}

// ─── IMAGE ANALYSIS — extract materials list + price comparison ─────────────

type ExtractedItem = { item: string; quantity: number | null; unit: string | null };

type PriceOption = {
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

type AnalysedItem = {
  requested: string;
  quantity: number | null;
  unit: string | null;
  options: PriceOption[];
  notFound: boolean;
};

export async function analyzeList(req: Request, res: Response, next: NextFunction) {
  try {
    const { imageBase64, mimeType = 'image/jpeg' } = req.body as {
      imageBase64: string;
      mimeType?: string;
    };

    if (!imageBase64) throw AppError.badRequest('imageBase64 is required');

    // ── Step 1: Claude vision extracts materials from image ─────────────
    const visionResponse = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mimeType as 'image/jpeg' | 'image/png' | 'image/webp',
                data: imageBase64,
              },
            },
            {
              type: 'text',
              text: `This is a construction materials list from an Indian contractor. Extract every item.

Return ONLY a JSON array, no other text:
[{"item": "cement", "quantity": 50, "unit": "BAG"}, ...]

Rules:
- Normalize units to: KG, TON, PIECE, BAG, BUNDLE, CUBIC_METER, SQUARE_METER, LITER, METER
- Common mappings: bags→BAG, pieces/nos/no→PIECE, kg→KG, ton/mt→TON, sqft→SQUARE_METER, cft/cum→CUBIC_METER, ltr→LITER, mtr/m→METER
- If quantity or unit is unclear, use null
- Normalize item names to English (e.g. "cement" not "सीमेंट")
- Common items: cement, brick, sand, m sand, p sand, jelly 20mm, jelly 40mm, tmt bar 12mm, tmt bar 8mm, binding wire, plywood, pipe, paint, tile
Return ONLY valid JSON array.`,
            },
          ],
        },
      ],
    });

    const rawText = visionResponse.content.find((c) => c.type === 'text')?.text ?? '[]';

    let extracted: ExtractedItem[] = [];
    try {
      const jsonMatch = rawText.match(/\[[\s\S]*\]/);
      extracted = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      extracted = [];
    }

    if (extracted.length === 0) {
      return res.json({
        success: false,
        message: "I couldn't read any materials from that image. Please make sure the list is clearly visible and try again.",
        items: [],
      });
    }

    // ── Step 2: Match each item to products in DB ────────────────────────
    const analysed: AnalysedItem[] = await Promise.all(
      extracted.map(async (ext) => {
        const searchTerms = ext.item.toLowerCase().split(/\s+/).filter(Boolean);

        // Full-text search first, fall back to regex on name+tags
        let products = await Product.find(
          { $text: { $search: ext.item }, status: 'ACTIVE' },
          { score: { $meta: 'textScore' } }
        )
          .sort({ score: { $meta: 'textScore' } })
          .populate('supplierId', 'businessName _id')
          .limit(4)
          .lean();

        if (products.length === 0) {
          const regexParts = searchTerms.map((t) => new RegExp(t, 'i'));
          products = await Product.find({
            status: 'ACTIVE',
            $or: [
              { name: { $in: regexParts } },
              { tags: { $in: regexParts } },
            ],
          })
            .populate('supplierId', 'businessName _id')
            .limit(4)
            .lean();
        }

        const qty = ext.quantity;

        const options: PriceOption[] = products.map((p) => {
          const supplier = p.supplierId as any;
          const beforeGst = qty ? p.basePrice * qty : p.basePrice;
          const gstAmt = qty ? beforeGst * (p.gstRate / 100) : 0;

          return {
            productId: p._id.toString(),
            name: p.name,
            supplier: supplier?.businessName ?? 'Unknown',
            supplierId: supplier?._id?.toString() ?? '',
            pricePerUnit: p.basePrice,
            unit: p.unit,
            gstRate: p.gstRate,
            totalBeforeGst: qty ? Math.round(beforeGst * 100) / 100 : 0,
            gstAmount: Math.round(gstAmt * 100) / 100,
            totalWithGst: qty ? Math.round((beforeGst + gstAmt) * 100) / 100 : 0,
            inStock: p.stockQuantity > (qty ?? 0),
            stockQuantity: p.stockQuantity,
            deliveryDays: p.deliveryDays,
          };
        });

        return {
          requested: ext.item,
          quantity: qty,
          unit: ext.unit,
          options,
          notFound: options.length === 0,
        };
      })
    );

    const found = analysed.filter((a) => !a.notFound).length;
    const notFound = analysed.filter((a) => a.notFound).map((a) => a.requested);

    // ── Step 3: Generate a summary message ─────────────────────────────
    const summary =
      found === analysed.length
        ? `Found price options for all ${found} items in your list.`
        : `Found ${found} of ${analysed.length} items. Not available: ${notFound.join(', ')}.`;

    res.json({
      success: true,
      message: summary,
      items: analysed,
    });
  } catch (err) { next(err); }
}
