import express from "express";
import auth from "../../middlewares/auth.middleware";
import validateRequest from "../../middlewares/validateRequest";
import { ROLES } from "../../shared";
import { providerController } from "./provider.controller";
import {
  createProviderProfileSchema,
  updateProviderProfileSchema,
} from "./provider.validation";

const router = express.Router();

router.post(
  "/profile",
  validateRequest(createProviderProfileSchema),
  providerController.createProviderProfile,
);

router.get("/profile", auth(ROLES.PROVIDER), providerController.getMyProfile);

router.put(
  "/profile",
  auth(ROLES.PROVIDER),
  validateRequest(updateProviderProfileSchema),
  providerController.updateMyProfile,
);

router.get("/orders", auth(ROLES.PROVIDER), providerController.getMyOrders);

export const providerRouter = router;
