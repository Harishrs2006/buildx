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

  /**
   * Sensitive files (supplier verification documents). Stored as Cloudinary "private" assets: the
   * normal delivery URL does not work, so nothing public is ever saved. View with privateViewUrl.
   * Images and PDFs both go in as resource_type "image" (Cloudinary keeps the PDF as-is).
   */
  static async uploadPrivate(file: string, folder: string): Promise<{ publicId: string; format: string; bytes: number }> {
    try {
      const result = await cloudinary.uploader.upload(file, { folder: `buildx/${folder}`, type: 'private', resource_type: 'image' });
      return { publicId: result.public_id, format: result.format, bytes: result.bytes };
    } catch (err) {
      throw AppError.internal('Document upload failed');
    }
  }

  /** A signed link to a private file that stops working after `seconds`. */
  static privateViewUrl(publicId: string, format: string, seconds = 600): string {
    return cloudinary.utils.private_download_url(publicId, format, {
      resource_type: 'image',
      type: 'private',
      expires_at: Math.floor(Date.now() / 1000) + seconds,
    });
  }

  static async deletePrivate(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId, { type: 'private', resource_type: 'image' });
    } catch {
      // A leftover file is not worth failing the request over; it stays private either way
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
