import prisma from "../../database/prismaClient.js";

async function list(req, res) {
  try {
    const platings = await prisma.platingType.findMany({
      orderBy: { name: "asc" },
    });

    return res.json(platings);
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao listar tipos de banho",
    });
  }
}

async function create(req, res) {
  try {
    const { name } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        error: "Nome é obrigatório",
      });
    }

    const plating = await prisma.platingType.create({
      data: {
        name: name.trim(),
      },
    });

    return res.status(201).json(plating);
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao criar tipo de banho",
    });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        error: "Nome é obrigatório",
      });
    }

    const plating = await prisma.platingType.update({
      where: {
        id: Number(id),
      },
      data: {
        name: name.trim(),
      },
    });

    return res.json(plating);
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao atualizar tipo de banho",
    });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;

    await prisma.platingType.delete({
      where: {
        id: Number(id),
      },
    });

    return res.json({
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao excluir tipo de banho",
    });
  }
}

export { create, list, remove, update };
