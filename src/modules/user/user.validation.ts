import { z } from "zod";

export const updateProfileSchema = z.object({
  name: z
    .string("Name must be a string")
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name must not exceed 100 characters")
    .trim(),

  phone: z
    .string()
    .regex(
      /^[0-9]{10,15}$/,
      "Phone must contain only digits and be 10–15 characters long",
    )
    .optional()
    .nullable(),
});

export const updateUserStatusSchema = z.object({
  isActive: z.boolean("isActive must be true or false"),
});
