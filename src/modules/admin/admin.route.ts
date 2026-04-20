import express from "express";
import auth from "../../middlewares/auth.middleware";
import { ROLES } from "../../shared";
import { adminController } from "./admin.controller";

const router = express.Router();

// Dashboard stats
router.get("/stats", auth(ROLES.ADMIN), adminController.getStats);

// Provider management
router.get(
  "/providers",
  auth(ROLES.ADMIN),
  adminController.getProvidersByStatus,
);
router.patch(
  "/providers/:id/approve",
  auth(ROLES.ADMIN),
  adminController.approveProvider,
);
router.patch(
  "/providers/:id/reject",
  auth(ROLES.ADMIN),
  adminController.rejectProvider,
);

export const adminRouter = router;
