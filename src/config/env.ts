const requiredEnvVars = [
  // Server
  "PORT",

  // Database
  "DATABASE_URL",

  // Better Auth
  "BETTER_AUTH_SECRET",
  "BETTER_AUTH_URL",

  // App URLs
  "APP_URL",
  "FRONTEND_URL",

  // Email / SMTP
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",

  // Google OAuth
  "GOOGLE_CLIENT_ID",
  "GOOGLE_CLIENT_SECRET",

  // Stripe
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",

  // cloudinary
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
] as const;

const validateEnv = (): void => {
  const missing: string[] = [];

  for (const key of requiredEnvVars) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }

  if (missing.length > 0) {
    console.error("\n❌ Missing required environment variables:\n");
    missing.forEach((key) => console.error(`   - ${key}`));
    console.error(
      "\nPlease add the missing variables to your .env file and restart the server.\n",
    );
    process.exit(1); // Stop the server immediately
  }

  console.log("✅ All environment variables validated.");
};

export default validateEnv;
