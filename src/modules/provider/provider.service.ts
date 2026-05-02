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

// create new provider profile
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
  const profile = await prisma.providerProfiles.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) {
    throw new AppError(404, "Provider profile not found");
  }

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

  return updatedProfile;
};

// get orders for my meals (Provider only)
const getMyOrders = async (userId: string) => {
  const profile = await prisma.providerProfiles.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) {
    throw new AppError(404, "Provider profile not found");
  }

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
            providerId: profile.id,
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
      createdAt: "desc",
    },
  });

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

// get all provider profiles (Public) — supports pagination/search/sort
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

// ── Provider dashboard stats & chart data ────────────────────────────────────
const getMyStats = async (userId: string) => {
  const profile = await prisma.providerProfiles.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!profile) throw new AppError(404, "Provider profile not found");

  const providerId = profile.id;

  const [totalMeals, availableMeals] = await Promise.all([
    prisma.meal.count({ where: { providerId } }),
    prisma.meal.count({ where: { providerId, isAvailable: true } }),
  ]);

  const providerOrders = await prisma.order.findMany({
    where: { items: { some: { meal: { providerId } } } },
    select: { id: true, status: true, total: true, createdAt: true },
  });

  const totalOrders = providerOrders.length;
  const totalRevenue = providerOrders
    .filter((o) => o.status === "DELIVERED")
    .reduce((sum, o) => sum + Number(o.total), 0);

  // Orders by status — pie chart
  const statusCounts: Record<string, number> = {
    PLACED: 0,
    PREPARING: 0,
    READY: 0,
    DELIVERED: 0,
    CANCELLED: 0,
  };
  providerOrders.forEach((o) => {
    if (o.status in statusCounts)
      statusCounts[o.status] = (statusCounts[o.status] ?? 0) + 1;
  });

  const ordersByStatus = [
    { name: "Placed", value: statusCounts.PLACED, fill: "#6366f1" },
    { name: "Preparing", value: statusCounts.PREPARING, fill: "#f59e0b" },
    { name: "Ready", value: statusCounts.READY, fill: "#3b82f6" },
    { name: "Delivered", value: statusCounts.DELIVERED, fill: "#10b981" },
    { name: "Cancelled", value: statusCounts.CANCELLED, fill: "#ef4444" },
  ];

  // Revenue per day last 7 days — bar chart
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const dayMap: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
    dayMap[label] = 0;
  }

  // Count ALL orders (any status) placed in the last 7 days
  providerOrders
    .filter((o) => new Date(o.createdAt) >= sevenDaysAgo)
    .forEach((o) => {
      const label = new Date(o.createdAt).toLocaleDateString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
      });
      if (label in dayMap) dayMap[label] = (dayMap[label] ?? 0) + 1;
    });

  const ordersLast7Days = Object.entries(dayMap).map(([day, orders]) => ({
    day,
    orders,
  }));

  // Reviews
  const reviews = await prisma.review.findMany({
    where: { meal: { providerId } },
    select: { rating: true },
  });

  const totalReviews = reviews.length;
  const avgRating =
    totalReviews > 0
      ? Number(
          (reviews.reduce((s, r) => s + r.rating, 0) / totalReviews).toFixed(1),
        )
      : null;

  return {
    totalMeals,
    availableMeals,
    totalOrders,
    totalRevenue: Math.round(totalRevenue),
    totalReviews,
    avgRating,
    ordersByStatus,
    ordersLast7Days,
  };
};

export const providerService = {
  getTopProviders,
  createProviderProfile,
  getMyProfile,
  updateMyProfile,
  getProviderById,
  getMyOrders,
  getAllProviders,
  getMyStats,
};
