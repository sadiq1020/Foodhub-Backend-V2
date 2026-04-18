import Stripe from "stripe";
import { stripe } from "../../config/stripe";
import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma";

const handleWebhookEvent = async (rawBody: Buffer, signature: string) => {
  // 1. Verify the request genuinely came from Stripe
  // Without this check, anyone could POST to your webhook and fake a payment
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err: any) {
    throw new AppError(
      400,
      `Webhook signature verification failed: ${err.message}`,
    );
  }

  // 2. Idempotency check — skip if we already processed this event
  // Stripe retries webhooks on failure, so this prevents double-processing
  const existingPayment = await prisma.payment.findFirst({
    where: { stripeEventId: event.id },
  });

  if (existingPayment) {
    console.log(`Stripe event ${event.id} already processed. Skipping.`);
    return { received: true };
  }

  // 3. Handle the event types we care about
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;

      const orderId = session.metadata?.orderId;
      const paymentId = session.metadata?.paymentId;

      if (!orderId || !paymentId) {
        console.error("Webhook: missing metadata (orderId or paymentId)");
        return { received: true };
      }

      const isPaid = session.payment_status === "paid";

      // Update payment and order atomically
      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: isPaid ? "PAID" : "FAILED",
            stripeEventId: event.id, // store for idempotency
          },
        });

        await tx.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: isPaid ? "PAID" : "UNPAID",
          },
        });
      });

      console.log(
        `✅ Payment ${isPaid ? "PAID" : "FAILED"} for order ${orderId}`,
      );
      break;
    }

    case "checkout.session.expired": {
      // Customer abandoned the payment — mark as failed
      const session = event.data.object as Stripe.Checkout.Session;
      const paymentId = session.metadata?.paymentId;

      if (paymentId) {
        await prisma.payment.update({
          where: { id: paymentId },
          data: {
            status: "FAILED",
            stripeEventId: event.id,
          },
        });
        console.log(`⚠️ Checkout session expired for payment ${paymentId}`);
      }
      break;
    }

    default:
      // We don't handle this event type — that's fine, just acknowledge
      console.log(`Unhandled Stripe event type: ${event.type}`);
  }

  return { received: true };
};

export const paymentService = {
  handleWebhookEvent,
};
