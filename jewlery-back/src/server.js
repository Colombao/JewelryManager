// src/server.js

import app from "./app.js";
import { startTrendsJob } from "./jobs/trends.job.js";

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // 🔌 INICIA O JOB AQUI
  startTrendsJob();
});
