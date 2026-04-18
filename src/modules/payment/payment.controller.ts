import { Request, Response } from "express";
import catchAsync from "../../shared/catchAsync";
import { paymentService } from "./payment.service";

// POST /webhook
// Stripe sends events here after payment
// Note: this route uses express.raw() — NOT express.json()
// The raw body is required for Stripe signature verification
const handleStripeWebhook = catchAsync(async (req: Request, res: Response) => {
  const signature = req.headers["stripe-signature"] as string;

  if (!signature) {
    res.status(400).json({
      success: false,
      message: "Missing Stripe signature header",
    });
    return;
  }

  const result = await paymentService.handleWebhookEvent(
    req.body as Buffer,
    signature,
  );

  res.status(200).json(result);
});

export const paymentController = {
  handleStripeWebhook,
};
