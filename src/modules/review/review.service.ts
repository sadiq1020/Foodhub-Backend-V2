import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma";
import { ICreateReview, IUpdateReview } from "./review.interface";

// create review (Customer only, after order delivered)
const createReview = async (data: ICreateReview) => {
  // 1. Check if meal exists
  const meal = await prisma.meal.findUnique({
    where: { id: data.mealId },
    select: { id: true, name: true },
  });

  if (!meal) {
    throw new Error("Meal not found");
  }

  // 2. Check if customer has ordered this meal and it was delivered
  const hasOrderedMeal = await prisma.order.findFirst({
    where: {
      customerId: data.customerId,
      status: "DELIVERED",
      items: {
        some: {
          mealId: data.mealId,
        },
      },
    },
  });

  if (!hasOrderedMeal) {
    throw new Error("You can only review meals from your delivered orders");
  }

  // 3. Check if customer already reviewed this meal
  const existingReview = await prisma.review.findFirst({
    where: {
      customerId: data.customerId,
      mealId: data.mealId,
    },
  });

  if (existingReview) {
    throw new Error("You have already reviewed this meal");
  }

  // 4. Validate rating (1-5)
  if (data.rating < 1 || data.rating > 5) {
    throw new Error("Rating must be between 1 and 5");
  }

  // 5. Create review
  const review = await prisma.review.create({
    data: data as any,
    include: {
      customer: {
        select: {
          id: true,
          name: true,
        },
      },
      meal: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return review;
};

const updateReview = async (
  reviewId: string,
  userId: string,
  data: IUpdateReview,
) => {
  // 1. Find the review
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, customerId: true },
  });

  if (!review) throw new AppError(404, "Review not found");

  // 2. Only the customer who wrote it can update it
  if (review.customerId !== userId) {
    throw new AppError(403, "You can only update your own reviews");
  }

  // 3. Validate rating if provided
  if (data.rating !== undefined && (data.rating < 1 || data.rating > 5)) {
    throw new AppError(400, "Rating must be between 1 and 5");
  }

  // 4. Update review
  return prisma.review.update({
    where: { id: reviewId },
    data: data as any,
    include: {
      customer: { select: { id: true, name: true } },
      meal: { select: { id: true, name: true } },
    },
  });
};

const deleteReview = async (reviewId: string, userId: string) => {
  // 1. Find the review
  const review = await prisma.review.findUnique({
    where: { id: reviewId },
    select: { id: true, customerId: true },
  });

  if (!review) throw new AppError(404, "Review not found");

  // 2. Only the customer who wrote it can delete it
  if (review.customerId !== userId) {
    throw new AppError(403, "You can only delete your own reviews");
  }

  // 3. Delete
  await prisma.review.delete({ where: { id: reviewId } });

  return { message: "Review deleted successfully" };
};

export const reviewService = {
  createReview,
  updateReview,
  deleteReview,
};
