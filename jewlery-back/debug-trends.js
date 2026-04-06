import googleTrends from "google-trends-api";

const KEYWORDS = {
  produtos: ["anel feminino", "brinco dourado"],
  materiais: ["semi-joia ouro", "banhado a ouro"],
  tendencias: ["semi-joia tendência", "joia minimalista"],
  compra: ["comprar semi-joia", "loja semi-joia online"],
};

async function testAPI() {
  for (const [category, keywords] of Object.entries(KEYWORDS)) {
    console.log(`\n\n=== TESTANDO ${category.toUpperCase()} ===`);

    try {
      const result = await googleTrends.interestOverTime({
        keyword: keywords,
        geo: "BR",
      });

      const parsed = JSON.parse(result);
      console.log("✅ Resposta bruta:", JSON.stringify(parsed, null, 2));

      const timelineData = parsed.default.timelineData;
      if (timelineData.length > 0) {
        const latest = timelineData[timelineData.length - 1];
        console.log(
          "\n📊 Último ponto de dados:",
          JSON.stringify(latest, null, 2)
        );
      }
    } catch (err) {
      console.log("❌ Erro:", err.message);
    }

    // Pequeno delay para não sobrecarregar a API
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

testAPI();
