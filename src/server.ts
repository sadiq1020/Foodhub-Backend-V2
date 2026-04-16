import "dotenv/config";
import app from "./app";
import { prisma } from "./lib/prisma";

const PORT = process.env.PORT || 5000;

async function main() {
  try {
    await prisma.$connect();
    console.log("Connected with database successfully");

    app.listen(PORT, () => {
      console.log(`Server is Running on port ${PORT}`);
    });
  } catch (error) {
    console.log("an error occurred", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
