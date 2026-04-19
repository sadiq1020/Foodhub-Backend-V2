// import Stripe from "stripe";

// if (!process.env.STRIPE_SECRET_KEY) {
//   throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
// }

// export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// --------------

// import Stripe from "stripe";

// export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// --------------

import Stripe from "stripe";

// Lazy instance — created only when first used, not at import time
// This allows validateEnv() to run first and give a clean error message
let stripeInstance: Stripe | null = null;

export const getStripe = (): Stripe => {
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return stripeInstance;
};
