import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

const connectionString = process.env.DATABASE_URL;

// Create a single database pool connection with SSL support for cloud Postgres (Supabase, Neon, RDS, etc.)
const pool = new pg.Pool({
  connectionString: connectionString || "postgresql://postgres:postgres@localhost:5432/ecommerce?sslmode=disable",
  ssl:
    connectionString &&
    !connectionString.includes("localhost") &&
    !connectionString.includes("127.0.0.1")
      ? { rejectUnauthorized: false }
      : undefined,
});

pool.on("error", (err) => {
  console.error("Unexpected error on idle PostgreSQL client pool", err);
});

const adapter = new PrismaPg(pool);

// Export a single global instance with the driver adapter attached
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;