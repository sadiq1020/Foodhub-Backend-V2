import { z } from "zod";

export const forgotPasswordSchema = z.object({
  email: z.email("Please provide a valid email address"),
});

export const resetPasswordSchema = z.object({
  email: z.email("Please provide a valid email address"),

  otp: z
    .string("OTP must be a string")
    .length(6, "OTP must be exactly 6 digits")
    .regex(/^[0-9]{6}$/, "OTP must contain only digits"),

  newPassword: z
    .string("Password must be a string")
    .min(8, "Password must be at least 8 characters")
    .max(64, "Password must not exceed 64 characters"),
});

export const changePasswordSchema = z.object({
  currentPassword: z
    .string("Current password must be a string")
    .min(1, "Current password is required"),

  newPassword: z
    .string("New password must be a string")
    .min(8, "New password must be at least 8 characters")
    .max(64, "New password must not exceed 64 characters"),
});
