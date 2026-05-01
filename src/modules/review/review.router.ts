import express from "express";
import auth from "../../middlewares/auth.middleware";
import validateRequest from "../../middlewares/validateRequest";
import { ROLES } from "../../shared";
import { reviewController } from "./review.controller";
import { createReviewSchema } from "./review.validation";

const router = express.Router();

// ── Public route — no auth needed ─────────────────────────────────────────
// GET /reviews/top  →  returns latest 5-star reviews for the landing page
router.get("/top", reviewController.getTopReviews);

// ── Protected routes ───────────────────────────────────────────────────────
router.post(
  "/",
  auth(ROLES.CUSTOMER),
  validateRequest(createReviewSchema),
  reviewController.createReview,
);

router.put("/:id", auth(ROLES.CUSTOMER), reviewController.updateReview);
router.delete("/:id", auth(ROLES.CUSTOMER), reviewController.deleteReview);

export const reviewRouter = router;
