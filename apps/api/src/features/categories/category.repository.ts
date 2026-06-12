import { prisma } from '../../infrastructure/database/prisma.client';

export class CategoryRepository {
  async findAll() {
    return prisma.category.findMany({
      where: { isActive: true, parentId: null },
      include: { children: { where: { isActive: true } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async findBySlug(slug: string) {
    return prisma.category.findUnique({
      where: { slug },
      include: { children: { where: { isActive: true } } },
    });
  }

  async findById(id: string) {
    return prisma.category.findUnique({ where: { id } });
  }
}

export const categoryRepository = new CategoryRepository();
