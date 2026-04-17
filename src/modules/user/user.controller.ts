import { Request, Response } from "express";
import AppError from "../../errors/AppError";
import catchAsync from "../../shared/catchAsync";
import { IUpdateProfile } from "./user.interface";
import { userService } from "./user.service";

const getAllUsers = catchAsync(async (req: Request, res: Response) => {
  const users = await userService.getAllUsers();
  res.status(200).json({
    success: true,
    message: "Users retrieved successfully",
    data: users,
    total: users.length,
  });
});

const updateUserStatus = catchAsync(async (req: Request, res: Response) => {
  const userId = req.params.id as string;
  const { isActive } = req.body;
  if (!userId) throw new AppError(400, "User ID is required");
  if (typeof isActive !== "boolean") {
    throw new AppError(400, "isActive must be a boolean");
  }
  const user = await userService.updateUserStatus(userId, isActive);
  res.status(200).json({
    success: true,
    message: `User ${isActive ? "activated" : "suspended"} successfully`,
    data: user,
  });
});

const updateProfile = catchAsync(async (req: Request, res: Response) => {
  const { name, phone } = req.body;
  if (!name || name.trim().length < 2) {
    throw new AppError(400, "Name must be at least 2 characters");
  }
  if (phone && !/^[0-9]{10,15}$/.test(phone)) {
    throw new AppError(400, "Phone must be 10-15 digits");
  }
  const updateData: IUpdateProfile = {
    name: name.trim(),
    phone: phone || null,
  };
  const updatedUser = await userService.updateProfile(req.user!.id, updateData);
  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: updatedUser,
  });
});

export const userController = {
  getAllUsers,
  updateUserStatus,
  updateProfile,
};
