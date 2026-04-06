import googleTrends from "google-trends-api";

// 🎯 KEYWORDS ORGANIZADAS POR CATEGORIA
export const KEYWORDS = {
  produtos: [
    "semi joias",
    "brinco dourado",
    "brinco argola",
    "brinco ponto de luz",
    "anel feminino dourado",
    "anel ajustável feminino",
    "colar feminino dourado",
    "colar com pingente",
    "colar ponto de luz",
    "pulseira feminina dourada",
    "pulseira ajustável",
    "tornozeleira feminina",
    "corrente feminina dourada",
    "mix de colares",
    "mix de pulseiras",
  ],

  materiais: [
    "semi joia folheada a ouro",
    "semi joia banho de ouro",
    "folheado a ouro 18k",
    "semi joia prata 925",
    "prata 925 feminina",
    "aço inoxidável joias",
    "joia hipoalergênica",
    "semijoia antialérgica",
    "banho de ouro dura quanto",
    "semi joia escurece",
  ],

  tendencias: [
    "joias minimalistas",
    "semi joias delicadas",
    "joias femininas modernas",
    "acessorios femininos moda",
    "tendencia semi joias",
    "joias douradas moda",
    "joias prata moda",
    "acessorios femininos 2026",
    "estilo minimalista feminino",
    "joias elegantes femininas",
  ],

  compra: [
    "comprar semi joias",
    "semi joias online",
    "loja de semi joias",
    "semi joias baratas",
    "semi joias promoção",
    "semi joias atacado",
    "fornecedor semi joias",
    "revenda semi joias",
    "semi joias para revender",
    "semi joias direto da fabrica",
  ],
};

// 🔹 Helpers
function chunkArray(array, size = 5) {
  const result = [];
  for (let i = 0; i < array.length; i += size) {
    result.push(array.slice(i, i + size));
  }
  return result;
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// 🔁 Retry automático
async function fetchWithRetry(fn, retries = 3) {
  try {
    return await fn();
  } catch (err) {
    if (retries === 0) throw err;

    console.log("🔁 Retry após erro...");
    await delay(2000);

    return fetchWithRetry(fn, retries - 1);
  }
}

// 🔹 Classificação
function getTrendStatus(value) {
  if (value >= 75) return "alta";
  if (value >= 50) return "media";
  if (value >= 25) return "baixa";
  return "morta";
}

// 🔹 Filtro (ajustável)
function isRelevant(value) {
  return value >= 10;
}

// 🔹 Busca tendências por categoria (AGORA COM DADOS REAIS E SEGURO)
async function fetchTrendsByCategory(category, keywords) {
  const trends = [];

  const keywordGroups = chunkArray(keywords, 5).slice(0, 2); // 🔥 LIMITA

  for (const group of keywordGroups) {
    try {
      console.log(`📊 [${category}] Grupo: ${group.join(", ")}`);

      await delay(3000); // 🔥 MAIS SEGURO

      const result = await fetchWithRetry(() =>
        googleTrends.interestOverTime({
          keyword: group,
          geo: "BR",
        })
      );

      // 🔥 DETECÇÃO DE BLOQUEIO
      if (typeof result === "string" && result.startsWith("<")) {
        console.log("🚫 Bloqueado (HTML recebido)");
        continue;
      }

      let parsed;

      try {
        parsed = JSON.parse(result);
      } catch {
        console.log("🚫 JSON inválido");
        continue;
      }

      const timelineData = parsed?.default?.timelineData;

      if (!timelineData?.length) continue;

      const latest = timelineData[timelineData.length - 1];

      group.forEach((keyword, index) => {
        const value = latest?.value?.[index] || 0;

        if (!isRelevant(value)) return;

        trends.push({
          keyword,
          value,
          status: getTrendStatus(value),
          category,
        });

        console.log(`✅ ${keyword} → ${value}`);
      });
    } catch (err) {
      console.log(`⚠️ Erro em [${category}] grupo: ${err.message}`);
    }
  }

  return trends;
}
// 🔹 Análise por categoria
function analyzeByCategory(allTrends) {
  const analysis = {};

  Object.keys(KEYWORDS).forEach((category) => {
    const categoryTrends = allTrends.filter((t) => t.category === category);
    const values = categoryTrends.map((t) => t.value);

    analysis[category] = {
      total: categoryTrends.length,
      mediaScore:
        values.length > 0
          ? Math.round(values.reduce((a, b) => a + b, 0) / values.length)
          : 0,
      maxScore: values.length > 0 ? Math.max(...values) : 0,
      minScore: values.length > 0 ? Math.min(...values) : 0,
      trending: categoryTrends.filter((t) => t.status === "alta").length,
      topKeyword: categoryTrends.sort((a, b) => b.value - a.value)[0],
    };
  });

  return analysis;
}


// 📊 ANÁLISE COMPLETA
export async function getTrendsAnalysis() {
  const allTrends = [];

  for (const [category, keywords] of Object.entries(KEYWORDS)) {
    const categoryTrends = await fetchTrendsByCategory(category, keywords);
    allTrends.push(...categoryTrends);
  }
  console.log("📊 Tendências coletadas:", allTrends.length);

  const analysis = analyzeByCategory(allTrends);

  const topTrends = allTrends.sort((a, b) => b.value - a.value).slice(0, 10);

  return {
    timestamp: new Date().toISOString(),
    summary: {
      totalKeywords: Object.values(KEYWORDS).reduce(
        (acc, arr) => acc + arr.length,
        0
      ),
      trendingFound: allTrends.length,
      mediaGeral:
        allTrends.length > 0
          ? Math.round(
              allTrends.reduce((acc, t) => acc + t.value, 0) / allTrends.length
            )
          : 0,
    },
    byCategory: analysis,
    topTrends,
    allTrends: allTrends.sort((a, b) => b.value - a.value),
  };
}
