import { z } from "zod";

export const createProviderProfileSchema = z.object({
  businessName: z
    .string("Business name must be a string")
    .min(2, "Business name must be at least 2 characters")
    .max(100, "Business name must not exceed 100 characters")
    .trim(),

  description: z
    .string()
    .max(500, "Description must not exceed 500 characters")
    .trim()
    .optional(),

  address: z
    .string("Address must be a string")
    .min(5, "Address must be at least 5 characters")
    .max(300, "Address must not exceed 300 characters")
    .trim(),

  logo: z.url("Logo must be a valid URL").optional(),

  userId: z.string("User ID must be a string").min(1, "User ID is required"),
});

export const updateProviderProfileSchema = z.object({
  businessName: z
    .string()
    .min(2, "Business name must be at least 2 characters")
    .max(100, "Business name must not exceed 100 characters")
    .trim()
    .optional(),

  description: z
    .string()
    .max(500, "Description must not exceed 500 characters")
    .trim()
    .optional(),

  address: z
    .string()
    .min(5, "Address must be at least 5 characters")
    .max(300, "Address must not exceed 300 characters")
    .trim()
    .optional(),

  logo: z.url("Logo must be a valid URL").optional(),
});
