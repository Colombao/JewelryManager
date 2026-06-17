import { kitsService } from "./kits.service.js";
import {
  confirmSettlementByCompany,
  confirmSettlementPayment,
  getSettlementByKitId,
} from "./kit-settlement.service.js";

export async function getNextKitNumber(req, res) {
  try {
    const kitNumber = await kitsService.getNextNumber();
    return res.json({ kitNumber });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}

export async function getAvailableKits(req, res) {
  try {
    const kits = await kitsService.getAvailable();
    return res.json(kits);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}

export async function getAllKits(req, res) {
  try {
    const kits = await kitsService.getAll();
    return res.json(kits);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}

export async function getKitById(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const kit = await kitsService.getById(id);

    if (!kit) {
      return res.status(404).json({ error: "Kit não encontrado" });
    }

    return res.json(kit);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}

export async function createKit(req, res) {
  try {
    const kit = await kitsService.create(req.body);
    return res.status(201).json(kit);
  } catch (err) {
    console.error(err);

    if (
      err.message.includes("obrigatório") ||
      err.message.includes("Adicione") ||
      err.message.includes("inválido") ||
      err.message.includes("Datas") ||
      err.message.includes("Estoque insuficiente")
    ) {
      return res.status(400).json({ error: err.message });
    }

    if (err.message.includes("já existe")) {
      return res.status(409).json({ error: err.message });
    }

    return res.status(500).json({ error: err.message });
  }
}

export async function updateKit(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const kit = await kitsService.update(id, req.body);
    return res.json(kit);
  } catch (err) {
    console.error(err);

    if (err.message.includes("não encontrado")) {
      return res.status(404).json({ error: err.message });
    }

    if (
      err.message.includes("obrigatório") ||
      err.message.includes("Adicione") ||
      err.message.includes("Datas") ||
      err.message.includes("Estoque insuficiente") ||
      err.message.includes("finalizados não podem")
    ) {
      return res.status(400).json({ error: err.message });
    }

    return res.status(500).json({ error: err.message });
  }
}

export async function confirmKitSettlementPayment(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const paymentId = parseInt(req.params.paymentId, 10);

    if (!Number.isFinite(paymentId) || paymentId <= 0) {
      return res.status(400).json({ error: "paymentId inválido" });
    }

    const settlement = await confirmSettlementPayment(
      id,
      paymentId,
      req.body?.note
    );
    return res.json({
      message: "Parcela confirmada",
      settlement,
    });
  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({ error: err.message });
  }
}

export async function confirmKitSettlement(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const settlement = await confirmSettlementByCompany(id, req.body?.note);
    return res.json({
      message: "Pagamento confirmado",
      settlement,
    });
  } catch (err) {
    console.error(err);
    return res.status(err.status || 500).json({ error: err.message });
  }
}

export async function getKitSettlement(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const settlement = await getSettlementByKitId(id);

    if (!settlement) {
      return res.status(404).json({ error: "Acerto não encontrado" });
    }

    return res.json(settlement);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}

export async function deleteKit(req, res) {
  try {
    const id = parseInt(req.params.id, 10);
    const result = await kitsService.remove(id);
    return res.json(result);
  } catch (err) {
    console.error(err);

    if (err.message.includes("não encontrado")) {
      return res.status(404).json({ error: err.message });
    }

    if (
      err.message.includes("fluxo") ||
      err.message.includes("montados podem ser excluídos")
    ) {
      return res.status(400).json({ error: err.message });
    }

    return res.status(500).json({ error: err.message });
  }
}
