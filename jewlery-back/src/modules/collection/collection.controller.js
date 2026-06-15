import prisma from "../../database/prismaClient.js";

async function list(req, res) {
  try {
    const collections = await prisma.collection.findMany({
      orderBy: { name: "asc" },
    });

    return res.json(collections);
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao listar coleções",
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

    const collection = await prisma.collection.create({
      data: {
        name: name.trim(),
      },
    });

    return res.status(201).json(collection);
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao criar coleção",
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

    const collection = await prisma.collection.update({
      where: {
        id: Number(id),
      },
      data: {
        name: name.trim(),
      },
    });

    return res.json(collection);
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao atualizar coleção",
    });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;

    await prisma.collection.delete({
      where: {
        id: Number(id),
      },
    });

    return res.json({
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao excluir coleção",
    });
  }
}

export { create, list, remove, update };
