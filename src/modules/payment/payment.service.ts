import { sendPaymentSuccessEmail } from "../../lib/email";
// import { stripe } from "../../config/stripe";
import { getStripe } from "../../config/stripe";
import AppError from "../../errors/AppError";
import { prisma } from "../../lib/prisma";

const handleWebhookEvent = async (rawBody: Buffer, signature: string) => {
  // 1. Verify the request genuinely came from Stripe
  let event: any;

  try {
    event = getStripe().webhooks.constructEvent(
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
  const existingPayment = await prisma.payment.findFirst({
    where: { stripeEventId: event.id },
  });

  if (existingPayment) {
    console.log(`Stripe event ${event.id} already processed. Skipping.`);
    return { received: true };
  }

  // 3. Handle event types
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object;
      const orderId = session.metadata?.orderId;
      const paymentId = session.metadata?.paymentId;

      if (!orderId || !paymentId) {
        console.error("Webhook: missing metadata (orderId or paymentId)");
        return { received: true };
      }

      const isPaid = session.payment_status === "paid";

      await prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: paymentId },
          data: {
            status: isPaid ? "PAID" : "FAILED",
            stripeEventId: event.id,
          },
        });

        await tx.order.update({
          where: { id: orderId },
          data: {
            paymentStatus: isPaid ? "PAID" : "UNPAID",
          },
        });
      });

      // Send payment success email — non-blocking
      if (isPaid) {
        const orderWithCustomer = await prisma.order.findUnique({
          where: { id: orderId },
          select: {
            orderNumber: true,
            total: true,
            customer: { select: { name: true, email: true } },
          },
        });

        if (orderWithCustomer?.customer) {
          sendPaymentSuccessEmail({
            to: orderWithCustomer.customer.email,
            customerName: orderWithCustomer.customer.name,
            orderNumber: orderWithCustomer.orderNumber,
            orderId,
            total: Number(orderWithCustomer.total),
          }).catch((err) =>
            console.error("Failed to send payment success email:", err.message),
          );
        }
      }

      console.log(
        `✅ Payment ${isPaid ? "PAID" : "FAILED"} for order ${orderId}`,
      );
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object;
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
      console.log(`Unhandled Stripe event type: ${event.type}`);
  }

  return { received: true };
};

export const paymentService = {
  handleWebhookEvent,
};
