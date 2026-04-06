// trends.service.js
import { getGoogleTrends } from "../../providers/googleTrends.provider.js";
import { trendsRepository } from "./trends.repository.js";

function calculateScore(googleValue) {
  return Math.round(googleValue * 1); // 0-100
}

export const trendsService = {
  async getAll() {
    return await trendsRepository.findAll();
  },

  async updateTrends() {
    const googleData = await getGoogleTrends();

    const trends = googleData.map((item) => ({
      nome: item.nome,
      descricao: item.descricao,
      categoria: item.categoria,
      imagem: item.imagem,
      score: calculateScore(item.value),
      status: item.value > 50 ? "alta" : "baixa",
    }));

    await trendsRepository.saveMany(trends);

    return trends;
  },
};
