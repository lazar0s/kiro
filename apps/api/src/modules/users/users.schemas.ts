import { z } from 'zod';
import { UserRole } from '@laundry/shared';

const RoleEnum = z.nativeEnum(UserRole);

export const UserIdParams = z.object({
  id: z.string().uuid(),
});
export type UserIdParams = z.infer<typeof UserIdParams>;

export const ListUsersQuery = z.object({
  role: RoleEnum.optional(),
  isActive: z
    .union([z.boolean(), z.enum(['true', 'false'])])
    .transform((v) => (typeof v === 'boolean' ? v : v === 'true'))
    .optional(),
  search: z.string().min(1).max(100).optional(),
});
export type ListUsersQuery = z.infer<typeof ListUsersQuery>;

export const CreateUserBody = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(100),
  role: RoleEnum,
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(128),
  phone: z.string().max(20).optional(),
  locationId: z.string().uuid().optional(),
});
export type CreateUserBody = z.infer<typeof CreateUserBody>;

export const UpdateUserBody = z
  .object({
    name: z.string().min(1).max(100).optional(),
    role: RoleEnum.optional(),
    phone: z.string().max(20).nullable().optional(),
    locationId: z.string().uuid().nullable().optional(),
    isActive: z.boolean().optional(),
    password: z.string().min(8).max(128).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'At least one field must be provided',
  });
export type UpdateUserBody = z.infer<typeof UpdateUserBody>;

export interface UserPublic {
  id: string;
  email: string;
  phone: string | null;
  name: string;
  role: string;
  locationId: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
