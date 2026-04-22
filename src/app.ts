// import { toNodeHandler } from "better-auth/node";
// import cors from "cors";
// import express from "express";
// import { auth } from "./lib/auth";
// import { adminRouter } from "./modules/admin/admin.route";
// import { categoryRouter } from "./modules/category/category.router";
// import { mealRouter } from "./modules/meal/meal.router";
// import { orderRouter } from "./modules/order/order.route";
// import { providerProfilesRouter } from "./modules/provider/provider-profiles.route";
// import { providerRouter } from "./modules/provider/provider.route";
// import { reviewRouter } from "./modules/review/review.router";
// import { userRouter } from "./modules/user/user.router";

// const app = express();

// // setting cors
// // app.use(
// //   cors({
// //     origin: process.env.APP_URL || "http://localhost:3000", // client side url
// //     credentials: true,
// //   }),
// // );

// // // CORS Configuration for Production
// const allowedOrigins = [
//   "http://localhost:3000", // Local development
//   process.env.APP_URL, // Frontend URL from environment variable
// ].filter(Boolean); // Remove undefined values

// app.use(
//   cors({
//     origin: (origin, callback) => {
//       // Allow requests with no origin (like mobile apps or curl)
//       if (!origin) return callback(null, true);

//       if (allowedOrigins.includes(origin)) {
//         callback(null, true);
//       } else {
//         callback(new Error("Not allowed by CORS"));
//       }
//     },
//     credentials: true,
//   }),
// );

// app.use(express.json());

// app.all("/api/auth/*splat", toNodeHandler(auth));

// // all custom routes
// app.use("/meals", mealRouter);
// app.use("/categories", categoryRouter);
// app.use("/provider", providerRouter);
// app.use("/provider-profile", providerProfilesRouter); // public auth to view provider profiles
// app.use("/orders", orderRouter);
// app.use("/users", userRouter);
// app.use("/reviews", reviewRouter);
// app.use("/admin", adminRouter);

// // test the server running
// app.get("/", (req, res) => {
//   res.send("hello world!");
// });

// export default app;

import { toNodeHandler } from "better-auth/node";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import multer from "multer";
import { auth } from "./lib/auth";
import globalErrorHandler from "./middlewares/globalErrorHandler"; // ← ADD
import notFound from "./middlewares/notFound"; // ← ADD
import { adminRouter } from "./modules/admin/admin.route";
import { authRouter } from "./modules/auth/auth.router";
import { categoryRouter } from "./modules/category/category.router";
import { favouriteRouter } from "./modules/favourite/favourite.router";
import { mealRouter } from "./modules/meal/meal.router";
import { orderRouter } from "./modules/order/order.route";
import { paymentController } from "./modules/payment/payment.controller";
import { providerProfilesRouter } from "./modules/provider/provider-profiles.route";
import { providerRouter } from "./modules/provider/provider.route";
import { reviewRouter } from "./modules/review/review.router";
import { userRouter } from "./modules/user/user.router";

const app = express();

// CORS Configuration for Production
const allowedOrigins = [
  "http://localhost:3000",
  "https://foodhub-frontend-v2.vercel.app",
  process.env.APP_URL,
].filter(Boolean);

// console.log("🔧 Allowed CORS origins:", allowedOrigins);

app.use(
  cors({
    origin: (origin, callback) => {
      console.log("📡 Request from origin:", origin);

      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        // console.log("✅ CORS allowed");
        callback(null, true);
      } else {
        // console.log("❌ CORS blocked");
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  }),
);

// ⚠️ WEBHOOK MUST COME BEFORE express.json()
// Stripe signature verification requires the raw Buffer body.
// Once express.json() parses it, the raw body is gone and verification fails.
app.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  paymentController.handleStripeWebhook,
);

app.use(express.json());

app.use("/api/auth", toNodeHandler(auth));

// all custom routes
app.use("/auth", authRouter);
app.use("/meals", mealRouter);
app.use("/categories", categoryRouter);
app.use("/provider", providerRouter);
app.use("/provider-profile", providerProfilesRouter);
app.use("/orders", orderRouter);
app.use("/users", userRouter);
app.use("/reviews", reviewRouter);
app.use("/admin", adminRouter);
app.use("/favourites", favouriteRouter);

// test the server running
app.get("/", (req, res) => {
  res.send("FoodHub API is running! 🍽️");
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof multer.MulterError || err.message?.includes("format")) {
    return res.status(400).json({
      success: false,
      message: err.message || "File upload failed. Check file type and size.",
    });
  }
  next(err);
});

// ↓ These two MUST be after all routes
app.use(notFound);
app.use(globalErrorHandler);

export default app;
