import { Router } from "express";
import {
  createKit,
  deleteKit,
  getAllKits,
  getAvailableKits,
  getKitById,
  getNextKitNumber,
  updateKit,
} from "./kits.controller.js";

const router = Router();

router.get("/next-number", getNextKitNumber);
router.get("/available", getAvailableKits);
router.get("/", getAllKits);
router.get("/:id", getKitById);
router.post("/", createKit);
router.put("/:id", updateKit);
router.delete("/:id", deleteKit);

export default router;
