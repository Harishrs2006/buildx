import { supplierRepository, SupplierFilters } from './supplier.repository';
import { AppError } from '../../shared/errors/AppError';
import { CacheService } from '../../infrastructure/cache/redis.client';
import { CACHE_TTL } from '@buildx/shared';

export class SupplierService {
  async getMany(filters: SupplierFilters) {
    return supplierRepository.findMany(filters);
  }

  async getById(id: string) {
    const cacheKey = CacheService.buildKey('supplier', id);
    const cached = await CacheService.get(cacheKey);
    if (cached) return cached;

    const supplier = await supplierRepository.findById(id);
    if (!supplier) throw AppError.notFound('Supplier');

    await CacheService.set(cacheKey, supplier, CACHE_TTL.SUPPLIER);
    return supplier;
  }
}

export const supplierService = new SupplierService();
