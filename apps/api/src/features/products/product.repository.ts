import { prisma } from '../../infrastructure/database/prisma.client';
import { Prisma, ProductStatus } from '@prisma/client';
import { DEFAULT_PAGE_SIZE } from '@buildx/shared';

export interface ProductFilters {
  categoryId?: string;
  categorySlug?: string;
  supplierId?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  status?: ProductStatus;
  isFeatured?: boolean;
  page?: number;
  limit?: number;
  sortBy?: 'price' | 'rating' | 'newest' | 'popular';
}

const productSelect = {
  id: true,
  name: true,
  slug: true,
  shortDescription: true,
  basePrice: true,
  unit: true,
  minOrderQuantity: true,
  avgRating: true,
  totalReviews: true,
  totalSold: true,
  status: true,
  isFeatured: true,
  tags: true,
  createdAt: true,
  images: {
    where: { isPrimary: true },
    select: { url: true, altText: true },
    take: 1,
  },
  category: { select: { id: true, name: true, slug: true } },
  supplier: { select: { id: true, businessName: true, avgRating: true } },
} satisfies Prisma.ProductSelect;

export class ProductRepository {
  async findMany(filters: ProductFilters) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? DEFAULT_PAGE_SIZE, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.ProductWhereInput = {
      status: filters.status ?? 'ACTIVE',
      ...(filters.isFeatured !== undefined && { isFeatured: filters.isFeatured }),
      ...(filters.supplierId && { supplierId: filters.supplierId }),
      ...(filters.categoryId && { categoryId: filters.categoryId }),
      ...(filters.categorySlug && { category: { slug: filters.categorySlug } }),
      ...(filters.minPrice !== undefined || filters.maxPrice !== undefined
        ? { basePrice: { gte: filters.minPrice, lte: filters.maxPrice } }
        : {}),
      ...(filters.search && {
        OR: [
          { name: { contains: filters.search, mode: 'insensitive' } },
          { shortDescription: { contains: filters.search, mode: 'insensitive' } },
          { tags: { has: filters.search } },
        ],
      }),
    };

    const orderBy: Prisma.ProductOrderByWithRelationInput =
      filters.sortBy === 'price'
        ? { basePrice: 'asc' }
        : filters.sortBy === 'rating'
        ? { avgRating: 'desc' }
        : filters.sortBy === 'popular'
        ? { totalSold: 'desc' }
        : { createdAt: 'desc' };

    const [products, total] = await Promise.all([
      prisma.product.findMany({ where, select: productSelect, orderBy, skip, take: limit }),
      prisma.product.count({ where }),
    ]);

    return { products, total, page, limit };
  }

  async findBySlug(slug: string) {
    return prisma.product.findUnique({
      where: { slug },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        category: true,
        supplier: {
          select: {
            id: true,
            businessName: true,
            description: true,
            avgRating: true,
            totalReviews: true,
            serviceAreas: true,
            logoUrl: true,
          },
        },
        inventory: true,
        reviews: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } },
        },
      },
    });
  }

  async findFeatured(limit = 8) {
    return prisma.product.findMany({
      where: { status: 'ACTIVE', isFeatured: true },
      select: productSelect,
      orderBy: { totalSold: 'desc' },
      take: limit,
    });
  }

  async findRelated(productId: string, categoryId: string, limit = 4) {
    return prisma.product.findMany({
      where: { status: 'ACTIVE', categoryId, id: { not: productId } },
      select: productSelect,
      take: limit,
    });
  }
}

export const productRepository = new ProductRepository();
