import bcrypt from "bcryptjs";
import "dotenv/config";
import prisma from "./src/database/prismaClient.js";

const email = process.env.TEST_USER_EMAIL || "demo@demo";
const password = process.env.TEST_USER_PASSWORD || "demo";
const name = process.env.TEST_USER_NAME || "Usuário Demo";

try {
  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      password: hashedPassword,
      name,
    },
    create: {
      email,
      password: hashedPassword,
      name,
    },
  });

  console.log("✅ Usuário de teste preparado com senha criptografada");
  console.log(`Email: ${user.email}`);
  console.log(`Nome: ${user.name || "-"}`);
} catch (err) {
  console.error("❌ Erro ao preparar usuário de teste:", err.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
