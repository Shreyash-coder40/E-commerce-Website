import fs from 'fs';
import pg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

try {
  const envContent = fs.readFileSync('.env', 'utf-8');
  const match = envContent.match(/^DATABASE_URL\s*=\s*["']?([^"'\r\n]+)["']?/m);
  if (match && match[1]) {
    process.env.DATABASE_URL = match[1].trim();
  }
} catch (err) {
  console.error("Could not read .env file:", err);
}

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function checkCache() {
  try {
    const records = await prisma.competitorCache.findMany({});
    console.log("Cached records count:", records.length);
    if (records.length > 0) {
      console.log("Competitor Data in DB:");
      records.forEach(r => {
        console.log(`Product ID: ${r.productId}`);
        console.log(`Updated At: ${r.lastUpdated}`);
        console.log("Details:", JSON.stringify(r.competitorData, null, 2));
        console.log("Recommendation:", r.recommendation);
      });
    }
  } catch (err) {
    console.error(err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}
checkCache();
