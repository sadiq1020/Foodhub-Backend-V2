import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { IQueryParams, QueryBuilder } from "../../utils/QueryBuilder";
import {
  ICreateProviderProfile,
  IUpdateProviderProfile,
} from "./provider.interface";

// ── Top providers for landing page ────────────────────────────────────────────
// Ranks APPROVED providers by number of available meals (desc).
// Also computes an average rating across all their meals' reviews.
const getTopProviders = async (limit = 3) => {
  const providers = await prisma.providerProfiles.findMany({
    where: { status: "APPROVED" },
    include: {
      _count: {
        select: { meals: true },
      },
      meals: {
        where: { isAvailable: true },
        select: {
          id: true,
          name: true,
          image: true,
          price: true,
          reviews: {
            select: { rating: true },
          },
        },
      },
    },
  });

  // Compute derived stats per provider
  const ranked = providers
    .map((p) => {
      const allRatings = p.meals.flatMap((m) => m.reviews.map((r) => r.rating));
      const avgRating =
        allRatings.length > 0
          ? Number(
              (
                allRatings.reduce((a, b) => a + b, 0) / allRatings.length
              ).toFixed(1),
            )
          : null;

      // Pick up to 3 meal images for the card preview strip
      const mealPreviews = p.meals
        .filter((m) => m.image)
        .slice(0, 3)
        .map((m) => ({ id: m.id, name: m.name, image: m.image }));

      return {
        id: p.id,
        businessName: p.businessName,
        description: p.description,
        address: p.address,
        logo: p.logo,
        totalMeals: p.meals.length, // available meals only
        totalReviews: allRatings.length,
        avgRating,
        mealPreviews,
      };
    })
    // Rank by available meal count, then by avg rating as tiebreaker
    .sort((a, b) =>
      b.totalMeals !== a.totalMeals
        ? b.totalMeals - a.totalMeals
        : (b.avgRating ?? 0) - (a.avgRating ?? 0),
    )
    .slice(0, limit);

  return ranked;
};

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
  getTopProviders,
  createProviderProfile,
  getMyProfile,
  updateMyProfile,
  getProviderById,
  getMyOrders,
  getAllProviders,
};
