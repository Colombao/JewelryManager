import bcrypt from "bcryptjs";
import cors from "cors";
import "dotenv/config";
import express from "express";
import jwt from "jsonwebtoken";
import prisma from "./database/prismaClient.js";
import categoryRoutes from "./modules/category/category.route.js";
import collectionRoutes from "./modules/collection/collection.route.js";
import flowRoutes from "./modules/flow/flow.routes.js";
import kitsRoutes from "./modules/kits/kits.routes.js";
import marketplaceRoutes from "./modules/marketplace/marketplace.routes.js";
import platingRoutes from "./modules/plating/plating.route.js";
import productsRoutes from "./modules/products/products.routes.js";
import resellersRoutes from "./modules/resellers/resellers.routes.js";
import supplierRoutes from "./modules/supplier/supplier.route.js";
import trendsRoutes from "./modules/trends/trends.routes.js";
import uploadRoutes from "./modules/upload/upload.routes.js";
import { ensureUploadDirectories, uploadRoot } from "./config/uploads.js";
import { getCorsOptions, isAllowedOrigin } from "./config/cors.js";

const app = express();

ensureUploadDirectories();
console.log(`📁 Uploads servidos de: ${uploadRoot}`);

app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization"
  );

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(cors(getCorsOptions()));
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(uploadRoot));

// Register (optional helper route)
app.post("/auth/register", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "email and password required" });

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing)
      return res.status(409).json({ error: "email already registered" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, password: hashed, name },
    });
    res.status(201).json({ id: user.id, email: user.email, name: user.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
});

// Login
app.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: "email and password required" });

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "invalid credentials" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "invalid credentials" });

    const token = jwt.sign(
      { sub: user.id, email: user.email },
      process.env.JWT_SECRET || "dev_secret",
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: { id: user.id, email: user.email, name: user.name },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
});

// Simple protected route example
function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "missing token" });
  const parts = auth.split(" ");
  if (parts.length !== 2)
    return res.status(401).json({ error: "invalid token format" });
  const token = parts[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "invalid token" });
  }
}

app.get("/me", authMiddleware, async (req, res) => {
  const id = req.user.sub;
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) return res.status(404).json({ error: "not found" });
  res.json({ id: user.id, email: user.email, name: user.name });
});

app.use("/trends", trendsRoutes);
app.use("/marketplace", marketplaceRoutes);
app.use("/resellers", resellersRoutes);
app.use("/flow", flowRoutes);
app.use("/suppliers", supplierRoutes);
app.use("/categories", categoryRoutes);
app.use("/collections", collectionRoutes);
app.use("/platings", platingRoutes);
app.use("/products", productsRoutes);
app.use("/kits", kitsRoutes);
app.use("/upload", uploadRoutes);

app.use((err, req, res, _next) => {
  const origin = req.headers.origin;
  if (origin && isAllowedOrigin(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }

  if (err.message === "Not allowed by CORS") {
    return res.status(403).json({ error: "CORS not allowed" });
  }

  console.error(err);
  res.status(500).json({ error: "internal error" });
});

export default app;
