import prisma from "./src/database/prismaClient.js";

const productCount = await prisma.product.count();
const trendCount = await prisma.trend.count();

console.log("Products in DB:", productCount);
console.log("Trends in DB:", trendCount);

process.exit(0);
