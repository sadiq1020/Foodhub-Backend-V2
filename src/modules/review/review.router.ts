import express from "express";
import auth from "../../middlewares/auth.middleware";
import validateRequest from "../../middlewares/validateRequest";
import { ROLES } from "../../shared";
import { reviewController } from "./review.controller";
import { createReviewSchema } from "./review.validation";

const router = express.Router();

router.post(
  "/",
  auth(ROLES.CUSTOMER),
  validateRequest(createReviewSchema),
  reviewController.createReview,
);

export const reviewRouter = router;
