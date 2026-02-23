import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { prisma } from "./prisma";

export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql", // or "mysql", "postgresql", ...etc
  }),
  trustedOrigins: [
    "http://localhost:3000",
    "https://ph-next-level-b6-a4-foodhub-fronten.vercel.app", // Vercel URL
    process.env.APP_URL!, // http://localhost:3000
  ],
  user: {
    additionalFields: {
      role: {
        type: "string",
        defaultValue: "CUSTOMER",
        input: true, // Allow setting during registration
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
    requireEmailVerification: false,
  },
});

// import { betterAuth } from "better-auth";
// import { prismaAdapter } from "better-auth/adapters/prisma";
// import { prisma } from "./prisma";

// export const auth = betterAuth({
//   database: prismaAdapter(prisma, {
//     provider: "postgresql",
//   }),
//   baseURL: process.env.BETTER_AUTH_URL!, // ✅ Backend URL
//   trustedOrigins: [
//     "http://localhost:3000",
//     "https://ph-next-level-b6-a4-foodhub-fronten.vercel.app",
//     process.env.APP_URL!,
//   ],
//   // ✅ Correct session configuration
//   session: {
//     cookieCache: {
//       enabled: true,
//       maxAge: 60 * 60 * 24 * 7, // 7 days
//     },
//     // ✅ Cookie options at session level
//     cookieOptions: {
//       sameSite: "none", // Required for cross-domain
//       secure: true, // Required when using sameSite: none
//       httpOnly: true,
//       path: "/",
//     },
//   },
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
//     requireEmailVerification: false,
//   },
// });
