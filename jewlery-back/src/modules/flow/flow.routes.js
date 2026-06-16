import { Router } from "express";
import {
  createBoard,
  createBusiness,
  createCard,
  createStep,
  deleteBoard,
  deleteStep,
  getBoard,
  getBoardById,
  getBoards,
  getBusinessDetail,
  moveCard,
  reorderSteps,
  updateBusinessUnitStatus,
  updateStep,
} from "./flow.controller.js";

const router = Router();

// Compatibilidade (board ativo)
router.get("/board", getBoard);

// Multi-boards
router.get("/boards", getBoards);
router.get("/board/:boardId", getBoardById);
router.post("/board", createBoard);
router.delete("/board/:boardId", deleteBoard);

// Steps / Cards
router.post("/steps", createStep);
router.post("/steps/reorder", reorderSteps);
router.put("/steps/:stepId", updateStep);
router.delete("/steps/:stepId", deleteStep);
router.post("/cards", createCard);
router.post("/business", createBusiness);
router.get("/business/:cardId", getBusinessDetail);
router.patch("/business/:cardId/units/:unitId", updateBusinessUnitStatus);
router.post("/cards/:cardId/move", moveCard);

export default router;
