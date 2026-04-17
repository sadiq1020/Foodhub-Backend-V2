import { z } from "zod";

export const createOrderSchema = z.object({
  deliveryAddress: z
    .string("Delivery address must be a string")
    .min(5, "Delivery address must be at least 5 characters")
    .max(300, "Delivery address must not exceed 300 characters")
    .trim(),

  phone: z
    .string("Phone number must be a string")
    .regex(
      /^[0-9]{10,15}$/,
      "Phone must contain only digits and be 10–15 characters long",
    ),

  notes: z
    .string()
    .max(300, "Notes must not exceed 300 characters")
    .trim()
    .optional(),

  items: z
    .array(
      z.object({
        mealId: z.uuid("Each meal ID must be a valid UUID"),
        quantity: z
          .number("Quantity must be a number")
          .int("Quantity must be a whole number")
          .min(1, "Quantity must be at least 1")
          .max(50, "Quantity cannot exceed 50 per item"),
      }),
    )
    .min(1, "Order must contain at least one item")
    .max(20, "Order cannot contain more than 20 different items"),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(["PREPARING", "READY", "DELIVERED"], {
    error: "Status must be one of: PREPARING, READY, DELIVERED",
  }),
});
