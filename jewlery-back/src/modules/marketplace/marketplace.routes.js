// 🏪 MARKETPLACE ROUTES
import { Router } from "express";
import {
  compareKeyword,
  getTrendsByCategory,
  getTrendsInAlta,
} from "./marketplace.controller.js";

const router = Router();

// GET /marketplace/trends-alta - Tendências em ALTA (top sellers + crescimento)
router.get("/trends-alta", getTrendsInAlta);

// GET /marketplace/trends-categoria?category=produtos - Tendências por categoria
router.get("/trends-categoria", getTrendsByCategory);

// GET /marketplace/compare?keyword=semi%20joia - Compara keyword com dados de mercado
router.get("/compare", compareKeyword);

export default router;
