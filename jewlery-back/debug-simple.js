import googleTrends from "google-trends-api";

async function testSimple() {
  try {
    console.log("🔍 Testando com keyword simples: 'joia'");

    const result = await googleTrends.interestOverTime({
      keyword: ["joia"],
      geo: "BR",
      startTime: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000), // Últimos 90 dias
    });

    const parsed = JSON.parse(result);
    const timelineData = parsed.default.timelineData;

    if (timelineData.length > 0) {
      const latest = timelineData[timelineData.length - 1];
      console.log("✅ Dados recebidos!");
      console.log("Value:", latest.value);
      console.log("HasData:", latest.hasData);
    }
  } catch (err) {
    console.log("❌ Erro:", err.message);
  }
}

testSimple();
