import { Request, Response, NextFunction } from 'express';
import { Category } from '../../infrastructure/database/models/Category.model';

export async function listCategories(_req: Request, res: Response, next: NextFunction) {
  try {
    const categories = await Category.find({ isActive: true, parentId: null })
      .sort({ sortOrder: 1 })
      .lean();
    res.json(categories);
  } catch (err) {
    next(err);
  }
}
