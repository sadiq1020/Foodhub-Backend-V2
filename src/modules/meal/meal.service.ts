import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { ICreateMeal, IMealFilters, IUpdateMeal } from "./meal.interface";

// create a meal with validation
const createMeal = async (data: ICreateMeal, userId: string) => {
  // 1. Verify provider exists
  const provider = await prisma.providerProfiles.findUnique({
    where: { id: data.providerId },
    select: { id: true, userId: true },
  });

  if (!provider) {
    throw new AppError(404, "Provider not found");
  }

  // 2. Verify provider's userId matches authenticated user
  if (provider.userId !== userId) {
    throw new AppError(
      403,
      "You can only create meals for your own provider profile",
    );
  }

  // 3. Verify category exists
  const category = await prisma.category.findUnique({
    where: { id: data.categoryId },
    select: { id: true },
  });

  if (!category) {
    throw new AppError(404, "Category not found");
  }

  // 4. Create meal
  const result = await prisma.meal.create({
    data,
    include: {
      category: true,
      provider: {
        select: {
          id: true,
          businessName: true,
        },
      },
    },
  });

  return result;
};

// get all meals with filters - KEEP USING THE ORIGINAL PRISMA IMPORT
const getAllMeals = async (filters: IMealFilters) => {
  const { categoryId, dietary, minPrice, maxPrice, search, providerId } =
    filters;

  const result = await prisma.meal.findMany({
    // ... rest stays exactly the same
    where: {
      isAvailable: true,
      ...(categoryId && { categoryId }),
      ...(providerId && { providerId }),
      ...(dietary && { dietary: { has: dietary } }),
      price: {
        ...(minPrice !== undefined && { gte: minPrice }),
        ...(maxPrice !== undefined && { lte: maxPrice }),
      },
      ...(search && {
        OR: [
          { name: { contains: search, mode: "insensitive" } },
          { description: { contains: search, mode: "insensitive" } },
        ],
      }),
    },
    include: {
      category: true,
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
  });

  return result;
};

// get meal by id - KEEP USING THE ORIGINAL PRISMA IMPORT
const getMealById = async (mealId: string) => {
  const result = await prisma.meal.findUnique({
    // ... rest stays exactly the same
    where: { id: mealId },
    include: {
      category: true,
      provider: {
        select: {
          id: true,
          businessName: true,
          address: true,
        },
      },
      reviews: {
        include: {
          customer: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
    },
  });

  if (!result) {
    throw new AppError(404, "Meal not found");
  }

  const averageRating =
    result.reviews.length > 0
      ? result.reviews.reduce((sum, review) => sum + review.rating, 0) /
        result.reviews.length
      : 0;

  return {
    ...result,
    averageRating: Number(averageRating.toFixed(1)),
    totalReviews: result.reviews.length,
  };
};

// update a meal
const updateMeal = async (
  mealId: string,
  data: IUpdateMeal,
  userId: string,
) => {
  // 1. Find meal by id with provider info
  const meal = await prisma.meal.findUnique({
    where: { id: mealId },
    include: {
      provider: {
        select: { id: true, userId: true },
      },
    },
  });

  // 2. Verify meal exists
  if (!meal) {
    throw new AppError(404, "Meal not found");
  }

  // 3. Verify meal.provider.userId matches authenticated user
  if (meal.provider.userId !== userId) {
    throw new AppError(403, "You can only update your own meals");
  }

  // 4. Update meal
  const result = await prisma.meal.update({
    where: { id: mealId },
    data,
    include: {
      category: true,
      provider: {
        select: {
          id: true,
          businessName: true,
        },
      },
    },
  });

  // 5. Return updated meal
  return result;
};

// delete a meal
const deleteMeal = async (mealId: string, userId: string) => {
  // 1. Find meal by id with provider info
  const meal = await prisma.meal.findUnique({
    where: { id: mealId },
    include: {
      provider: {
        select: { id: true, userId: true },
      },
    },
  });

  // 2. Verify meal exists
  if (!meal) {
    throw new AppError(404, "Meal not found");
  }

  // 3. Verify meal.provider.userId matches authenticated user
  if (meal.provider.userId !== userId) {
    throw new AppError(403, "You can only delete your own meals");
  }

  // 4. Delete meal (Prisma will cascade delete related orderItems and reviews)
  await prisma.meal.delete({
    where: { id: mealId },
  });

  // 5. Return success message
  return { message: "Meal deleted successfully" };
};

// get meals created by this provider
const getMyMeals = async (userId: string) => {
  // 1. Find the provider profile for this user
  const provider = await prisma.providerProfiles.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!provider) {
    throw new AppError(404, "Provider profile not found");
  }

  // 2. Get all meals for this provider
  const meals = await prisma.meal.findMany({
    where: {
      providerId: provider.id,
    },
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
      _count: {
        select: {
          reviews: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return meals;
};

export const mealService = {
  createMeal,
  getAllMeals,
  getMealById,
  updateMeal,
  deleteMeal,
  getMyMeals,
};
