const explicitOrigins = [
  process.env.FRONTEND_URL,
  process.env.CORS_ORIGIN,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
]
  .filter(Boolean)
  .map((origin) => origin.replace(/\/$/, ""));

if (process.env.CORS_ORIGINS) {
  for (const origin of process.env.CORS_ORIGINS.split(",")) {
    const trimmed = origin.trim().replace(/\/$/, "");
    if (trimmed) explicitOrigins.push(trimmed);
  }
}

export function isAllowedOrigin(origin) {
  if (!origin) return true;

  const normalized = origin.replace(/\/$/, "");

  if (explicitOrigins.includes(normalized)) return true;

  // Deploys Railway (*.up.railway.app)
  if (/^https:\/\/[\w-]+\.up\.railway\.app$/i.test(normalized)) {
    return true;
  }

  if (process.env.NODE_ENV !== "production") return true;

  return false;
}

export function getCorsOptions() {
  return {
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        callback(null, true);
        return;
      }

      console.warn(`CORS bloqueado para origem: ${origin}`);
      callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  };
}
