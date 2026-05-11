import bcrypt from "bcryptjs";
import { resellersRepository } from "./resellers.repository.js";

export const resellersService = {
  async getAll() {
    return await resellersRepository.findAll();
  },

  async getById(id) {
    return await resellersRepository.findById(id);
  },

  async create(data) {
    // Verificar se email já existe
    const existing = await resellersRepository.findByEmail(data.email);
    if (existing) {
      throw new Error("Email já cadastrado");
    }

    // Hash da senha
    const hashedPassword = await bcrypt.hash(data.password, 10);

    return await resellersRepository.create({
      name: data.name,
      email: data.email,
      password: hashedPassword,
      cpf: data.cpf,
      phone: data.phone,
      role: data.role || "cliente",
      address: data.address || null,
      city: data.city || null,
      state: data.state || null,
      active: true,
    });
  },

  async update(id, data) {
    const reseller = await resellersRepository.findById(id);
    if (!reseller) {
      throw new Error("Revendedor não encontrado");
    }

    const updateData = {
      name: data.name || reseller.name,
      cpf: data.cpf || reseller.cpf,
      phone: data.phone || reseller.phone,
      role: data.role || reseller.role,
      address: data.address ?? reseller.address,
      city: data.city ?? reseller.city,
      state: data.state ?? reseller.state,
      active: data.active !== undefined ? data.active : reseller.active,
    };

    // Se tiver nova senha, fazer hash
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
    }

    return await resellersRepository.update(id, updateData);
  },

  async delete(id) {
    const reseller = await resellersRepository.findById(id);
    if (!reseller) {
      throw new Error("Revendedor não encontrado");
    }
    return await resellersRepository.delete(id);
  },
};
