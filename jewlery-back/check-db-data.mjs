import prisma from "./src/database/prismaClient.js";

console.log("📊 Verificando banco de dados...\n");

const trendCount = await prisma.trend.count();
const producCount = await prisma.product.count();

console.log(`✅ Total de Trends: ${trendCount}`);
console.log(`✅ Total de Produtos: ${producCount}`);

if (producCount > 0) {
  const products = await prisma.product.findMany({ take: 5 });
  console.log("\n🛍️  Primeiros 5 Produtos:");
  products.forEach((p) => {
    console.log(`  - ${p.nome} (categoria: ${p.categoria})`);
  });
}

if (trendCount > 0) {
  const trends = await prisma.trend.findMany({
    include: { product: true },
    take: 10,
  });
  console.log("\n📈 Primeiros 10 Trends:");
  trends.forEach((t) => {
    console.log(`  - ${t.product.nome}: Score ${t.score}, Status: ${t.status}`);
  });
}

await prisma.$disconnect();
