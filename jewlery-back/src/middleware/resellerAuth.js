import jwt from "jsonwebtoken";

export function resellerAuthMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "missing token" });

  const parts = auth.split(" ");
  if (parts.length !== 2) {
    return res.status(401).json({ error: "invalid token format" });
  }

  try {
    const payload = jwt.verify(
      parts[1],
      process.env.JWT_SECRET || "dev_secret"
    );

    if (payload.type !== "reseller") {
      return res.status(403).json({ error: "acesso restrito à revendedora" });
    }

    req.reseller = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
    };
    next();
  } catch {
    return res.status(401).json({ error: "invalid token" });
  }
}
