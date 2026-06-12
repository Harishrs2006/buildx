import { Request, Response, NextFunction } from 'express';
import { productService } from './product.service';
import { ok } from '@buildx/shared';

export class ProductController {
  async getMany(req: Request, res: Response, next: NextFunction) {
    try {
      const { page, limit, search, categorySlug, supplierId, minPrice, maxPrice, sortBy, isFeatured } = req.query as any;
      const result = await productService.getMany({ page, limit, search, categorySlug, supplierId, minPrice, maxPrice, sortBy, isFeatured });
      res.json(ok(result.products, {
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
        hasNext: result.page * result.limit < result.total,
        hasPrev: result.page > 1,
      }));
    } catch (err) { next(err); }
  }

  async getFeatured(req: Request, res: Response, next: NextFunction) {
    try {
      const products = await productService.getFeatured();
      res.json(ok(products));
    } catch (err) { next(err); }
  }

  async getBySlug(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.getBySlug(req.params.slug);
      res.json(ok(product));
    } catch (err) { next(err); }
  }

  async getRelated(req: Request, res: Response, next: NextFunction) {
    try {
      const product = await productService.getBySlug(req.params.slug);
      const related = await productService.getRelated((product as any).id, (product as any).categoryId);
      res.json(ok(related));
    } catch (err) { next(err); }
  }
}

export const productController = new ProductController();
