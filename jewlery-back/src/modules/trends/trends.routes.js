import { Router } from "express";
import { getAnalysis } from "./trends.controller.js";

const router = Router();

router.get("/analysis", getAnalysis);

export default router;
