import { Request, Response, NextFunction } from 'express';
import { ok } from '@buildx/shared';
import { AppError } from '../../shared/errors/AppError';
import { StorageService, type UploadFolder } from '../../infrastructure/storage/cloudinary.client';

const FOLDER_BY_ROLE: Record<string, UploadFolder> = {
  SUPPLIER: 'products',
};

// POST /upload/image — multipart/form-data, field name "image" (see upload.routes.ts for multer config)
export async function uploadImage(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.file) throw AppError.badRequest('No image file provided (field name: "image")');

    const folder = FOLDER_BY_ROLE[req.auth!.role] ?? 'products';
    const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
    const result = await StorageService.uploadImage(dataUri, folder, { width: 1200, height: 1200 });

    res.status(201).json(ok({ url: result.secureUrl, publicId: result.publicId }));
  } catch (err) {
    next(err);
  }
}
