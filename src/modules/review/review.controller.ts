import { Request, Response } from "express";
import AppError from "../../errors/AppError";
import catchAsync from "../../shared/catchAsync";
import { reviewService } from "./review.service";

const createReview = catchAsync(async (req: Request, res: Response) => {
  const { mealId, rating, comment } = req.body;

  if (!mealId || !rating) {
    throw new AppError(400, "Meal ID and rating are required");
  }

  const review = await reviewService.createReview({
    mealId,
    customerId: req.user!.id,
    rating: Number(rating),
    comment,
  });

  res.status(201).json({
    success: true,
    message: "Review created successfully",
    data: review,
  });
});

const updateReview = catchAsync(async (req: Request, res: Response) => {
  const reviewId = req.params.id as string;
  if (!reviewId) throw new AppError(400, "Review ID is required");

  const { rating, comment } = req.body;

  if (rating === undefined && comment === undefined) {
    throw new AppError(
      400,
      "Provide at least one field to update: rating or comment",
    );
  }

  const review = await reviewService.updateReview(reviewId, req.user!.id, {
    ...(rating !== undefined && { rating: Number(rating) }),
    ...(comment !== undefined && { comment }),
  });

  res.status(200).json({
    success: true,
    message: "Review updated successfully",
    data: review,
  });
});

const deleteReview = catchAsync(async (req: Request, res: Response) => {
  const reviewId = req.params.id as string;
  if (!reviewId) throw new AppError(400, "Review ID is required");

  const result = await reviewService.deleteReview(reviewId, req.user!.id);

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

export const reviewController = {
  createReview,
  updateReview,
  deleteReview,
};
