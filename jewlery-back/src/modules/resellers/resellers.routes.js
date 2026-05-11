import { Router } from "express";
import {
  createReseller,
  deleteReseller,
  getAllResellers,
  getResellerById,
  updateReseller,
} from "./resellers.controller.js";

const router = Router();

router.get("/", getAllResellers);
router.get("/:id", getResellerById);
router.post("/", createReseller);
router.put("/:id", updateReseller);
router.delete("/:id", deleteReseller);

export default router;
