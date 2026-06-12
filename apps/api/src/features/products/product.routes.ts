import { Router } from 'express';
import { productController } from './product.controller';
import { validate } from '../../shared/middleware/validate.middleware';
import { productListSchema } from './product.schema';

const router = Router();

router.get('/', validate(productListSchema, 'query'), productController.getMany.bind(productController));
router.get('/featured', productController.getFeatured.bind(productController));
router.get('/:slug', productController.getBySlug.bind(productController));
router.get('/:slug/related', productController.getRelated.bind(productController));

export { router as productRoutes };
