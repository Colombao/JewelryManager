import prisma from "../../database/prismaClient.js";

// Para manter compatível com seu middleware atual, exigimos token presente.
function requireToken(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).json({ error: "missing token" });
  const parts = auth.split(" ");
  if (parts.length !== 2)
    return res.status(401).json({ error: "invalid token format" });
  req.token = parts[1];
  next();
}

function boardToResponse(board) {
  const steps = board.steps
    .map((s) => ({
      id: s.id,
      name: s.name,
      businessId: s.boardId,
      order: s.order,
    }))
    .sort((a, b) => a.order - b.order);

  const cards = board.cards
    .map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      order: c.order,
      stepId: c.stepId,
    }))
    .sort((a, b) => a.order - b.order);

  return {
    id: board.id,
    name: board.name,
    steps,
    cards,
  };
}

async function getBoards(req, res) {
  try {
    const boards = await prisma.board.findMany({
      select: {
        id: true,
        name: true,
        active: true,
      },
      orderBy: { id: "desc" },
    });

    res.json(boards);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
}

async function getBoardById(req, res) {
  try {
    const { boardId } = req.params;
    const board = await prisma.board.findUnique({
      where: { id: Number(boardId) },
      include: { steps: true, cards: true },
    });

    if (!board) return res.status(404).json({ error: "board not found" });

    res.json(boardToResponse(board));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
}

// Compatibilidade: continua retornando o board ativo.
async function getBoard(req, res) {
  try {
    const board = await prisma.board.findFirst({
      where: { active: true },
      include: { steps: true, cards: true },
    });

    if (!board) return res.status(404).json({ error: "board not found" });

    res.json(boardToResponse(board));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
}

async function createBoard(req, res) {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "name required" });

    const board = await prisma.board.create({
      data: { name, active: true },
    });

    res.status(201).json({ id: board.id, name: board.name });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
}

async function createStep(req, res) {
  try {
    const { boardId, name, order } = req.body;
    if (!boardId || !name)
      return res.status(400).json({ error: "boardId and name required" });

    const step = await prisma.step.create({
      data: {
        boardId: Number(boardId),
        name,
        order: typeof order === "number" ? order : undefined,
      },
    });

    res.status(201).json(step);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
}

async function createCard(req, res) {
  try {
    const { stepId, title, description, order } = req.body;
    if (!stepId || !title)
      return res.status(400).json({ error: "stepId and title required" });

    const card = await prisma.card.create({
      data: {
        stepId: Number(stepId),
        title,
        description: description ?? null,
        order: typeof order === "number" ? order : undefined,
      },
    });

    res.status(201).json(card);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
}

async function moveCard(req, res) {
  try {
    const { cardId } = req.params;
    const { stepId, order } = req.body;

    if (!stepId || typeof order !== "number") {
      return res.status(400).json({ error: "stepId and order required" });
    }

    const updated = await prisma.card.update({
      where: { id: Number(cardId) },
      data: {
        stepId: Number(stepId),
        order,
      },
    });

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
}

async function reorderSteps(req, res) {
  try {
    const { boardId, steps } = req.body;

    if (!boardId || !Array.isArray(steps)) {
      return res
        .status(400)
        .json({ error: "boardId and steps array required" });
    }

    // Atualiza em loop (ok para poucos steps). Pode otimizar depois com transactions.
    for (const s of steps) {
      if (!s?.id || typeof s.order !== "number") continue;

      await prisma.step.updateMany({
        where: { id: Number(s.id), boardId: Number(boardId) },
        data: { order: s.order },
      });
    }

    const board = await prisma.board.findUnique({
      where: { id: Number(boardId) },
      include: { steps: true, cards: true },
    });

    if (!board) return res.status(404).json({ error: "board not found" });

    res.json(boardToResponse(board));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
}

export {
  createBoard,
  createCard,
  createStep,
  getBoard,
  getBoardById,
  getBoards,
  moveCard,
  reorderSteps,
  requireToken,
};
