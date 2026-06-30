import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("=== CHECKING AUTH TABLES ===");
  try {
    const accounts = await prisma.account.findMany();
    console.log("Account table works! Row count:", accounts.length);
  } catch (err) {
    console.error("Account table failed:", err);
  }

  try {
    const sessions = await prisma.session.findMany();
    console.log("Session table works! Row count:", sessions.length);
  } catch (err) {
    console.error("Session table failed:", err);
  }
}

main()
  .catch(console.error)
  .finally(() => pool.end());
