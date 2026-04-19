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

let stripeInstance: InstanceType<typeof Stripe> | null = null;

export const getStripe = (): InstanceType<typeof Stripe> => {
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY!);
  }
  return stripeInstance;
};
