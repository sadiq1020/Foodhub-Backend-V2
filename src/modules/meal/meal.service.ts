import { deleteFromCloudinary } from "../../config/cloudinary";
import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { QueryBuilder } from "../../utils/QueryBuilder";
import { ICreateMeal, IMealFilters, IUpdateMeal } from "./meal.interface";

const createMeal = async (data: ICreateMeal, userId: string) => {
  const provider = await prisma.providerProfiles.findUnique({
    where: { id: data.providerId },
    select: { id: true, userId: true, status: true },
  });

  if (!provider) throw new AppError(404, "Provider not found");
  if (provider.userId !== userId) {
    throw new AppError(
      403,
      "You can only create meals for your own provider profile",
    );
  }

  if (provider.status !== "APPROVED") {
    throw new AppError(
      403,
      "Your provider account is pending admin approval. You cannot create meals until approved.",
    );
  }

  const category = await prisma.category.findUnique({
    where: { id: data.categoryId },
    select: { id: true },
  });

  if (!category) throw new AppError(404, "Category not found");

  return prisma.meal.create({
    data: data as any,
    include: {
      category: true,
      provider: { select: { id: true, businessName: true } },
    },
  });
};

const getAllMeals = async (filters: IMealFilters) => {
  const {
    categoryId,
    dietary,
    minPrice,
    maxPrice,
    providerId,
    ...queryParams
  } = filters;

  const extraWhere: Record<string, any> = { isAvailable: true };

  if (categoryId) extraWhere.categoryId = categoryId;
  if (providerId) extraWhere.providerId = providerId;
  if (dietary) extraWhere.dietary = { has: dietary };
  if (minPrice !== undefined || maxPrice !== undefined) {
    extraWhere.price = {
      ...(minPrice !== undefined && { gte: minPrice }),
      ...(maxPrice !== undefined && { lte: maxPrice }),
    };
  }

  return new QueryBuilder(prisma.meal, queryParams, {
    searchableFields: ["name", "description"],
    defaultSortBy: "createdAt",
    defaultSortOrder: "desc",
    defaultLimit: 10,
  })
    .search()
    .paginate()
    .sort()
    .where(extraWhere)
    .execute({
      category: true,
      provider: { select: { id: true, businessName: true } },
    });
};

const getMealById = async (mealId: string) => {
  const result = await prisma.meal.findUnique({
    where: { id: mealId },
    include: {
      category: true,
      provider: { select: { id: true, businessName: true, address: true } },
      reviews: {
        include: { customer: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!result) throw new AppError(404, "Meal not found");

  const averageRating =
    result.reviews.length > 0
      ? result.reviews.reduce((sum, r) => sum + r.rating, 0) /
        result.reviews.length
      : 0;

  return {
    ...result,
    averageRating: Number(averageRating.toFixed(1)),
    totalReviews: result.reviews.length,
  };
};

const updateMeal = async (
  mealId: string,
  data: IUpdateMeal,
  userId: string,
) => {
  const meal = await prisma.meal.findUnique({
    where: { id: mealId },
    include: { provider: { select: { id: true, userId: true } } },
  });

  if (!meal) throw new AppError(404, "Meal not found");
  if (meal.provider.userId !== userId) {
    throw new AppError(403, "You can only update your own meals");
  }

  // If a new image was uploaded and the meal already has one,
  // delete the old image from Cloudinary to avoid orphaned files
  if (data.image && meal.image && meal.image !== data.image) {
    deleteFromCloudinary(meal.image).catch(() => {});
  }

  return prisma.meal.update({
    where: { id: mealId },
    data: data as any,
    include: {
      category: true,
      provider: { select: { id: true, businessName: true } },
    },
  });
};

const deleteMeal = async (mealId: string, userId: string) => {
  const meal = await prisma.meal.findUnique({
    where: { id: mealId },
    include: { provider: { select: { id: true, userId: true } } },
  });

  if (!meal) throw new AppError(404, "Meal not found");
  if (meal.provider.userId !== userId) {
    throw new AppError(403, "You can only delete your own meals");
  }

  // Delete image from Cloudinary when meal is deleted
  if (meal.image) {
    deleteFromCloudinary(meal.image).catch(() => {});
  }

  await prisma.meal.delete({ where: { id: mealId } });
  return { message: "Meal deleted successfully" };
};

const getMyMeals = async (userId: string) => {
  const provider = await prisma.providerProfiles.findUnique({
    where: { userId },
    select: { id: true },
  });

  if (!provider) throw new AppError(404, "Provider profile not found");

  return prisma.meal.findMany({
    where: { providerId: provider.id },
    include: {
      category: { select: { id: true, name: true } },
      _count: { select: { reviews: true } },
    },
    orderBy: { createdAt: "desc" },
  });
};

export const mealService = {
  createMeal,
  getAllMeals,
  getMealById,
  updateMeal,
  deleteMeal,
  getMyMeals,
};
