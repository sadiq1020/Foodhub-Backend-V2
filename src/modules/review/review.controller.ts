import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync";
import { reviewService } from "./review.service";

const createReview = catchAsync(async (req: Request, res: Response) => {
  const { mealId, rating, comment } = req.body;
  // if (!mealId || !rating) {
  //   throw new AppError(400, "Meal ID and rating are required");
  // }
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

export const reviewController = {
  createReview,
};
