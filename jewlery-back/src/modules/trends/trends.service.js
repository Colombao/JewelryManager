// trends.service.js
import { getTrendsAnalysis } from "../../providers/googleTrends.provider.js";
import { trendsRepository } from "./trends.repository.js";

function calculateScore(googleValue) {
  return Math.round(googleValue * 1); // 0-100
}

export const trendsService = {
  async getAll() {
    return await trendsRepository.findAll();
  },

  async updateTrends() {
    const analysis = await getTrendsAnalysis();
    const googleData = analysis.allTrends || [];

    const trends = googleData.map((item) => ({
      keyword: item.keyword,
      value: item.value,
      category: item.category,
      score: calculateScore(item.value),
      status: item.status,
    }));

    await trendsRepository.saveMany(trends);

    return trends;
  },
};
