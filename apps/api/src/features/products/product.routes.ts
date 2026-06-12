import { Router } from 'express';
import { listProducts, getProduct } from './product.controller';

const router = Router();

router.get('/', listProducts);
router.get('/:id', getProduct);

export { router as productRoutes };
