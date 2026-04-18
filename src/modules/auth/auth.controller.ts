import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync";
import { authService } from "./auth.service";

// POST /auth/forgot-password
// Public — no auth required
const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.forgotPassword(req.body);
  res.status(200).json({
    success: true,
    message: result.message,
  });
});

// POST /auth/reset-password
// Public — no auth required (user doesn't have a session yet)
const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.resetPassword(req.body);
  res.status(200).json({
    success: true,
    message: result.message,
  });
});

// POST /auth/change-password
// Protected — user must be logged in
const changePassword = catchAsync(async (req: Request, res: Response) => {
  const userId = req.user!.id;
  const result = await authService.changePassword(userId, req.body);
  res.status(200).json({
    success: true,
    message: result.message,
  });
});

export const authController = {
  forgotPassword,
  resetPassword,
  changePassword,
};
