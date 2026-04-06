// trends.controller.js
import { getTrendsAnalysis } from "../../providers/googleTrends.provider.js";

export async function getAnalysis(req, res) {
  try {
    console.log("📊 Gerando análise de tendências...");
    const analysis = await getTrendsAnalysis();
    return res.json(analysis);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
