import "dotenv/config"; // ← load .env first
import validateEnv from "./config/env"; // ← then validate
validateEnv(); // ← runs immediately, exits if anything missing

import app from "./app";
import { startJobs } from "./jobs";
import { prisma } from "./lib/prisma";

const PORT = process.env.PORT || 5000;

async function main() {
  try {
    await prisma.$connect();
    console.log("Connected with database successfully");

    app.listen(PORT, () => {
      console.log(`Server is Running on port ${PORT}`);
      startJobs();
    });
  } catch (error) {
    console.log("An error occurred", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
