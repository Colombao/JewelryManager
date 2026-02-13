Backend mínimo com Express + Prisma + MySQL

Passos rápidos:

1. Editar `.env` com a `DATABASE_URL` (formato: `mysql://USER:PASSWORD@HOST:3306/DATABASE`) e `JWT_SECRET`.
2. Instalar dependências:

```bash
cd jewlery-back
npm install
npx prisma generate
npx prisma migrate dev --name init
```

3. Rodar o servidor:

```bash
npm run dev
```

Rotas:

- `POST /auth/register` { email, password, name? }
- `POST /auth/login` { email, password } -> retorna `{ token, user }`
- `GET /me` cabeçalho `Authorization: Bearer <token>` -> retorna user
