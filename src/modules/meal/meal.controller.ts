import { Request, Response } from "express";
import AppError from "../../errors/AppError";
import catchAsync from "../../shared/catchAsync";
import { IMealFilters } from "./meal.interface";
import { mealService } from "./meal.service";

const createMeal = catchAsync(async (req: Request, res: Response) => {
  const result = await mealService.createMeal(req.body, req.user!.id);
  res.status(201).json({
    success: true,
    message: "Meal created successfully",
    data: result,
  });
});

const getAllMeals = catchAsync(async (req: Request, res: Response) => {
  const filters: IMealFilters = {
    categoryId: req.query.categoryId as string | undefined,
    dietary: req.query.dietary as string | undefined,
    providerId: req.query.providerId as string | undefined,
    search: req.query.search as string | undefined,
    minPrice: req.query.minPrice ? Number(req.query.minPrice) : undefined,
    maxPrice: req.query.maxPrice ? Number(req.query.maxPrice) : undefined,
  };
  const result = await mealService.getAllMeals(filters);
  res.status(200).json({
    success: true,
    message: "Meals retrieved successfully",
    data: result,
  });
});

const getMealById = catchAsync(async (req: Request, res: Response) => {
  const mealId = req.params.id as string;
  if (!mealId) throw new AppError(400, "Meal ID is required");
  const result = await mealService.getMealById(mealId);
  res.status(200).json({
    success: true,
    message: "Meal retrieved successfully",
    data: result,
  });
});

const updateMeal = catchAsync(async (req: Request, res: Response) => {
  const mealId = req.params.id as string;
  if (!mealId) throw new AppError(400, "Meal ID is required");
  const result = await mealService.updateMeal(mealId, req.body, req.user!.id);
  res.status(200).json({
    success: true,
    message: "Meal updated successfully",
    data: result,
  });
});

const deleteMeal = catchAsync(async (req: Request, res: Response) => {
  const mealId = req.params.id as string;
  if (!mealId) throw new AppError(400, "Meal ID is required");
  const result = await mealService.deleteMeal(mealId, req.user!.id);
  res.status(200).json({
    success: true,
    message: result.message,
  });
});

const getMyMeals = catchAsync(async (req: Request, res: Response) => {
  const result = await mealService.getMyMeals(req.user!.id);
  res.status(200).json({
    success: true,
    message: "Meals retrieved successfully",
    data: result,
  });
});

export const mealController = {
  createMeal,
  getAllMeals,
  getMealById,
  updateMeal,
  deleteMeal,
  getMyMeals,
};
