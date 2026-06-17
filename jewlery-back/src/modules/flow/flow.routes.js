import { Router } from "express";
import {
  cancelCard,
  createBoard,
  createBusiness,
  createCard,
  createStep,
  deleteBoard,
  deleteStep,
  finalizeBusiness,
  getBoard,
  getBoardById,
  getBoards,
  getBusinessDetail,
  moveCard,
  reorderSteps,
  transferCard,
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
router.post("/business/:cardId/finalize", finalizeBusiness);
router.post("/cards/:cardId/move", moveCard);
router.post("/cards/:cardId/transfer", transferCard);
router.delete("/cards/:cardId", cancelCard);

export default router;
