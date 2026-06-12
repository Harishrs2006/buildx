import { UserRole, UserStatus } from '@prisma/client';

export { UserRole, UserStatus };

export interface UserDTO {
  id: string;
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string | null;
  avatarUrl: string | null;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
}

export interface CreateUserInput {
  clerkId: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  phone?: string;
}

export interface UpdateUserInput {
  firstName?: string;
  lastName?: string;
  phone?: string;
  avatarUrl?: string;
}

export interface CompleteOnboardingInput {
  role: 'BUYER' | 'SUPPLIER';
  // Buyer fields
  companyName?: string;
  gstin?: string;
  billingAddress?: Record<string, string>;
  // Supplier fields
  businessName?: string;
  description?: string;
  website?: string;
  establishedYear?: number;
  address?: Record<string, string>;
  serviceAreas?: string[];
}
