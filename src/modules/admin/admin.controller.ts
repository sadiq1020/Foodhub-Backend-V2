import { Request, Response } from "express";
import AppError from "../../errors/AppError";
import catchAsync from "../../shared/catchAsync";
import { adminService } from "./admin.service";

const getStats = catchAsync(async (req: Request, res: Response) => {
  const stats = await adminService.getStats();
  res.status(200).json({
    success: true,
    message: "Dashboard stats retrieved successfully",
    data: stats,
  });
});

// GET /admin/providers?status=PENDING
const getProvidersByStatus = catchAsync(async (req: Request, res: Response) => {
  const status = req.query.status as string | undefined;

  // Validate if status is provided
  if (status && !["PENDING", "APPROVED", "REJECTED"].includes(status)) {
    throw new AppError(
      400,
      "Status must be one of: PENDING, APPROVED, REJECTED",
    );
  }

  const providers = await adminService.getProvidersByStatus(status);
  res.status(200).json({
    success: true,
    message: "Providers retrieved successfully",
    data: providers,
    total: providers.length,
  });
});

// PATCH /admin/providers/:id/approve
const approveProvider = catchAsync(async (req: Request, res: Response) => {
  const providerId = req.params.id as string;
  if (!providerId) throw new AppError(400, "Provider ID is required");

  const provider = await adminService.approveProvider(providerId);
  res.status(200).json({
    success: true,
    message: `Provider "${provider.businessName}" has been approved`,
    data: provider,
  });
});

// PATCH /admin/providers/:id/reject
const rejectProvider = catchAsync(async (req: Request, res: Response) => {
  const providerId = req.params.id as string;
  if (!providerId) throw new AppError(400, "Provider ID is required");

  const { reason } = req.body;
  if (!reason || reason.trim().length < 5) {
    throw new AppError(
      400,
      "A rejection reason of at least 5 characters is required",
    );
  }

  const provider = await adminService.rejectProvider(providerId, reason.trim());
  res.status(200).json({
    success: true,
    message: `Provider "${provider.businessName}" has been rejected`,
    data: provider,
  });
});

export const adminController = {
  getStats,
  getProvidersByStatus,
  approveProvider,
  rejectProvider,
};
