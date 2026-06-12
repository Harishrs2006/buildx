import { createClerkClient } from '@clerk/clerk-sdk-node';
import { userRepository } from './user.repository';
import { CreateUserInput, UserDTO } from './user.types';
import { CompleteOnboardingInput } from './user.schema';
import { AppError } from '../../shared/errors/AppError';
import { env } from '../../config/env';

const clerk = createClerkClient({ secretKey: env.CLERK_SECRET_KEY });

function toDTO(user: {
  id: string;
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: import('./user.types').UserRole;
  status: import('./user.types').UserStatus;
  createdAt: Date;
}): UserDTO {
  return {
    ...user,
    fullName: `${user.firstName} ${user.lastName}`.trim(),
  };
}

export class UserService {
  async getByClerkId(clerkId: string): Promise<UserDTO> {
    const user = await userRepository.findByClerkId(clerkId);
    if (!user) throw AppError.notFound('User');
    return toDTO(user);
  }

  async getMe(clerkId: string) {
    const user = await userRepository.findByClerkId(clerkId);
    if (!user) throw AppError.notFound('User');
    return {
      ...toDTO(user),
      buyerProfile: (user as any).buyerProfile ?? null,
      supplierProfile: (user as any).supplierProfile ?? null,
    };
  }

  async syncFromClerk(input: CreateUserInput): Promise<UserDTO> {
    const user = await userRepository.upsertFromClerk(input);
    return toDTO(user);
  }

  async deleteByClerkId(clerkId: string): Promise<void> {
    const user = await userRepository.findByClerkId(clerkId);
    if (!user) return;
    await userRepository.softDelete(clerkId);
  }

  async completeOnboarding(clerkId: string, input: CompleteOnboardingInput): Promise<UserDTO> {
    const user = await userRepository.findByClerkId(clerkId);
    if (!user) throw AppError.notFound('User');

    if (user.status === 'ACTIVE') {
      throw AppError.conflict('Onboarding already completed');
    }

    await userRepository.updateRole(user.id, input.role);

    if (input.role === 'BUYER') {
      await userRepository.createBuyerProfile(user.id, {
        companyName: input.companyName,
        gstin: input.gstin,
        billingAddress: input.billingAddress as any,
      });
    } else {
      await userRepository.createSupplierProfile(user.id, {
        businessName: input.businessName,
        gstin: input.gstin,
        description: input.description,
        website: input.website,
        establishedYear: input.establishedYear,
        address: input.address as any,
        serviceAreas: input.serviceAreas,
      });
    }

    // Write role back to Clerk publicMetadata so JWT carries it
    await clerk.users.updateUserMetadata(clerkId, {
      publicMetadata: {
        role: input.role,
        onboardingComplete: true,
      },
    });

    const updated = await userRepository.findByClerkId(clerkId);
    return toDTO(updated!);
  }

  async updateProfile(clerkId: string, data: { firstName?: string; lastName?: string; phone?: string }) {
    const user = await userRepository.findByClerkId(clerkId);
    if (!user) throw AppError.notFound('User');

    const updated = await userRepository.update(user.id, data);

    // Keep Clerk in sync
    if (data.firstName || data.lastName) {
      await clerk.users.updateUser(clerkId, {
        firstName: data.firstName ?? user.firstName,
        lastName: data.lastName ?? user.lastName,
      });
    }

    return toDTO(updated);
  }
}

export const userService = new UserService();
