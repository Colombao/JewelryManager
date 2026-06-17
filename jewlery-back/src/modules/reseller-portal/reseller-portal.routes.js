import { Router } from "express";
import { resellerAuthMiddleware } from "../../middleware/resellerAuth.js";
import {
  getBusiness,
  listBusinesses,
  listSettlements,
  login,
  markSettlementPaid,
  me,
  registerSettlementPaymentHandler,
  updateUnit,
} from "./reseller-portal.controller.js";

const router = Router();

router.post("/login", login);
router.get("/me", resellerAuthMiddleware, me);
router.get("/businesses", resellerAuthMiddleware, listBusinesses);
router.get("/settlements", resellerAuthMiddleware, listSettlements);
router.get("/businesses/:cardId", resellerAuthMiddleware, getBusiness);
router.patch(
  "/businesses/:cardId/units/:unitId",
  resellerAuthMiddleware,
  updateUnit
);
router.post(
  "/settlements/:kitId/payments",
  resellerAuthMiddleware,
  registerSettlementPaymentHandler
);
router.post(
  "/settlements/:kitId/mark-paid",
  resellerAuthMiddleware,
  markSettlementPaid
);

export default router;
