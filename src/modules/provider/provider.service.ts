import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { IQueryParams, QueryBuilder } from "../../utils/QueryBuilder";
import {
  ICreateProviderProfile,
  IUpdateProviderProfile,
} from "./provider.interface";

// create new category
const createProviderProfile = async (data: ICreateProviderProfile) => {
  const existing = await prisma.providerProfiles.findUnique({
    where: { userId: data.userId },
  });
  if (existing) {
    throw new AppError(
      409,
      "A provider profile already exists for this account",
    );
  }
  return prisma.providerProfiles.create({ data: data as any });
};

// get my provider profile
const getMyProfile = async (userId: string) => {
  // Find provider profile by userId
  const profile = await prisma.providerProfiles.findUnique({
    where: { userId },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
        },
      },
      meals: {
        select: {
          id: true,
          name: true,
          price: true,
          image: true,
          isAvailable: true,
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      _count: {
        select: {
          meals: true,
        },
      },
    },
  });

  // If no profile exists
  if (!profile) {
    throw new AppError(404, "Provider profile not found");
  }

  return profile;
};

// update my provider profile
const updateMyProfile = async (
  userId: string,
  data: IUpdateProviderProfile,
) => {
  // 1. Find provider profile by userId
  const profile = await prisma.providerProfiles.findUnique({
    where: { userId },
    select: { id: true },
  });

  // 2. Verify profile exists
  if (!profile) {
    throw new AppError(404, "Provider profile not found");
  }

  // 3. Update provider profile
  const updatedProfile = await prisma.providerProfiles.update({
    where: { id: profile.id },
    data,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
        },
      },
      _count: {
        select: {
          meals: true,
        },
      },
    },
  });

  // 4. Return updated profile
  return updatedProfile;
};

// get orders for my meals (Provider only)
const getMyOrders = async (userId: string) => {
  // 1. Find provider profile by userId
  const profile = await prisma.providerProfiles.findUnique({
    where: { userId },
    select: { id: true },
  });

  // 2. Verify profile exists
  if (!profile) {
    throw new AppError(404, "Provider profile not found");
  }

  // 3. Find all orders that contain meals from this provider
  const orders = await prisma.order.findMany({
    where: {
      items: {
        some: {
          meal: {
            providerId: profile.id,
          },
        },
      },
    },
    include: {
      items: {
        where: {
          meal: {
            providerId: profile.id, // it means -> Only include items from this provider
          },
        },
        include: {
          meal: {
            select: {
              id: true,
              name: true,
              image: true,
              price: true,
            },
          },
        },
      },
      customer: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc", // Most recent orders will show at first
    },
  });

  // 4. Return orders
  return orders;
};

// get provider profile by ID (Public)
const getProviderById = async (providerId: string) => {
  const profile = await prisma.providerProfiles.findUnique({
    where: { id: providerId },
    include: {
      meals: {
        where: {
          isAvailable: true,
        },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
          provider: {
            select: {
              id: true,
              businessName: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      _count: {
        select: {
          meals: true,
        },
      },
    },
  });

  if (!profile) {
    throw new AppError(404, "Provider profile not found");
  }
  if (profile.status !== "APPROVED") {
    return { ...profile, meals: [] };
  }

  return profile;
};

// get all provider profiles (Public)
// const getAllProviders = async () => {
//   const providers = await prisma.providerProfiles.findMany({
//     select: {
//       id: true,
//       businessName: true,
//       description: true,
//       address: true,
//       logo: true,
//       createdAt: true,
//       _count: {
//         select: {
//           meals: true,
//         },
//       },
//     },
//     orderBy: {
//       businessName: "asc",
//     },
//   });

//   return providers;
// };

// NOW uses QueryBuilder — supports ?page=1&limit=10&search=burger&sortBy=businessName
const getAllProviders = async (queryParams: IQueryParams) => {
  return new QueryBuilder(prisma.providerProfiles, queryParams, {
    searchableFields: ["businessName", "description", "address"],
    defaultSortBy: "businessName",
    defaultSortOrder: "asc",
    defaultLimit: 12,
  })
    .search()
    .paginate()
    .sort()
    .where({ status: "APPROVED" })
    .execute({
      _count: { select: { meals: true } },
    });
};

export const providerService = {
  createProviderProfile,
  getMyProfile,
  updateMyProfile,
  getProviderById,
  getMyOrders,
  getAllProviders,
};
