import { Request, Response } from "express";
import AppError from "../../errors/AppError";
import catchAsync from "../../shared/catchAsync";
import { favouriteService } from "./favourite.service";

// POST /favourites/:mealId
const addFavourite = catchAsync(async (req: Request, res: Response) => {
  const mealId = req.params.mealId as string;
  if (!mealId) throw new AppError(400, "Meal ID is required");

  const result = await favouriteService.addFavourite(req.user!.id, mealId);

  res.status(201).json({
    success: true,
    message: "Meal added to favourites",
    data: result,
  });
});

// DELETE /favourites/:mealId
const removeFavourite = catchAsync(async (req: Request, res: Response) => {
  const mealId = req.params.mealId as string;
  if (!mealId) throw new AppError(400, "Meal ID is required");

  const result = await favouriteService.removeFavourite(req.user!.id, mealId);

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

// GET /favourites
const getMyFavourites = catchAsync(async (req: Request, res: Response) => {
  const result = await favouriteService.getMyFavourites(req.user!.id);

  res.status(200).json({
    success: true,
    message: "Favourites retrieved successfully",
    data: result,
    total: result.length,
  });
});

// GET /favourites/:mealId/check
const isFavourited = catchAsync(async (req: Request, res: Response) => {
  const mealId = req.params.mealId as string;
  if (!mealId) throw new AppError(400, "Meal ID is required");

  const result = await favouriteService.isFavourited(req.user!.id, mealId);

  res.status(200).json({
    success: true,
    data: result,
  });
});

export const favouriteController = {
  addFavourite,
  removeFavourite,
  getMyFavourites,
  isFavourited,
};
