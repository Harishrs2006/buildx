import { Request, Response, NextFunction } from 'express';
import { isValidObjectId } from 'mongoose';
import { Product } from '../../infrastructure/database/models/Product.model';
import { Order } from '../../infrastructure/database/models/Order.model';
import { SupplierProfile } from '../../infrastructure/database/models/SupplierProfile.model';
import { AppError } from '../../shared/errors/AppError';
import { ok } from '@buildx/shared';
import { notifyUser } from '../../shared/services/notification.service';

function generateOrderNumber(): string {
  const ts = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  return `BX-${ts}-${rand}`;
}

type CartItem = { productId: string; quantity: number };

export async function createOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const { items, deliveryAddress, notes, deliveryMethod = 'STANDARD' } = req.body as {
      items: CartItem[];
      deliveryAddress: {
        label: string;
        fullAddress: string;
        lat: number;
        lng: number;
        contactPhone: string;
      };
      notes?: string;
      deliveryMethod?: 'STANDARD' | 'EXPRESS';
    };

    if (!items || items.length === 0) throw AppError.badRequest('Cart is empty');
    if (!deliveryAddress?.fullAddress) throw AppError.badRequest('Delivery address required');

    const productIds = items.map((i) => i.productId);
    if (productIds.some((id) => !isValidObjectId(id))) {
      throw AppError.badRequest('One or more invalid product IDs');
    }

    const products = await Product.find({ _id: { $in: productIds }, status: 'ACTIVE' })
      .populate('supplierId', 'businessName')
      .lean();

    if (products.length !== items.length) {
      throw AppError.badRequest('One or more products are unavailable');
    }

    const supplierIds = [...new Set(products.map((p) => p.supplierId.toString()))];
    if (supplierIds.length > 1) {
      throw AppError.badRequest('All items in one order must be from the same supplier');
    }
    const supplierId = products[0].supplierId;

    const orderItems = items.map((cartItem) => {
      const product = products.find((p) => p._id.toString() === cartItem.productId)!;

      if (cartItem.quantity < product.minOrderQuantity) {
        throw AppError.badRequest(
          `${product.name} requires minimum ${product.minOrderQuantity} ${product.unit}`
        );
      }
      if (product.stockQuantity < cartItem.quantity) {
        throw AppError.badRequest(
          `Insufficient stock for ${product.name}: only ${product.stockQuantity} ${product.unit} available`
        );
      }

      return {
        productId: product._id,
        name: product.name,
        imageUrl: product.images?.find((img) => img.isPrimary)?.url ?? product.images?.[0]?.url ?? '',
        unit: product.unit,
        quantity: cartItem.quantity,
        pricePerUnit: product.basePrice,
        gstRate: product.gstRate,
        subtotal: product.basePrice * cartItem.quantity,
      };
    });

    const subtotal = orderItems.reduce((sum, i) => sum + i.subtotal, 0);
    const gstAmount = orderItems.reduce(
      (sum, i) => sum + i.pricePerUnit * i.quantity * (i.gstRate / 100),
      0
    );
    const total = subtotal + gstAmount;

    // Deduct stock immediately for COD orders
    const bulkOps = orderItems.map((item) => ({
      updateOne: {
        filter: { _id: item.productId },
        update: { $inc: { stockQuantity: -item.quantity, totalSold: item.quantity } },
      },
    }));
    await Product.bulkWrite(bulkOps);

    const order = await Order.create({
      orderNumber: generateOrderNumber(),
      buyerId: req.auth!.userId,
      supplierId,
      items: orderItems,
      deliveryAddress,
      deliveryMethod,
      deliveryCharge: 0,
      subtotal: Math.round(subtotal * 100) / 100,
      gstAmount: Math.round(gstAmount * 100) / 100,
      total: Math.round(total * 100) / 100,
      notes,
      paymentMethod: 'COD',
      status: 'CONFIRMED',
      paymentStatus: 'PENDING',
      confirmedAt: new Date(),
    });

    // Notify supplier about new order (fire-and-forget)
    SupplierProfile.findById(supplierId).select('userId').lean().then((sp) => {
      if (sp?.userId) {
        notifyUser(sp.userId.toString(), {
          title: '🛒 New Order!',
          body: `Order ${order.orderNumber} — ₹${order.total.toLocaleString('en-IN')} · ${orderItems.length} item${orderItems.length > 1 ? 's' : ''}`,
          data: { screen: 'supplier_orders', orderId: order._id.toString() },
        });
      }
    });

    res.status(201).json(
      ok({
        orderId: order._id,
        orderNumber: order.orderNumber,
        subtotal: order.subtotal,
        gstAmount: order.gstAmount,
        total: order.total,
        status: order.status,
      })
    );
  } catch (err) {
    next(err);
  }
}

export async function listOrders(req: Request, res: Response, next: NextFunction) {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const limit = Math.min(20, parseInt(req.query.limit as string, 10) || 10);

    const [orders, total] = await Promise.all([
      Order.find({ buyerId: req.auth!.userId })
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .lean(),
      Order.countDocuments({ buyerId: req.auth!.userId }),
    ]);

    res.json(
      ok(orders, {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNext: page * limit < total,
        hasPrev: page > 1,
      })
    );
  } catch (err) {
    next(err);
  }
}

export async function getOrder(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isValidObjectId(req.params.id)) throw AppError.badRequest('Invalid order ID');

    const order = await Order.findOne({ _id: req.params.id, buyerId: req.auth!.userId }).lean();
    if (!order) throw AppError.notFound('Order');

    res.json(ok(order));
  } catch (err) {
    next(err);
  }
}
