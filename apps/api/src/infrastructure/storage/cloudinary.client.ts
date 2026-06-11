import { v2 as cloudinary } from 'cloudinary';
import { env } from '../../config/env';
import { AppError } from '../../shared/errors/AppError';

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
  secure: true,
});

export type UploadFolder = 'products' | 'suppliers' | 'categories' | 'users';

export interface UploadResult {
  publicId: string;
  url: string;
  secureUrl: string;
  format: string;
  width: number;
  height: number;
  bytes: number;
}

export class StorageService {
  static async uploadImage(
    file: string,
    folder: UploadFolder,
    options?: { width?: number; height?: number }
  ): Promise<UploadResult> {
    try {
      const result = await cloudinary.uploader.upload(file, {
        folder: `buildx/${folder}`,
        transformation: options
          ? [{ width: options.width, height: options.height, crop: 'fill', quality: 'auto' }]
          : [{ quality: 'auto', fetch_format: 'auto' }],
        resource_type: 'image',
      });

      return {
        publicId: result.public_id,
        url: result.url,
        secureUrl: result.secure_url,
        format: result.format,
        width: result.width,
        height: result.height,
        bytes: result.bytes,
      };
    } catch (err) {
      throw AppError.internal('Image upload failed');
    }
  }

  static async deleteImage(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (err) {
      throw AppError.internal('Image deletion failed');
    }
  }

  static getOptimizedUrl(
    publicId: string,
    options: { width?: number; height?: number; format?: string } = {}
  ): string {
    return cloudinary.url(publicId, {
      transformation: [
        {
          width: options.width,
          height: options.height,
          crop: 'fill',
          quality: 'auto',
          fetch_format: options.format ?? 'auto',
        },
      ],
      secure: true,
    });
  }
}
