import { Request, Response } from "express";
import AppError from "../../errors/AppError";
import catchAsync from "../../shared/catchAsync";
import { providerService } from "./provider.service";

// ── Public: top providers for the landing page ────────────────────────────────
const getTopProviders = catchAsync(async (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 3, 10);
  const providers = await providerService.getTopProviders(limit);

  res.status(200).json({
    success: true,
    data: providers,
  });
});

const createProviderProfile = catchAsync(
  async (req: Request, res: Response) => {
    const result = await providerService.createProviderProfile(req.body);
    res.status(201).json({
      success: true,
      message:
        "Provider profile created successfully. Awaiting admin approval before you can list meals.",
      data: result,
    });
  },
);

const getMyProfile = catchAsync(async (req: Request, res: Response) => {
  const profile = await providerService.getMyProfile(req.user!.id);
  res.status(200).json({
    success: true,
    message: "Provider profile retrieved successfully",
    data: profile,
  });
});

const updateMyProfile = catchAsync(async (req: Request, res: Response) => {
  const profile = await providerService.updateMyProfile(req.user!.id, req.body);
  res.status(200).json({
    success: true,
    message: "Provider profile updated successfully",
    data: profile,
  });
});

const getMyOrders = catchAsync(async (req: Request, res: Response) => {
  const orders = await providerService.getMyOrders(req.user!.id);
  res.status(200).json({
    success: true,
    message: "Orders retrieved successfully",
    data: orders,
    total: orders.length,
  });
});

const getProviderById = catchAsync(async (req: Request, res: Response) => {
  const providerId = req.params.id as string;
  if (!providerId) throw new AppError(400, "Provider ID is required");
  const profile = await providerService.getProviderById(providerId);
  res.status(200).json({
    success: true,
    message: "Provider profile retrieved successfully",
    data: profile,
  });
});

const getAllProviders = catchAsync(async (req: Request, res: Response) => {
  const result = await providerService.getAllProviders(req.query as any);
  res.status(200).json({
    success: true,
    message: "Providers retrieved successfully",
    data: result.data,
    meta: result.meta,
  });
});

export const providerController = {
  getTopProviders,
  createProviderProfile,
  getMyProfile,
  updateMyProfile,
  getProviderById,
  getMyOrders,
  getAllProviders,
};
