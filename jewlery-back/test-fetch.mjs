try {
  const response = await fetch("http://localhost:3001/trends/analysis");
  const data = await response.json();
  console.log("📊 Análise Completa:");
  console.log(JSON.stringify(data, null, 2));
} catch (err) {
  console.error("❌ Erro:", err.message);
}
