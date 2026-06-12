import { Router } from 'express';
import { supplierController } from './supplier.controller';

const router = Router();

router.get('/', supplierController.getMany.bind(supplierController));
router.get('/:id', supplierController.getById.bind(supplierController));

export { router as supplierRoutes };
