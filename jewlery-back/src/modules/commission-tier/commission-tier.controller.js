import prisma from "../../database/prismaClient.js";
import { DEFAULT_TIERS } from "../../utils/commission.js";

async function ensureDefaults() {
  const count = await prisma.commissionTier.count();
  if (count === 0) {
    await prisma.commissionTier.createMany({ data: DEFAULT_TIERS });
  }
}

function serialize(item) {
  return {
    ...item,
    maxAmount: Number(item.maxAmount),
    rate: Number(item.rate),
  };
}

async function list(req, res) {
  try {
    await ensureDefaults();

    const tiers = await prisma.commissionTier.findMany({
      orderBy: [{ sortOrder: "asc" }, { maxAmount: "asc" }],
    });

    return res.json(tiers.map(serialize));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao listar faixas de comissão" });
  }
}

async function create(req, res) {
  try {
    const { label, maxAmount, rate, sortOrder } = req.body;

    if (!label?.trim()) {
      return res.status(400).json({ error: "Nome da faixa é obrigatório" });
    }

    const parsedMax = Number(maxAmount);
    const parsedRate = Number(rate);

    if (!Number.isFinite(parsedMax) || parsedMax <= 0) {
      return res.status(400).json({ error: "Valor máximo inválido" });
    }

    if (!Number.isFinite(parsedRate) || parsedRate <= 0 || parsedRate > 1) {
      return res.status(400).json({ error: "Comissão deve ser entre 0 e 1 (ex: 0.2 = 20%)" });
    }

    const tier = await prisma.commissionTier.create({
      data: {
        label: label.trim(),
        maxAmount: parsedMax,
        rate: parsedRate,
        sortOrder:
          typeof sortOrder === "number" && Number.isFinite(sortOrder)
            ? Math.trunc(sortOrder)
            : Math.trunc(parsedMax),
      },
    });

    return res.status(201).json(serialize(tier));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao criar faixa de comissão" });
  }
}

async function update(req, res) {
  try {
    const { id } = req.params;
    const { label, maxAmount, rate, sortOrder } = req.body;

    if (!label?.trim()) {
      return res.status(400).json({ error: "Nome da faixa é obrigatório" });
    }

    const parsedMax = Number(maxAmount);
    const parsedRate = Number(rate);

    if (!Number.isFinite(parsedMax) || parsedMax <= 0) {
      return res.status(400).json({ error: "Valor máximo inválido" });
    }

    if (!Number.isFinite(parsedRate) || parsedRate <= 0 || parsedRate > 1) {
      return res.status(400).json({ error: "Comissão deve ser entre 0 e 1 (ex: 0.2 = 20%)" });
    }

    const data = {
      label: label.trim(),
      maxAmount: parsedMax,
      rate: parsedRate,
    };

    if (sortOrder !== undefined) {
      const parsedSort = Number(sortOrder);
      if (!Number.isFinite(parsedSort)) {
        return res.status(400).json({ error: "Ordem inválida" });
      }
      data.sortOrder = Math.trunc(parsedSort);
    }

    const tier = await prisma.commissionTier.update({
      where: { id: Number(id) },
      data,
    });

    return res.json(serialize(tier));
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao atualizar faixa de comissão" });
  }
}

async function remove(req, res) {
  try {
    const { id } = req.params;

    await prisma.commissionTier.delete({
      where: { id: Number(id) },
    });

    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Erro ao excluir faixa de comissão" });
  }
}

export { create, list, remove, update };
