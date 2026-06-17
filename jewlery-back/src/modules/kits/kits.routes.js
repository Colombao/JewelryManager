import { Router } from "express";
import {
  confirmKitSettlement,
  confirmKitSettlementPayment,
  createKit,
  deleteKit,
  getAllKits,
  getAvailableKits,
  getKitById,
  getKitSettlement,
  getNextKitNumber,
  updateKit,
} from "./kits.controller.js";

const router = Router();

router.get("/next-number", getNextKitNumber);
router.get("/available", getAvailableKits);
router.get("/", getAllKits);
router.get("/:id/settlement", getKitSettlement);
router.post("/:id/settlement/payments/:paymentId/confirm", confirmKitSettlementPayment);
router.post("/:id/settlement/confirm", confirmKitSettlement);
router.get("/:id", getKitById);
router.post("/", createKit);
router.put("/:id", updateKit);
router.delete("/:id", deleteKit);

export default router;
