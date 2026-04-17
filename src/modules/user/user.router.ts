import express from "express";
import auth from "../../middlewares/auth.middleware";
import validateRequest from "../../middlewares/validateRequest";
import { ROLES } from "../../shared";
import { userController } from "./user.controller";
import { updateProfileSchema, updateUserStatusSchema } from "./user.validation";

const router = express.Router();

router.put(
  "/profile",
  auth(ROLES.CUSTOMER, ROLES.PROVIDER, ROLES.ADMIN),
  validateRequest(updateProfileSchema),
  userController.updateProfile,
);

router.get("/", auth(ROLES.ADMIN), userController.getAllUsers);

router.patch(
  "/:id/status",
  auth(ROLES.ADMIN),
  validateRequest(updateUserStatusSchema),
  userController.updateUserStatus,
);

export const userRouter = router;
