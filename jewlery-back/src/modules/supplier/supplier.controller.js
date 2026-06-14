import prisma from "../../database/prismaClient.js";

async function list(req, res) {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: "asc" },
    });

    return res.json(suppliers);
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao listar fornecedores",
    });
  }
}

async function create(req, res) {
  try {
    const { name, email, phone } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        error: "Nome é obrigatório",
      });
    }

    const supplier = await prisma.supplier.create({
      data: {
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
      },
    });

    return res.status(201).json(supplier);
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao criar fornecedor",
    });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const { name, email, phone } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({
        error: "Nome é obrigatório",
      });
    }

    const supplier = await prisma.supplier.update({
      where: {
        id: Number(id),
      },
      data: {
        name: name.trim(),
        email: email?.trim() || null,
        phone: phone?.trim() || null,
      },
    });

    return res.json(supplier);
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao atualizar fornecedor",
    });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;

    await prisma.supplier.delete({
      where: {
        id: Number(id),
      },
    });

    return res.json({
      success: true,
    });
  } catch (error) {
    return res.status(500).json({
      error: "Erro ao excluir fornecedor",
    });
  }
}

export { create, list, remove, update };
