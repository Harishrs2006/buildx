import { Router } from 'express';
import { listCategories } from './category.controller';

const router = Router();

router.get('/', listCategories);

export { router as categoryRoutes };
