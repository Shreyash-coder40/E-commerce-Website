const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

async function main() {
  const products = await db.product.findMany();
  console.log("DB Products:", products.map(p => ({ id: p.id, name: p.name })));
}

main().catch(err => {
  console.error(err);
}).finally(() => {
  db.$disconnect();
});
