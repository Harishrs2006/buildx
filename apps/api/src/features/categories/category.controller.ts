import { Request, Response, NextFunction } from 'express';
import { categoryService } from './category.service';
import { ok } from '@buildx/shared';

export class CategoryController {
  async getAll(req: Request, res: Response, next: NextFunction) {
    try {
      const categories = await categoryService.getAll();
      res.json(ok(categories));
    } catch (err) { next(err); }
  }

  async getBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const category = await categoryService.getBySlug(req.params.slug);
      res.json(ok(category));
    } catch (err) { next(err); }
  }
}

export const categoryController = new CategoryController();
