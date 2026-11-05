import { Router } from 'express';
import { requireAuth, requireRole } from '../../shared/middleware/auth.middleware';
import { validate } from '../../shared/middleware/validate.middleware';
import {
  summary, listOrders, getOrder, cancel, unassign, assign, recordCod, addNote,
  listDrivers, listSuppliers, setSupplierVerification, setUserActive,
} from './ops.controller';
import {
  listOrdersQuery, opsCancelSchema, opsUnassignSchema, opsAssignSchema, opsCodSchema, opsNoteSchema,
  supplierListQuery, supplierVerificationSchema, userActiveSchema,
} from './ops.schemas';
import { opsList, opsGet, opsCreate, opsUpdate, opsMerge } from '../catalog/catalog.controller';
import { catalogCreateSchema, catalogUpdateSchema, catalogMergeSchema } from '../catalog/catalog.schemas';
import { getSettings, setCommission, createVehicle, updateVehicle, updateGeneral } from '../settings/settings.controller';
import { commissionSchema, vehicleCreateSchema, vehicleUpdateSchema, generalSettingsSchema } from '../settings/settings.schemas';

const router = Router();

// Operations team only. OPERATOR/ADMIN can never be self-assigned (see auth onboarding);
// accounts are promoted with `npm run grant-role --workspace=apps/api`.
router.use(requireAuth, requireRole('OPERATOR', 'ADMIN'));

router.get('/summary', summary);

router.get('/orders', validate(listOrdersQuery, 'query'), listOrders);
router.get('/orders/:id', getOrder);
router.post('/orders/:id/cancel', validate(opsCancelSchema), cancel);
router.post('/orders/:id/unassign', validate(opsUnassignSchema), unassign);
router.post('/orders/:id/assign', validate(opsAssignSchema), assign);
router.post('/orders/:id/cod', validate(opsCodSchema), recordCod);
router.post('/orders/:id/notes', validate(opsNoteSchema), addNote);

router.get('/drivers', listDrivers);
router.get('/suppliers', validate(supplierListQuery, 'query'), listSuppliers);
router.patch('/suppliers/:id/verification', validate(supplierVerificationSchema), setSupplierVerification);

// Account suspension is ADMIN-only
router.patch('/users/:id/active', requireRole('ADMIN'), validate(userActiveSchema), setUserActive);

// Sthiva catalog: operators and admins keep it tidy (review new items, fix, merge duplicates)
router.get('/catalog', opsList);
router.get('/catalog/:id', opsGet);
router.post('/catalog', validate(catalogCreateSchema), opsCreate);
router.patch('/catalog/:id', validate(catalogUpdateSchema), opsUpdate);
router.post('/catalog/:id/merge', validate(catalogMergeSchema), opsMerge);

// Platform settings: operators read, ADMIN changes
router.get('/settings', getSettings);
router.patch('/settings/commission/:id', requireRole('ADMIN'), validate(commissionSchema), setCommission);
router.post('/settings/vehicles', requireRole('ADMIN'), validate(vehicleCreateSchema), createVehicle);
router.patch('/settings/vehicles/:id', requireRole('ADMIN'), validate(vehicleUpdateSchema), updateVehicle);
router.patch('/settings/general', requireRole('ADMIN'), validate(generalSettingsSchema), updateGeneral);

export { router as opsRoutes };
