import { Router } from "express";
import {
  createBoard,
  createCard,
  createStep,
  getBoard,
  getBoardById,
  getBoards,
  moveCard,
  reorderSteps,
} from "./flow.controller.js";

const router = Router();

// Compatibilidade (board ativo)
router.get("/board", getBoard);

// Multi-boards
router.get("/boards", getBoards);
router.get("/board/:boardId", getBoardById);
router.post("/board", createBoard);

// Steps / Cards
router.post("/steps", createStep);
router.post("/steps/reorder", reorderSteps);
router.post("/cards", createCard);
router.post("/cards/:cardId/move", moveCard);

export default router;
