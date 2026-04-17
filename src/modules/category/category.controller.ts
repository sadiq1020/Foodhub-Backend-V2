import { Request, Response } from "express";
import AppError from "../../errors/AppError";
import catchAsync from "../../shared/catchAsync";
import { categoryService } from "./category.service";

const createCategory = catchAsync(async (req: Request, res: Response) => {
  const result = await categoryService.createCategory(req.body);
  res.status(201).json({
    success: true,
    message: "Category created successfully",
    data: result,
  });
});

const getAllCategories = catchAsync(async (req: Request, res: Response) => {
  const result = await categoryService.getAllCategories();
  res.status(200).json({
    success: true,
    message: "Categories retrieved successfully",
    data: result,
  });
});

const updateCategory = catchAsync(async (req: Request, res: Response) => {
  const categoryId = req.params.id as string;
  if (!categoryId) throw new AppError(400, "Category ID is required");
  const result = await categoryService.updateCategory(categoryId, req.body);
  res.status(200).json({
    success: true,
    message: "Category updated successfully",
    data: result,
  });
});

const deleteCategory = catchAsync(async (req: Request, res: Response) => {
  const categoryId = req.params.id as string;
  if (!categoryId) throw new AppError(400, "Category ID is required");
  const result = await categoryService.deleteCategory(categoryId);
  res.status(200).json({
    success: true,
    message: result.message,
  });
});

export const categoryController = {
  createCategory,
  getAllCategories,
  updateCategory,
  deleteCategory,
};
