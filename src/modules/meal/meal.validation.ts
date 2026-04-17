import { z } from "zod";

const ALLOWED_DIETARY = [
  "vegetarian",
  "vegan",
  "gluten-free",
  "halal",
  "non-vegetarian",
] as const;

export const createMealSchema = z.object({
  name: z
    .string("Meal name must be a string")
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters")
    .trim(),

  description: z
    .string()
    .max(500, "Description must not exceed 500 characters")
    .trim()
    .optional(),

  // z.coerce.number() handles the case where price comes in as a string
  // (e.g. from form-data). If it's already a number it passes straight through.
  price: z.coerce
    .number("Price must be a number")
    .positive("Price must be greater than 0")
    .max(100000, "Price seems too high"),

  image: z.url("Image must be a valid URL").optional(),

  categoryId: z.uuid("Category ID must be a valid UUID"),

  providerId: z.uuid("Provider ID must be a valid UUID"),

  dietary: z.enum(ALLOWED_DIETARY).array().optional(),

  isAvailable: z.boolean().optional(),
});

export const updateMealSchema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters")
    .trim()
    .optional(),

  description: z
    .string()
    .max(500, "Description must not exceed 500 characters")
    .trim()
    .optional(),

  price: z.coerce
    .number("Price must be a number")
    .positive("Price must be greater than 0")
    .max(100000, "Price seems too high")
    .optional(),

  image: z.url("Image must be a valid URL").optional(),

  categoryId: z.uuid("Category ID must be a valid UUID").optional(),

  dietary: z.enum(ALLOWED_DIETARY).array().optional(),

  isAvailable: z.boolean().optional(),
});
