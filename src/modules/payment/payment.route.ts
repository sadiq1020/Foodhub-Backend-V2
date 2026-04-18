import express from "express";
import { paymentController } from "./payment.controller";

const router = express.Router();

// No auth middleware — Stripe calls this directly
// Security is handled by signature verification inside the handler
router.post("/webhook", paymentController.handleStripeWebhook);

export const paymentRouter = router;
