import prisma from "../../database/prismaClient.js";

const DEFAULT_MARGINS = [
  { level: 1, name: "Nível 1", multiplier: 1.5 },
  { level: 2, name: "Nível 2", multiplier: 2.0 },
  { level: 3, name: "Nível 3", multiplier: 2.5 },
];

async function ensureDefaults() {
  const count = await prisma.profitMargin.count();
  if (count === 0) {
    await prisma.profitMargin.createMany({ data: DEFAULT_MARGINS });
  }
}

function serialize(item) {
  return {
    ...item,
    multiplier: Number(item.multiplier),
  };
}

async function list(req, res) {
  try {
    await ensureDefaults();

    const margins = await prisma.profitMargin.findMany({
      orderBy: { level: "asc" },
    });

    return res.json(margins.map(serialize));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar margens de lucro" });
  }
}

async function create(req, res) {
  try {
    const { level, name, multiplier } = req.body;

    if (!level || !name?.trim()) {
      return res.status(400).json({ error: "Nível e nome são obrigatórios" });
    }

    const parsedLevel = Number(level);
    const parsedMultiplier = Number(multiplier);

    if (!Number.isInteger(parsedLevel) || parsedLevel < 1) {
      return res.status(400).json({ error: "Nível inválido" });
    }

    if (!Number.isFinite(parsedMultiplier) || parsedMultiplier <= 0) {
      return res.status(400).json({ error: "Multiplicador inválido" });
    }

    const margin = await prisma.profitMargin.create({
      data: {
        level: parsedLevel,
        name: name.trim(),
        multiplier: parsedMultiplier,
      },
    });

    return res.status(201).json(serialize(margin));
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Já existe margem para este nível" });
    }

    console.error(error);
    return res.status(500).json({ error: "Erro ao criar margem de lucro" });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const { level, name, multiplier } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: "Nome é obrigatório" });
    }

    const parsedMultiplier = Number(multiplier);

    if (!Number.isFinite(parsedMultiplier) || parsedMultiplier <= 0) {
      return res.status(400).json({ error: "Multiplicador inválido" });
    }

    const data = {
      name: name.trim(),
      multiplier: parsedMultiplier,
    };

    if (level !== undefined) {
      const parsedLevel = Number(level);
      if (!Number.isInteger(parsedLevel) || parsedLevel < 1) {
        return res.status(400).json({ error: "Nível inválido" });
      }
      data.level = parsedLevel;
    }

    const margin = await prisma.profitMargin.update({
      where: { id: Number(id) },
      data,
    });

    return res.json(serialize(margin));
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({ error: "Já existe margem para este nível" });
    }

    console.error(error);
    return res.status(500).json({ error: "Erro ao atualizar margem de lucro" });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;

    await prisma.profitMargin.delete({
      where: { id: Number(id) },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao excluir margem de lucro" });
  }
}

export { create, list, remove, update };
