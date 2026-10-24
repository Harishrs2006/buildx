import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { requireAuth, requireRole } from '../../shared/middleware/auth.middleware';
import { AppError } from '../../shared/errors/AppError';
import { uploadImage } from './upload.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.mimetype)) {
      return cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', 'image'));
    }
    cb(null, true);
  },
});

// Turns multer's raw errors (wrong type, too large) into the API's normal error shape
function handleUpload(req: Request, res: Response, next: NextFunction) {
  upload.single('image')(req, res, (err: unknown) => {
    if (!err) return next();
    if (err instanceof multer.MulterError) {
      const message =
        err.code === 'LIMIT_FILE_SIZE' ? 'Image must be 5MB or smaller'
        : err.code === 'LIMIT_UNEXPECTED_FILE' ? 'Only JPEG, PNG or WEBP images are allowed'
        : 'Invalid upload';
      return next(AppError.badRequest(message));
    }
    next(err);
  });
}

const router = Router();

router.get('/ping', (_req, res) => res.json({ feature: 'upload', status: 'ok' }));

router.post('/image', requireAuth, requireRole('SUPPLIER'), handleUpload, uploadImage);

export { router as uploadRoutes };
