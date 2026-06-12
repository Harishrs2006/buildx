import { Request, Response, NextFunction } from 'express';
import { supplierService } from './supplier.service';
import { ok } from '@buildx/shared';

export class SupplierController {
  async getMany(req: Request, res: Response, next: NextFunction) {
    try {
      const { search, serviceArea, page, limit } = req.query as any;
      const result = await supplierService.getMany({ search, serviceArea, page, limit });
      res.json(ok(result.suppliers, {
        total: result.total, page: result.page, limit: result.limit,
        totalPages: Math.ceil(result.total / result.limit),
        hasNext: result.page * result.limit < result.total,
        hasPrev: result.page > 1,
      }));
    } catch (err) { next(err); }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const supplier = await supplierService.getById(req.params.id);
      res.json(ok(supplier));
    } catch (err) { next(err); }
  }
}

export const supplierController = new SupplierController();
