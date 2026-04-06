import prisma from "./src/database/prismaClient.js";
import { trendsService } from "./src/modules/trends/trends.service.js";

try {
  console.log("📊 Atualizando tendências...");
  await trendsService.updateTrends();

  const products = await prisma.product.count();
  const trends = await prisma.trend.count();

  console.log("✅ Tendências atualizadas!");
  console.log(`  - ${products} produtos criados`);
  console.log(`  - ${trends} tendências criadas`);
} catch (err) {
  console.error("❌ Erro:", err.message);
} finally {
  process.exit(0);
}
