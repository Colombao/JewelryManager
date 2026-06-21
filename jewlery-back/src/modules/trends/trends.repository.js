// trends.repository.js

import prisma from "../../database/prismaClient.js";

export const trendsRepository = {
  async saveMany(trends) {
    for (const trend of trends) {
      // Create or get product with specific details
      const product = await prisma.product.upsert({
        where: { nome: trend.nome },
        update: {
          descricao: trend.descricao,
          imagem: trend.imagem,
        },
        create: {
          nome: trend.nome,
          descricao: trend.descricao,
          categoria: trend.categoria,
          imagem: trend.imagem,
        },
      });

      // Clean old trends for this product and create new one
      await prisma.trend.deleteMany({
        where: { productId: product.id },
      });

      await prisma.trend.create({
        data: {
          productId: product.id,
          score: trend.score,
          crescimento: 0,
          status: trend.status,
        },
      });
    }
  },
};
