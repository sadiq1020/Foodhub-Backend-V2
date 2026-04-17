import { z } from "zod";

export const createReviewSchema = z.object({
  mealId: z.uuid("Meal ID must be a valid UUID"),

  rating: z
    .number("Rating must be a number")
    .int("Rating must be a whole number")
    .min(1, "Rating must be at least 1")
    .max(5, "Rating cannot exceed 5"),

  comment: z
    .string()
    .max(500, "Comment must not exceed 500 characters")
    .trim()
    .optional(),
});
