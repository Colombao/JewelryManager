import { Router } from "express";
import { resellerAuthMiddleware } from "../../middleware/resellerAuth.js";
import {
  getBusiness,
  listBusinesses,
  login,
  me,
  updateUnit,
} from "./reseller-portal.controller.js";

const router = Router();

router.post("/login", login);
router.get("/me", resellerAuthMiddleware, me);
router.get("/businesses", resellerAuthMiddleware, listBusinesses);
router.get("/businesses/:cardId", resellerAuthMiddleware, getBusiness);
router.patch(
  "/businesses/:cardId/units/:unitId",
  resellerAuthMiddleware,
  updateUnit
);

export default router;
