import { db } from "../src/app/lib/db";

async function main() {
  const products = await db.product.findMany();
  console.log("Database connection successful. Found products:", products.length);
  for (const p of products) {
    console.log(`- Product Name: "${p.name}", ID: "${p.id}"`);
  }
}

main()
  .catch((err) => console.error("Database query failed:", err))
  .finally(() => process.exit(0));
