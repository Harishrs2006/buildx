import { z } from 'zod';
import { isValidObjectId } from 'mongoose';

const objectId = z.string().refine((v) => isValidObjectId(v), 'Invalid ID');
const party = z.enum(['SUPPLIER', 'DRIVER']);

export const balancesQuery = z.object({ party: party.default('SUPPLIER') });
export const settlementListQuery = z.object({
  party: party.optional(),
  status: z.enum(['PENDING', 'PAID', 'CANCELLED']).optional(),
});
export const createSettlementSchema = z.object({ party, partyId: objectId });
export const markPaidSchema = z.object({
  // UPI / bank transaction reference, or "cash"
  reference: z.string().trim().min(2, 'Enter the payment reference').max(100),
  note: z.string().trim().max(500).optional(),
});
export const cancelSettlementSchema = z.object({ reason: z.string().trim().min(3, 'Give a reason (at least 3 characters)').max(500) });
