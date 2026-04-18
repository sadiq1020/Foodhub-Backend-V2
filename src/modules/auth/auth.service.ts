import { hashPassword, verifyPassword } from "better-auth/crypto";
import AppError from "../../errors/AppError";
import { auth } from "../../lib/auth";
import { prisma } from "../../lib/prisma";
import {
  IChangePasswordPayload,
  IForgotPasswordPayload,
  IResetPasswordPayload,
} from "./auth.interface";

const forgotPassword = async (payload: IForgotPasswordPayload) => {
  const { email } = payload;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, emailVerified: true, isActive: true },
  });

  // Always return the same message — prevents user enumeration attacks
  if (!user) {
    return {
      message:
        "If an account with that email exists, an OTP has been sent to it.",
    };
  }

  if (!user.isActive) {
    throw new AppError(
      403,
      "Your account has been suspended. Please contact support.",
    );
  }

  if (!user.emailVerified) {
    throw new AppError(
      400,
      "Your email is not verified. Please verify your email before resetting your password.",
    );
  }

  await auth.api.sendVerificationOTP({
    body: {
      email,
      type: "forget-password",
    },
  });

  return {
    message:
      "If an account with that email exists, an OTP has been sent to it.",
  };
};

const resetPassword = async (payload: IResetPasswordPayload) => {
  const { email, otp, newPassword } = payload;

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true, isActive: true, emailVerified: true },
  });

  if (!user) {
    throw new AppError(404, "No account found with this email address.");
  }

  if (!user.isActive) {
    throw new AppError(
      403,
      "Your account has been suspended. Please contact support.",
    );
  }

  // Wrap Better Auth's call in try/catch — it throws its own error on wrong OTP
  // instead of returning null, so we catch it and replace with a clean message
  try {
    const result = await auth.api.resetPasswordEmailOTP({
      body: { email, otp, password: newPassword },
    });

    if (!result) {
      throw new AppError(
        400,
        "Invalid or expired OTP. Please request a new one.",
      );
    }
  } catch (error: any) {
    // If it's already our AppError, re-throw it as-is
    if (error.isOperational) throw error;

    // Otherwise it's a Better Auth error — give a clean message
    throw new AppError(
      400,
      "Invalid or expired OTP. Please request a new one.",
    );
  }

  // Wipe all sessions after successful reset
  await prisma.session.deleteMany({
    where: { userId: user.id },
  });

  return {
    message:
      "Password reset successfully. Please log in with your new password.",
  };
};

const changePassword = async (
  userId: string,
  payload: IChangePasswordPayload,
) => {
  const { currentPassword, newPassword } = payload;

  // 1. Get the account record (includes the id we need for the update)
  const account = await prisma.account.findFirst({
    where: {
      userId,
      providerId: "credential",
    },
    select: { id: true, password: true }, // ← add id here
  });

  if (!account || !account.password) {
    throw new AppError(
      400,
      "No password found for this account. You may have signed up with a social provider.",
    );
  }

  // 2. Verify current password
  const isCurrentPasswordValid = await verifyPassword({
    hash: account.password,
    password: currentPassword,
  });

  if (!isCurrentPasswordValid) {
    throw new AppError(401, "Current password is incorrect.");
  }

  // 3. Hash the new password
  const newPasswordHash = await hashPassword(newPassword);

  // 4. Update using the account's own id — not the compound key
  await prisma.account.update({
    where: { id: account.id }, // ← use id directly
    data: { password: newPasswordHash },
  });

  // 5. Wipe all sessions
  await prisma.session.deleteMany({
    where: { userId },
  });

  return { message: "Password changed successfully. Please log in again." };
};

export const authService = {
  forgotPassword,
  resetPassword,
  changePassword,
};
