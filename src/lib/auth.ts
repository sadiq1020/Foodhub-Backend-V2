// import { betterAuth } from "better-auth";
// import { prismaAdapter } from "better-auth/adapters/prisma";
// import { emailOTP } from "better-auth/plugins";
// import { sendOtpEmail } from "./email";
// import { prisma } from "./prisma";

// export const auth = betterAuth({
//   database: prismaAdapter(prisma, {
//     provider: "postgresql",
//   }),

//   trustedOrigins: [
//     "http://localhost:3000",
//     "https://ph-next-level-b6-a4-foodhub-fronten.vercel.app",
//     process.env.APP_URL!,
//   ],

//   user: {
//     additionalFields: {
//       role: {
//         type: "string",
//         defaultValue: "CUSTOMER",
//         input: true,
//       },
//       phone: {
//         type: "string",
//         required: false,
//         input: true,
//       },
//       isActive: {
//         type: "boolean",
//         defaultValue: true,
//       },
//     },
//   },

//   emailAndPassword: {
//     enabled: true,
//     autoSignIn: false,
//     requireEmailVerification: true, // ← changed from false
//   },

//   emailVerification: {
//     sendOnSignUp: true, // auto-send OTP right after registration
//     sendOnSignIn: false, // don't re-send on every login
//     autoSignInAfterVerification: false,
//   },

//   plugins: [
//     emailOTP({
//       // This completely replaces the default email verification link with OTP
//       overrideDefaultEmailVerification: true,

//       otpLength: 6,
//       expiresIn: 10 * 60, // 10 minutes in seconds

//       async sendVerificationOTP({ email, otp, type }) {
//         // Find the user's name so the email feels personal
//         const user = await prisma.user.findUnique({
//           where: { email },
//           select: { name: true },
//         });

//         if (!user) {
//           console.error(`sendVerificationOTP: user ${email} not found`);
//           return;
//         }

//         // Don't send OTP to the seeded admin (they're auto-verified)
//         if (user.name === "Admin Sadiq2" || !user) {
//           console.log(`Skipping OTP for admin user: ${email}`);
//           return;
//         }

//         await sendOtpEmail({
//           to: email,
//           name: user.name,
//           otp,
//           type,
//         });
//       },
//     }),
//   ],
// });

import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { emailOTP } from "better-auth/plugins";
import { sendOtpEmail } from "./email";
import { prisma } from "./prisma";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL!, // backend URL — required for OAuth callbacks

  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),

  trustedOrigins: [
    "http://localhost:3000",
    "https://foodhub-frontend-v2.vercel.app",
    process.env.APP_URL!,
  ],

  // advanced: {
  //   crossSubDomainCookies: {
  //     enabled: false,
  //   },
  //   defaultCookieAttributes: {
  //     sameSite: "none",
  //     secure: true,
  //     partitioned: true,
  //   },
  // },

  advanced: {
    defaultCookieAttributes:
      process.env.NODE_ENV === "production"
        ? {
            sameSite: "none",
            secure: true,
          }
        : {},
  },
  account: {
    storeStateStrategy: "database",
    skipStateCookieCheck: true,
  },

  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "CUSTOMER",
        input: true,
      },
      phone: {
        type: "string",
        required: false,
        input: true,
      },
      isActive: {
        type: "boolean",
        defaultValue: true,
      },
    },
  },

  emailAndPassword: {
    enabled: true,
    autoSignIn: false,
    requireEmailVerification: true,
  },

  // Google OAuth — customers only
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,

      mapProfileToUser: () => {
        return {
          role: "CUSTOMER",
          isActive: true,
          emailVerified: true,
        };
      },
    },
  },

  emailVerification: {
    sendOnSignUp: true,
    sendOnSignIn: false,
    autoSignInAfterVerification: false,
  },

  plugins: [
    // oAuthProxy({
    //   productionURL: "https://foodhub-frontend-v2.vercel.app",
    // }),
    emailOTP({
      overrideDefaultEmailVerification: true,
      otpLength: 6,
      expiresIn: 10 * 60,

      async sendVerificationOTP({ email, otp, type }) {
        if (type === "sign-in") return;

        const user = await prisma.user.findUnique({
          where: { email },
          select: { name: true, role: true },
        });

        if (!user) {
          console.error(`sendVerificationOTP: user ${email} not found`);
          return;
        }

        if (user.role === "ADMIN") {
          console.log(`Skipping OTP for admin user: ${email}`);
          return;
        }

        await sendOtpEmail({
          to: email,
          name: user.name,
          otp,
          type: type as "email-verification" | "forget-password",
        });
      },
    }),
  ],
});
