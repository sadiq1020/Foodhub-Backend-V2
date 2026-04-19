import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { IQueryParams, QueryBuilder } from "../../utils/QueryBuilder";
import { IUpdateProfile } from "./user.interface";

/*
// get all users (Admin only)
const getAllUsers = async (filters: IUserFilters) => {
  const { role, isActive, search } = filters;

  const users = await prisma.user.findMany({
    where: {
      // Filter by role
      ...(role && { role: role as any }),

      // Filter by active status
      ...(isActive !== undefined && { isActive }),

      // Search by name or email
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { email: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: {
      createdAt: "desc", // Most recent users first
    },
  });

  return users;
};
*/

// get all users (Admin only)
// const getAllUsers = async () => {
//   const users = await prisma.user.findMany({
//     select: {
//       id: true,
//       name: true,
//       email: true,
//       phone: true,
//       role: true,
//       isActive: true,
//       emailVerified: true,
//       createdAt: true,
//       updatedAt: true,
//     },
//     orderBy: {
//       createdAt: "desc",
//     },
//   });

//   return users;
// };

const getAllUsers = async (queryParams: IQueryParams) => {
  const result = await new QueryBuilder(prisma.user, queryParams, {
    searchableFields: ["name", "email"],
    filterableFields: ["role", "isActive"],
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    defaultLimit: 10,
  })
    .search()
    .filter()
    .paginate()
    .sort()
    .execute();

  // Remove sensitive fields from result — select isn't available in QueryBuilder
  // so we strip them manually after fetch
  return {
    ...result,
    data: result.data.map((user: any) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isActive: user.isActive,
      emailVerified: user.emailVerified,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    })),
  };
};

// update user status (suspend/activate, only admin)
const updateUserStatus = async (userId: string, isActive: boolean) => {
  // 1. Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, role: true, isActive: true },
  });

  if (!user) {
    throw new AppError(404, "User not found");
  }

  // 2. Prevent admin from suspending themselves
  // Note: You'll need to pass the admin's ID to check this
  // For now I am skipping it

  // 3. Prevent suspending other admins (optional security)
  if (user.role === "ADMIN") {
    throw new AppError(403, "Cannot change status of admin users");
  }

  // 4. Update user status
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: { isActive },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isActive: true,
      emailVerified: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // 5. Return updated user
  return updatedUser;
};

// update customer profile (Customer only - their own profile)
const updateProfile = async (userId: string, data: IUpdateProfile) => {
  // 1. Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });

  if (!user) {
    throw new Error("User not found");
  }

  // 2. Update profile
  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: {
      name: data.name,
      phone: data.phone || null,
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // 3. Return updated user
  return updatedUser;
};

export const userService = {
  getAllUsers,
  updateUserStatus,
  updateProfile,
};
