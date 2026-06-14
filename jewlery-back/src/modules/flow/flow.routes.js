import { Router } from "express";
import {
  createBoard,
  createCard,
  createStep,
  deleteBoard,
  deleteStep,
  getBoard,
  getBoardById,
  getBoards,
  moveCard,
  reorderSteps,
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
router.post("/cards/:cardId/move", moveCard);

export default router;
