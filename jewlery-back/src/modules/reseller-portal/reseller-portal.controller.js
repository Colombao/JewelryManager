import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import prisma from "../../database/prismaClient.js";
import {
  getBusinessDetailByCardId,
  listBusinessesForReseller,
  updateBusinessUnitByCardId,
} from "../flow/flow.business.service.js";
import {
  listSettlementsForReseller,
  markSettlementPaidByReseller,
  registerSettlementPayment,
} from "../kits/kit-settlement.service.js";

function parseSafeId(value, fieldName) {
  const parsed = Number.parseInt(String(value), 10);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > 2147483647) {
    return { error: `${fieldName} inválido` };
  }
  return { value: parsed };
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "email e senha são obrigatórios" });
    }

    const reseller = await prisma.reseller.findUnique({
      where: { email: String(email).trim() },
    });

    if (!reseller || !reseller.active) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const valid = await bcrypt.compare(password, reseller.password);
    if (!valid) {
      return res.status(401).json({ error: "Credenciais inválidas" });
    }

    const token = jwt.sign(
      {
        sub: reseller.id,
        email: reseller.email,
        name: reseller.name,
        type: "reseller",
      },
      process.env.JWT_SECRET || "dev_secret",
      { expiresIn: "7d" }
    );

    res.json({
      token,
      user: {
        id: reseller.id,
        email: reseller.email,
        name: reseller.name,
        role: "reseller",
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
}

async function me(req, res) {
  try {
    const reseller = await prisma.reseller.findUnique({
      where: { id: req.reseller.id },
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        phone: true,
        city: true,
        state: true,
        active: true,
      },
    });

    if (!reseller || !reseller.active) {
      return res.status(404).json({ error: "Revendedora não encontrada" });
    }

    res.json({ ...reseller, role: "reseller" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
}

async function listBusinesses(req, res) {
  try {
    const businesses = await listBusinessesForReseller(req.reseller.id);
    res.json(businesses);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
}

async function getBusiness(req, res) {
  try {
    const parsed = parseSafeId(req.params.cardId, "cardId");
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    const detail = await getBusinessDetailByCardId(parsed.value, {
      resellerId: req.reseller.id,
    });

    res.json(detail);
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({
      error: err.message || "internal error",
    });
  }
}

async function updateUnit(req, res) {
  try {
    const parsedCardId = parseSafeId(req.params.cardId, "cardId");
    if (parsedCardId.error) {
      return res.status(400).json({ error: parsedCardId.error });
    }

    const parsedUnitId = parseSafeId(req.params.unitId, "unitId");
    if (parsedUnitId.error) {
      return res.status(400).json({ error: parsedUnitId.error });
    }

    const { field, value } = req.body;

    if (field !== "reseller" && field !== "missing") {
      return res
        .status(403)
        .json({ error: "Revendedora só pode marcar venda ou falta/perda" });
    }

    if (typeof value !== "boolean") {
      return res.status(400).json({ error: "value deve ser boolean" });
    }

    const result = await updateBusinessUnitByCardId(
      parsedCardId.value,
      parsedUnitId.value,
      field,
      value,
      {
        resellerId: req.reseller.id,
        allowedFields: ["reseller", "missing"],
      }
    );

    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({
      error: err.message || "internal error",
    });
  }
}

async function listSettlements(req, res) {
  try {
    const data = await listSettlementsForReseller(req.reseller.id);
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "internal error" });
  }
}

async function registerSettlementPaymentHandler(req, res) {
  try {
    const parsed = parseSafeId(req.params.kitId, "kitId");
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    const { amount, note } = req.body;
    const settlement = await registerSettlementPayment(
      parsed.value,
      req.reseller.id,
      amount,
      note
    );

    res.json({
      message: "Pagamento informado. Aguardando confirmação da empresa.",
      settlement,
    });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({
      error: err.message || "internal error",
    });
  }
}

async function markSettlementPaid(req, res) {
  try {
    const parsed = parseSafeId(req.params.kitId, "kitId");
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    const settlement = await markSettlementPaidByReseller(
      parsed.value,
      req.reseller.id,
      req.body?.note
    );

    res.json({
      message: "Pagamento informado. Aguardando confirmação da empresa.",
      settlement,
    });
  } catch (err) {
    console.error(err);
    res.status(err.status || 500).json({
      error: err.message || "internal error",
    });
  }
}

export {
  getBusiness,
  listBusinesses,
  listSettlements,
  login,
  markSettlementPaid,
  me,
  registerSettlementPaymentHandler,
  updateUnit,
};
