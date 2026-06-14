import prisma from "../../database/prismaClient.js";

async function list(req, res) {
  try {
    const categories = await prisma.productCategory.findMany({
      orderBy: { name: "asc" },
    });

    return res.json(categories);
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao listar categorias",
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

    const category = await prisma.productCategory.create({
      data: {
        name: name.trim(),
      },
    });

    return res.status(201).json(category);
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao criar categoria",
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

    const category = await prisma.productCategory.update({
      where: {
        id: Number(id),
      },
      data: {
        name: name.trim(),
      },
    });

    return res.json(category);
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao atualizar categoria",
    });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;

    await prisma.productCategory.delete({
      where: {
        id: Number(id),
      },
    });

    return res.json({
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao excluir categoria",
    });
  }
}

export { create, list, remove, update };
