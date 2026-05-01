import express from "express";
import auth from "../../middlewares/auth.middleware";
import validateRequest from "../../middlewares/validateRequest";
import { ROLES } from "../../shared";
import { orderController } from "./order.controller";
import { createOrderSchema, updateOrderStatusSchema } from "./order.validation";

const router = express.Router();

// ── Public: landing page live stats (no auth) ─────────────────────────────────
router.get("/stats", orderController.getPublicStats);

// ── Protected routes ──────────────────────────────────────────────────────────
router.post(
  "/",
  auth(ROLES.CUSTOMER),
  validateRequest(createOrderSchema),
  orderController.createOrder,
);

router.get(
  "/admin/all",
  auth(ROLES.ADMIN),
  orderController.getAllOrdersForAdmin,
);

router.put(
  "/:id/status",
  auth(ROLES.PROVIDER),
  validateRequest(updateOrderStatusSchema),
  orderController.updateOrderStatus,
);

router.put("/:id/cancel", auth(ROLES.CUSTOMER), orderController.cancelOrder);
router.get("/", auth(ROLES.CUSTOMER), orderController.getMyOrders);

router.get(
  "/:id",
  auth(ROLES.CUSTOMER, ROLES.PROVIDER),
  orderController.getOrderById,
);

export const orderRouter = router;
