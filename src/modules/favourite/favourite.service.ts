import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma";

// Add a meal to favourites
// If already favourited, throws a 409
const addFavourite = async (customerId: string, mealId: string) => {
  // Check meal exists
  const meal = await prisma.meal.findUnique({
    where: { id: mealId },
    select: { id: true, name: true },
  });

  if (!meal) throw new AppError(404, "Meal not found");

  // Check already favourited
  const existing = await prisma.favourite.findUnique({
    where: {
      customerId_mealId: { customerId, mealId },
    },
  });

  if (existing) throw new AppError(409, "Meal is already in your favourites");

  const favourite = await prisma.favourite.create({
    data: { customerId, mealId },
    include: {
      meal: {
        select: {
          id: true,
          name: true,
          image: true,
          price: true,
          provider: { select: { id: true, businessName: true } },
          category: { select: { id: true, name: true } },
        },
      },
    },
  });

  return favourite;
};

// Remove a meal from favourites
const removeFavourite = async (customerId: string, mealId: string) => {
  const existing = await prisma.favourite.findUnique({
    where: {
      customerId_mealId: { customerId, mealId },
    },
  });

  if (!existing) throw new AppError(404, "Meal is not in your favourites");

  await prisma.favourite.delete({
    where: {
      customerId_mealId: { customerId, mealId },
    },
  });

  return { message: "Meal removed from favourites" };
};

// Get all favourited meals for a customer
const getMyFavourites = async (customerId: string) => {
  const favourites = await prisma.favourite.findMany({
    where: { customerId },
    include: {
      meal: {
        select: {
          id: true,
          name: true,
          image: true,
          price: true,
          isAvailable: true,
          dietary: true,
          provider: { select: { id: true, businessName: true } },
          category: { select: { id: true, name: true } },
          reviews: {
            select: { rating: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Add average rating to each meal
  return favourites.map((fav) => ({
    id: fav.id,
    createdAt: fav.createdAt,
    meal: {
      ...fav.meal,
      averageRating:
        fav.meal.reviews.length > 0
          ? Number(
              (
                fav.meal.reviews.reduce((sum, r) => sum + r.rating, 0) /
                fav.meal.reviews.length
              ).toFixed(1),
            )
          : 0,
      totalReviews: fav.meal.reviews.length,
      reviews: undefined, // strip raw reviews from response
    },
  }));
};

// Check if a specific meal is favourited by the customer
// Used by frontend to show filled/unfilled bookmark icon
const isFavourited = async (customerId: string, mealId: string) => {
  const existing = await prisma.favourite.findUnique({
    where: {
      customerId_mealId: { customerId, mealId },
    },
  });

  return { isFavourited: !!existing };
};

export const favouriteService = {
  addFavourite,
  removeFavourite,
  getMyFavourites,
  isFavourited,
};
