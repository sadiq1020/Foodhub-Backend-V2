// import { prisma } from "../lib/prisma";
// import { ROLES } from "../shared";

// async function seedAdmin() {
//   try {
//     // const adminData = {
//     //   name: "Admin Sadiq2",
//     //   email: "admin@sadiq2.com",
//     //   password: "admin1234",
//     //   role: ROLES.ADMIN,
//     // };

//     // ✅ Get admin credentials from environment variables
//     const adminData = {
//       name: process.env.ADMIN_NAME || "Admin User",
//       email: process.env.ADMIN_EMAIL || "admin@example.com",
//       password: process.env.ADMIN_PASSWORD || "admin1234",
//       role: ROLES.ADMIN,
//     };

//     // checking user exist in the DB or not
//     const existingUser = await prisma.user.findUnique({
//       where: {
//         email: adminData.email,
//       },
//     });

//     if (existingUser) {
//       throw new Error("User already exists");
//     }

//     // Sign up admin through API
//     const signUpAdmin = await fetch(
//       "http://localhost:5000/api/auth/sign-up/email",
//       {
//         method: "POST",
//         headers: {
//           "Content-Type": "application/json",
//           Origin: "http://localhost:3000",
//         },
//         body: JSON.stringify(adminData),
//       },
//     );

//     console.log(signUpAdmin);
//     // const responseData = await signUpAdmin.json();
//     // console.log("Response:", responseData);

//     if (signUpAdmin.ok) {
//       // Update to verify email after signup
//       await prisma.user.update({
//         where: {
//           email: adminData.email,
//         },
//         data: {
//           emailVerified: true,
//         },
//       });
//     }
//   } catch (err) {
//     console.error(err);
//   }
// }

// seedAdmin();

import { prisma } from "../lib/prisma";
import { ROLES } from "../shared";

async function seedAdmin() {
  try {
    // ✅ Get admin credentials from environment variables
    const adminData = {
      name: process.env.ADMIN_NAME || "Admin Sadiq2",
      email: process.env.ADMIN_EMAIL || "admin@sadiq2.com",
      password: process.env.ADMIN_PASSWORD || "admin1234",
      role: ROLES.ADMIN,
    };

    // checking user exist in the DB or not
    const existingUser = await prisma.user.findUnique({
      where: {
        email: adminData.email,
      },
    });

    if (existingUser) {
      console.log("Admin user already exists");
      return;
    }

    // ✅ Use environment variable for URL (works in both dev and production)
    const apiUrl = process.env.BETTER_AUTH_URL || "http://localhost:5000";

    // Sign up admin through API
    const signUpAdmin = await fetch(`${apiUrl}/api/auth/sign-up/email`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Origin: process.env.APP_URL || "http://localhost:3000",
      },
      body: JSON.stringify(adminData),
    });

    if (signUpAdmin.ok) {
      console.log("Admin created successfully!");

      // Update to verify email after signup
      await prisma.user.update({
        where: {
          email: adminData.email,
        },
        data: {
          emailVerified: true,
        },
      });

      console.log("Admin email verified!");
    } else {
      const errorText = await signUpAdmin.text();
      console.error("Failed to create admin:", errorText);
    }
  } catch (err) {
    console.error("Seed admin error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

seedAdmin();
