import { productRepository, ProductFilters } from './product.repository';
import { AppError } from '../../shared/errors/AppError';
import { CacheService } from '../../infrastructure/cache/redis.client';
import { CACHE_TTL } from '@buildx/shared';

export class ProductService {
  async getMany(filters: ProductFilters) {
    return productRepository.findMany(filters);
  }

  async getBySlug(slug: string) {
    const cacheKey = CacheService.buildKey('product', slug);
    const cached = await CacheService.get(cacheKey);
    if (cached) return cached;

    const product = await productRepository.findBySlug(slug);
    if (!product) throw AppError.notFound('Product');

    await CacheService.set(cacheKey, product, CACHE_TTL.PRODUCT);
    return product;
  }

  async getFeatured() {
    const cacheKey = CacheService.buildKey('products', 'featured');
    const cached = await CacheService.get(cacheKey);
    if (cached) return cached;

    const products = await productRepository.findFeatured();
    await CacheService.set(cacheKey, products, CACHE_TTL.PRODUCT);
    return products;
  }

  async getRelated(productId: string, categoryId: string) {
    return productRepository.findRelated(productId, categoryId);
  }
}

export const productService = new ProductService();
