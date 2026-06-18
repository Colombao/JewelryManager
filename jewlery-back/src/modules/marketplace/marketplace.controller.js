// 🏪 MARKETPLACE CONTROLLER - Endpoints de tendências dos marketplaces
import {
  compareKeywordWithMarketplace,
  getKitSuggestionsFromTrends,
  getMarketplaceTrends,
  getMarketplaceTrendsByCategory,
} from "../../providers/marketplace.provider.js";

export async function getTrendsInAlta(req, res) {
  try {
    console.log("📊 Buscando tendências em alta...");
    const { limit = 10, refresh } = req.query;
    const shouldRefresh = refresh === "1" || refresh === "true";
    const trends = await getMarketplaceTrends(parseInt(limit, 10), {
      refresh: shouldRefresh,
    });
    return res.json(trends);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}

export async function getTrendsByCategory(req, res) {
  try {
    const { category, limit = 5 } = req.query;
    if (!category) {
      return res.status(400).json({ error: "Category é obrigatório" });
    }
    console.log(`📊 Buscando tendências para categoria: ${category}`);
    const trends = await getMarketplaceTrendsByCategory(
      category,
      parseInt(limit)
    );
    return res.json({
      category,
      trends,
      total: trends.length,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}

export async function getKitSuggestions(req, res) {
  try {
    const { limit = 8 } = req.query;
    const suggestions = await getKitSuggestionsFromTrends(parseInt(limit, 10));
    return res.json(suggestions);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}

export async function compareKeyword(req, res) {
  try {
    const { keyword } = req.query;
    if (!keyword) {
      return res.status(400).json({ error: "Keyword é obrigatório" });
    }
    console.log(`📊 Comparando keyword: ${keyword}`);
    const comparison = await compareKeywordWithMarketplace(keyword);
    return res.json(comparison);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
