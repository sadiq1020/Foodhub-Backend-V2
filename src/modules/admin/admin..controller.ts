import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync";
import { adminService } from "./admin.service";

const getStats = catchAsync(async (req: Request, res: Response) => {
  const stats = await adminService.getStats();
  res.status(200).json({
    success: true,
    message: "Stats retrieved successfully",
    data: stats,
  });
});

export const adminController = {
  getStats,
};
