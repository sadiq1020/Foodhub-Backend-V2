import express from "express";
import authMiddleware from "../../middlewares/auth.middleware";
import validateRequest from "../../middlewares/validateRequest";
import { ROLES } from "../../shared";
import { authController } from "./auth.controller";
import {
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./auth.validation";

const router = express.Router();

// Public routes — no session needed
router.post(
  "/forgot-password",
  validateRequest(forgotPasswordSchema),
  authController.forgotPassword,
);

router.post(
  "/reset-password",
  validateRequest(resetPasswordSchema),
  authController.resetPassword,
);

// Protected route — must be logged in
router.post(
  "/change-password",
  authMiddleware(ROLES.CUSTOMER, ROLES.PROVIDER, ROLES.ADMIN),
  validateRequest(changePasswordSchema),
  authController.changePassword,
);

export const authRouter = router;
