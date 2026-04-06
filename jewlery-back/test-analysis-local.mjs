import {
  getTrendsAnalysis,
  KEYWORDS,
} from "./src/providers/googleTrends.provider.js";

console.log("🔑 Keywords configurados:");
console.log(JSON.stringify(KEYWORDS, null, 2));

console.log("\n🚀 Iniciando análise...\n");

try {
  const analysis = await getTrendsAnalysis();
  console.log("\n\n📊 RESULTADO FINAL:");
  console.log(JSON.stringify(analysis, null, 2));
} catch (err) {
  console.error("❌ Erro:", err);
}
