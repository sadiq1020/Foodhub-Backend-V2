import { prisma } from "../lib/prisma";

async function main() {
  const providers = await prisma.providerProfiles.findMany({ include: { user: true }, take: 5 });
  console.log(JSON.stringify(providers, null, 2));
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
