import prisma from "../../database/prismaClient.js";

export const resellersRepository = {
  async findAll() {
    return await prisma.reseller.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        phone: true,
        role: true,
        address: true,
        city: true,
        state: true,
        active: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
  },

  async findById(id) {
    return await prisma.reseller.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        phone: true,
        role: true,
        address: true,
        city: true,
        state: true,
        active: true,
        createdAt: true,
      },
    });
  },

  async findByEmail(email) {
    return await prisma.reseller.findUnique({
      where: { email },
    });
  },

  async create(data) {
    return await prisma.reseller.create({
      data,
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        phone: true,
        role: true,
        address: true,
        city: true,
        state: true,
        active: true,
        createdAt: true,
      },
    });
  },

  async update(id, data) {
    return await prisma.reseller.update({
      where: { id },
      data,
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        phone: true,
        role: true,
        address: true,
        city: true,
        state: true,
        active: true,
        createdAt: true,
      },
    });
  },

  async delete(id) {
    return await prisma.reseller.delete({
      where: { id },
    });
  },
};
