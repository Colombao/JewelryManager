import express from "express";
import { getStats } from "./dashboard.controller.js";

const router = express.Router();

router.get("/stats", getStats);

export default router;
