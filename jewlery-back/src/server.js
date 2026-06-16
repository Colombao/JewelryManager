// src/server.js

import app from "./app.js";
import { startTrendsJob } from "./jobs/trends.job.js";

const PORT = process.env.PORT || 3001;

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught exception:", err);
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);

  startTrendsJob();
});
