import { getDashboardStats } from "./dashboard.service.js";

export async function getStats(req, res) {
  try {
    const stats = await getDashboardStats();
    return res.json(stats);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Erro ao carregar estatísticas" });
  }
}
