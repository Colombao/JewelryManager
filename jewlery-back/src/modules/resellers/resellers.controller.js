import { resellersService } from "./resellers.service.js";

export async function getAllResellers(req, res) {
  try {
    const resellers = await resellersService.getAll();
    return res.json(resellers);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}

export async function getResellerById(req, res) {
  try {
    const { id } = req.params;
    const reseller = await resellersService.getById(parseInt(id));
    if (!reseller) {
      return res.status(404).json({ error: "Revendedor não encontrado" });
    }
    return res.json(reseller);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}

export async function createReseller(req, res) {
  try {
    const { name, email, password, cpf, phone, role, address, city, state } =
      req.body;

    if (!name || !email || !password || !cpf || !phone) {
      return res.status(400).json({
        error: "name, email, password, cpf e phone são obrigatórios",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "Senha deve ter pelo menos 6 caracteres",
      });
    }

    const reseller = await resellersService.create({
      name,
      email,
      password,
      cpf,
      phone,
      role: role || "cliente",
      address: address || null,
      city: city || null,
      state: state || null,
    });

    return res.status(201).json(reseller);
  } catch (err) {
    console.error(err);
    if (err.message.includes("Email já cadastrado")) {
      return res.status(409).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message });
  }
}

export async function updateReseller(req, res) {
  try {
    const { id } = req.params;
    const {
      name,
      email,
      password,
      cpf,
      phone,
      role,
      address,
      city,
      state,
      active,
    } = req.body;

    const reseller = await resellersService.update(parseInt(id), {
      name,
      email,
      password,
      cpf,
      phone,
      role,
      address,
      city,
      state,
      active,
    });

    return res.json(reseller);
  } catch (err) {
    console.error(err);
    if (err.message.includes("não encontrado")) {
      return res.status(404).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message });
  }
}

export async function deleteReseller(req, res) {
  try {
    const { id } = req.params;
    await resellersService.delete(parseInt(id));
    return res.json({ message: "Revendedor deletado com sucesso" });
  } catch (err) {
    console.error(err);
    if (err.message.includes("não encontrado")) {
      return res.status(404).json({ error: err.message });
    }
    return res.status(500).json({ error: err.message });
  }
}
