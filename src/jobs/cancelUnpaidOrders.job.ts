import { prisma } from "../lib/prisma";

export const cancelUnpaidOrders = async (): Promise<void> => {
  // Orders older than 30 minutes that are still unpaid
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

  // Find all qualifying orders
  const unpaidOrders = await prisma.order.findMany({
    where: {
      status: "PLACED", // not yet being prepared
      paymentStatus: "UNPAID", // customer never completed payment
      createdAt: {
        lte: thirtyMinutesAgo, // created more than 30 minutes ago
      },
    },
    select: {
      id: true,
      orderNumber: true,
      payment: { select: { id: true } },
    },
  });

  if (unpaidOrders.length === 0) {
    console.log("[Cron] No unpaid orders to cancel.");
    return;
  }

  console.log(`[Cron] Found ${unpaidOrders.length} unpaid order(s) to cancel.`);

  // Cancel each order in its own transaction so one failure
  // doesn't block the others from being processed
  let successCount = 0;
  let failCount = 0;

  for (const order of unpaidOrders) {
    try {
      await prisma.$transaction(async (tx) => {
        // Cancel the order
        await tx.order.update({
          where: { id: order.id },
          data: { status: "CANCELLED" },
        });

        // Mark the payment as failed if one exists
        if (order.payment?.id) {
          await tx.payment.update({
            where: { id: order.payment.id },
            data: { status: "FAILED" },
          });
        }
      });

      console.log(
        `[Cron] ✅ Cancelled order ${order.orderNumber} (${order.id})`,
      );
      successCount++;
    } catch (error: any) {
      // Log the failure but continue processing remaining orders
      console.error(
        `[Cron] ❌ Failed to cancel order ${order.orderNumber}:`,
        error.message,
      );
      failCount++;
    }
  }

  console.log(`[Cron] Done. Cancelled: ${successCount}, Failed: ${failCount}.`);
};
