import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const url = new URL(process.env.DATABASE_URL!);
url.searchParams.delete("channel_binding");

const pool = new pg.Pool({ connectionString: url.toString() });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const org = await prisma.organization.upsert({
    where: { domain: "companysage.com" },
    update: {},
    create: {
      name: "CompanySage",
      domain: "companysage.com",
    },
  });

  console.log("Seeded organization:", org.name, `(${org.domain})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
