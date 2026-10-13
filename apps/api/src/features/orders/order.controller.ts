import { Request, Response, NextFunction } from 'express';
import { isValidObjectId } from 'mongoose';
import { Order } from '../../infrastructure/database/models/Order.model';
import { SupplierProfile } from '../../infrastructure/database/models/SupplierProfile.model';
import { AppError } from '../../shared/errors/AppError';
import { ok } from '@buildx/shared';
import { notifyUser } from '../../shared/services/notification.service';
import { logger } from '../../shared/logger/logger';
import { createOrder as createOrderTx, quoteOrder, cancelOrder as cancelOrderTx } from './order.service';
import { IDEMPOTENCY_KEY, type CreateOrderInput } from './order.schemas';

function notifySupplier(supplierProfileId: unknown, payload: Parameters<typeof notifyUser>[1]) {
  SupplierProfile.findById(supplierProfileId).select('userId').lean().then((sp) => {
    if (sp?.userId) return notifyUser(sp.userId.toString(), payload);
  }).catch((err) => {
    logger.error('Supplier notification lookup failed', { supplierProfileId: String(supplierProfileId), error: err?.message });
  });
}

// POST /orders/quote — server-priced summary for the checkout screen
export async function quote(req: Request, res: Response, next: NextFunction) {
  try {
    res.json(ok(await quoteOrder(req.body.items, req.body.deliveryPincode)));
  } catch (err) {
    next(err);
  }
}

// POST /orders — requires an Idempotency-Key header, reused by the client on retries
export async function createOrder(req: Request, res: Response, next: NextFunction) {
  try {
    const idempotencyKey = req.get('Idempotency-Key');
    if (!idempotencyKey || !IDEMPOTENCY_KEY.test(idempotencyKey)) {
      throw AppError.badRequest('Idempotency-Key header is required (16-128 letters, digits, - or _)');
    }

    const { order, replayed } = await createOrderTx({
      buyerId: req.auth!.userId,
      input: req.body as CreateOrderInput,
      idempotencyKey,
    });

    if (!replayed) {
      notifySupplier(order.supplierId, {
        title: '🛒 New Order!',
        body: `Order ${order.orderNumber} — ₹${order.total.toLocaleString('en-IN')} · ${order.items.length} item${order.items.length > 1 ? 's' : ''}`,
        data: { screen: 'supplier_orders', orderId: order._id.toString() },
      });
    }

    res.status(replayed ? 200 : 201).json(
      ok({
        orderId: order._id,
        orderNumber: order.orderNumber,
        subtotal: order.subtotal,
        gstAmount: order.gstAmount,
        total: order.total,
        status: order.status,
        replayed,
      })
    );
  } catch (err) {
    next(err);
  }
}

// POST /orders/:id/cancel — buyer cancels before a driver is assigned; stock is restored once
export async function cancelOrder(req: Request, res: Response, next: NextFunction) {
  try {
    if (!isValidObjectId(req.params.id)) throw AppError.badRequest('Invalid order ID');
    const { order, changed } = await cancelOrderTx({
      filter: { _id: req.params.id, buyerId: req.auth!.userId },
      actor: 'BUYER',
      userId: req.auth!.userId,
      reason: req.body.reason,
    });
    if (changed) {
      notifySupplier(order.supplierId, {
        title: '❌ Order Cancelled',
        body: `Order ${order.orderNumber} was cancelled by the buyer.`,
        data: { screen: 'supplier_orders', orderId: order._id.toString() },
      });
    }
    res.json(ok(order));
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
