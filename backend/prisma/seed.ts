import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_USER_ID = "00000000-0000-0000-0000-000000000001";
const DEFAULT_WEBHOOK_TOKEN = "fluxox-wh-00000000-0000-0000-0000-000000000001";

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "default@fluxox.local" },
    update: { webhookToken: DEFAULT_WEBHOOK_TOKEN },
    create: {
      id: DEFAULT_USER_ID,
      email: "default@fluxox.local",
      name: "Usuário Padrão",
      webhookToken: DEFAULT_WEBHOOK_TOKEN,
    },
  });
  console.log(`Seed: usuário default OK (id=${user.id})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
