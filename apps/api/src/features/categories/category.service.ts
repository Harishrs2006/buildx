import { categoryRepository } from './category.repository';
import { AppError } from '../../shared/errors/AppError';
import { CacheService } from '../../infrastructure/cache/redis.client';
import { CACHE_TTL } from '@buildx/shared';

export class CategoryService {
  async getAll() {
    const cacheKey = CacheService.buildKey('categories', 'all');
    const cached = await CacheService.get(cacheKey);
    if (cached) return cached;

    const categories = await categoryRepository.findAll();
    await CacheService.set(cacheKey, categories, CACHE_TTL.CATEGORY);
    return categories;
  }

  async getBySlug(slug: string) {
    const cacheKey = CacheService.buildKey('categories', slug);
    const cached = await CacheService.get(cacheKey);
    if (cached) return cached;

    const category = await categoryRepository.findBySlug(slug);
    if (!category) throw AppError.notFound('Category');

    await CacheService.set(cacheKey, category, CACHE_TTL.CATEGORY);
    return category;
  }
}

export const categoryService = new CategoryService();
