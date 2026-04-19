import cron from "node-cron";
import { cancelUnpaidOrders } from "./cancelUnpaidOrders.job";

export const startJobs = (): void => {
  // Run every 15 minutes
  // Cron syntax: "*/15 * * * *"
  //   */15 → every 15 minutes
  //   *    → every hour
  //   *    → every day of month
  //   *    → every month
  //   *    → every day of week
  cron.schedule("*/15 * * * *", async () => {
    console.log("[Cron] Running cancelUnpaidOrders job...");
    try {
      await cancelUnpaidOrders();
    } catch (error: any) {
      // Catch any unexpected error so the cron job
      // itself never crashes the server
      console.error(
        "[Cron] Unexpected error in cancelUnpaidOrders:",
        error.message,
      );
    }
  });

  console.log("✅ Cron jobs started.");
};
