import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync";
import { authService } from "./auth.service";

const forgotPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.forgotPassword(req.body);
  res.status(200).json({ success: true, message: result.message });
});

const resetPassword = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.resetPassword(req.body);
  res.status(200).json({ success: true, message: result.message });
});

const changePassword = catchAsync(async (req: Request, res: Response) => {
  const result = await authService.changePassword(req.user!.id, req.body);
  res.status(200).json({ success: true, message: result.message });
});

export const authController = {
  forgotPassword,
  resetPassword,
  changePassword,
};
