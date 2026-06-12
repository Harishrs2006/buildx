import { prisma } from '../../infrastructure/database/prisma.client';
import { CreateUserInput, UpdateUserInput } from './user.types';
import { UserRole, Prisma } from '@prisma/client';

export class UserRepository {
  async findById(id: string) {
    return prisma.user.findUnique({ where: { id } });
  }

  async findByClerkId(clerkId: string) {
    return prisma.user.findUnique({
      where: { clerkId },
      include: {
        buyerProfile: true,
        supplierProfile: true,
      },
    });
  }

  async findByEmail(email: string) {
    return prisma.user.findUnique({ where: { email } });
  }

  async create(input: CreateUserInput) {
    return prisma.user.create({
      data: {
        clerkId: input.clerkId,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        avatarUrl: input.avatarUrl,
        phone: input.phone,
        status: 'PENDING',
        role: 'BUYER',
      },
    });
  }

  async update(id: string, input: UpdateUserInput) {
    return prisma.user.update({ where: { id }, data: input });
  }

  async updateRole(id: string, role: UserRole) {
    return prisma.user.update({ where: { id }, data: { role, status: 'ACTIVE' } });
  }

  async upsertFromClerk(input: CreateUserInput) {
    return prisma.user.upsert({
      where: { clerkId: input.clerkId },
      create: {
        clerkId: input.clerkId,
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        avatarUrl: input.avatarUrl ?? null,
        status: 'PENDING',
        role: 'BUYER',
      },
      update: {
        email: input.email,
        firstName: input.firstName,
        lastName: input.lastName,
        avatarUrl: input.avatarUrl ?? null,
      },
    });
  }

  async softDelete(clerkId: string) {
    return prisma.user.update({
      where: { clerkId },
      data: { status: 'DELETED' },
    });
  }

  async createBuyerProfile(
    userId: string,
    data: { companyName?: string; gstin?: string; billingAddress?: Prisma.InputJsonValue }
  ) {
    return prisma.buyerProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }

  async createSupplierProfile(
    userId: string,
    data: {
      businessName: string;
      gstin?: string;
      description?: string;
      website?: string;
      establishedYear?: number;
      address: Prisma.InputJsonValue;
      serviceAreas: string[];
    }
  ) {
    return prisma.supplierProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: data,
    });
  }
}

export const userRepository = new UserRepository();
