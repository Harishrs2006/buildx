import { prisma } from '../../infrastructure/database/prisma.client';
import { Prisma } from '@prisma/client';
import { DEFAULT_PAGE_SIZE } from '@buildx/shared';

export interface SupplierFilters {
  search?: string;
  serviceArea?: string;
  page?: number;
  limit?: number;
}

export class SupplierRepository {
  async findMany(filters: SupplierFilters) {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? DEFAULT_PAGE_SIZE, 100);
    const skip = (page - 1) * limit;

    const where: Prisma.SupplierProfileWhereInput = {
      status: 'VERIFIED',
      ...(filters.search && {
        OR: [
          { businessName: { contains: filters.search, mode: 'insensitive' } },
          { description: { contains: filters.search, mode: 'insensitive' } },
        ],
      }),
      ...(filters.serviceArea && {
        serviceAreas: { has: filters.serviceArea },
      }),
    };

    const [suppliers, total] = await Promise.all([
      prisma.supplierProfile.findMany({
        where,
        select: {
          id: true,
          businessName: true,
          description: true,
          logoUrl: true,
          avgRating: true,
          totalReviews: true,
          serviceAreas: true,
          establishedYear: true,
          _count: { select: { products: true } },
        },
        orderBy: { avgRating: 'desc' },
        skip,
        take: limit,
      }),
      prisma.supplierProfile.count({ where }),
    ]);

    return { suppliers, total, page, limit };
  }

  async findById(id: string) {
    return prisma.supplierProfile.findUnique({
      where: { id },
      include: {
        products: {
          where: { status: 'ACTIVE' },
          select: {
            id: true, name: true, slug: true, basePrice: true,
            unit: true, avgRating: true,
            images: { where: { isPrimary: true }, take: 1 },
          },
          take: 12,
        },
        reviews: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { firstName: true, lastName: true, avatarUrl: true } } },
        },
        _count: { select: { products: true, reviews: true } },
      },
    });
  }
}

export const supplierRepository = new SupplierRepository();
