import { Request, Response, NextFunction } from 'express';
import { ok } from '@sthiva/shared';
import { SupplierProfile } from '../../infrastructure/database/models/SupplierProfile.model';
import { AppError } from '../../shared/errors/AppError';
import { logger } from '../../shared/logger/logger';
import {
  balances, createSettlement, markPaid, cancelSettlement, listSettlements, getSettlement, myView,
} from './settlement.service';
import type { SettlementParty } from '../../infrastructure/database/models/Settlement.model';

// ─── Ops console (operators read, ADMIN creates / pays / cancels) ─────────

// GET /ops/settlements/balances?party=SUPPLIER|DRIVER
export async function opsBalances(req: Request, res: Response, next: NextFunction) {
  try {
    const party = (req.query.party as SettlementParty) ?? 'SUPPLIER';
    res.json(ok(await balances(party)));
  } catch (err) { next(err); }
}

// GET /ops/settlements
export async function opsList(req: Request, res: Response, next: NextFunction) {
  try {
    const { party, status } = req.query as { party?: SettlementParty; status?: string };
    res.json(ok(await listSettlements({ party, status })));
  } catch (err) { next(err); }
}

// GET /ops/settlements/:id
export async function opsGet(req: Request, res: Response, next: NextFunction) {
  try { res.json(ok(await getSettlement(String(req.params.id)))); } catch (err) { next(err); }
}

// POST /ops/settlements
export async function opsCreate(req: Request, res: Response, next: NextFunction) {
  try {
    const { party, partyId } = req.body as { party: SettlementParty; partyId: string };
    const doc = await createSettlement(party, partyId, req.auth!.userId);
    logger.info('[settlements] created', { adminUserId: req.auth!.userId, id: String(doc._id), party, net: doc.net });
    res.status(201).json(ok(doc));
  } catch (err) { next(err); }
}

// POST /ops/settlements/:id/paid
export async function opsMarkPaid(req: Request, res: Response, next: NextFunction) {
  try {
    const { reference, note } = req.body as { reference: string; note?: string };
    const doc = await markPaid(String(req.params.id), req.auth!.userId, reference, note);
    logger.info('[settlements] paid', { adminUserId: req.auth!.userId, id: String(doc._id) });
    res.json(ok(doc));
  } catch (err) { next(err); }
}

// POST /ops/settlements/:id/cancel
export async function opsCancel(req: Request, res: Response, next: NextFunction) {
  try {
    const doc = await cancelSettlement(String(req.params.id), req.auth!.userId, (req.body as { reason: string }).reason);
    logger.info('[settlements] cancelled', { adminUserId: req.auth!.userId, id: String(doc._id) });
    res.json(ok(doc));
  } catch (err) { next(err); }
}

// ─── Suppliers and drivers: their own statements ─────────────────────────

// GET /suppliers/me/settlements
export async function supplierSettlements(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = await SupplierProfile.findOne({ userId: req.auth!.userId }).select('_id').lean();
    if (!profile) throw AppError.notFound('Supplier profile');
    res.json(ok(await myView('SUPPLIER', String(profile._id))));
  } catch (err) { next(err); }
}

// GET /delivery/me/settlements
export async function driverSettlements(req: Request, res: Response, next: NextFunction) {
  try { res.json(ok(await myView('DRIVER', req.auth!.userId))); } catch (err) { next(err); }
}
