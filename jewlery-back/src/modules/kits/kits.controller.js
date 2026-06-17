import { kitsService } from "./kits.service.js";

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
      err.message.includes("Estoque insuficiente")
    ) {
      return res.status(400).json({ error: err.message });
    }

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
