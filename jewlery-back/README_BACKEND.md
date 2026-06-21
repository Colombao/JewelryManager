# Backend — CRM de Semi Joias

API REST em **Node.js 20+**, **Express 5**, **Prisma** e **MySQL**, com web scraping do Mercado Livre, Google Trends, gestão de produtos, kits comerciais, fluxo Kanban e portal da revendedora.

## Início rápido

### 1. Banco de dados

Suba o MySQL com Docker (na raiz do monorepo):

```bash
docker compose up -d
```

Ou use um MySQL próprio e crie o banco `jewlery_db`.

### 2. Variáveis de ambiente

Crie `.env` em `jewlery-back/`:

```env
DATABASE_URL="mysql://root:123@localhost:3306/jewlery_db"
JWT_SECRET="sua_chave_jwt_secreta"
NODE_ENV="development"
PORT=3001
```

### 3. Instalação e migrations

```bash
cd jewlery-back
npm install
npx prisma generate
npx prisma migrate dev
```

### 4. Usuário admin de teste (opcional)

```bash
npm run seed:auth
```

Credenciais padrão: `demo@demo` / `demo` (customizáveis via `TEST_USER_EMAIL`, `TEST_USER_PASSWORD`, `TEST_USER_NAME`).

### 5. Servidor

```bash
npm run dev
# ou
npm start
```

API em `http://localhost:3001`

## Estrutura do projeto

```
jewlery-back/
├── prisma/
│   ├── schema.prisma          # Modelos: User, Product, Kit, Reseller, Flow, etc.
│   └── migrations/
├── src/
│   ├── app.js                 # Express app e rotas montadas
│   ├── server.js              # Bootstrap + job de tendências
│   ├── config/                # CORS, uploads
│   ├── database/              # Prisma client
│   ├── jobs/                  # Cron de atualização de tendências (6h)
│   ├── middleware/            # Auth de revendedora
│   ├── modules/               # Módulos por domínio
│   ├── providers/             # Scraping ML, Google Trends, matching
│   └── utils/
├── uploads/                   # Imagens de produtos (servidas em /uploads)
├── seed-auth.js
└── package.json
```

## Funcionalidades implementadas

| Módulo | Descrição |
|--------|-----------|
| **Autenticação** | Login/registro admin com JWT; portal separado para revendedoras |
| **Produtos** | CRUD completo, importação em lote, upload de imagem, níveis de preço e estoque |
| **Kits** | Montagem, edição, numeração automática, acerto financeiro e pagamentos |
| **Fluxo (Kanban)** | Boards, colunas, cards vinculados a kits, acompanhamento por unidade vendida/perdida |
| **Revendedoras** | Cadastro com CPF, comissão e vínculo com kits |
| **Configurações** | Categorias, banhos, fornecedores, coleções, margens e faixas de comissão |
| **Marketplace** | Scraping Mercado Livre (Puppeteer + Cheerio), cache, sugestões para kits |
| **Tendências** | Google Trends + job agendado que persiste scores no banco |
| **Dashboard** | KPIs de estoque, kits e acertos pendentes |

## Rotas da API

### Autenticação (admin)

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/auth/register` | Registro de usuário admin |
| `POST` | `/auth/login` | Login admin → `{ token, user }` |
| `GET` | `/me` | Perfil do admin (Bearer JWT) |

### Produtos

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/products` | Lista produtos |
| `POST` | `/products` | Cria produto |
| `PUT` | `/products/:id` | Atualiza produto |
| `DELETE` | `/products/:id` | Remove produto |
| `POST` | `/products/import` | Importação em lote |

### Kits

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/kits` | Lista kits |
| `GET` | `/kits/next-number` | Próximo número de kit |
| `GET` | `/kits/available` | Kits disponíveis para o fluxo |
| `GET` | `/kits/:id` | Detalhe do kit |
| `POST` | `/kits` | Cria kit |
| `PUT` | `/kits/:id` | Atualiza kit |
| `DELETE` | `/kits/:id` | Remove kit |
| `GET` | `/kits/:id/settlement` | Acerto do kit |
| `POST` | `/kits/:id/settlement/confirm` | Confirma acerto (admin) |
| `POST` | `/kits/:id/settlement/payments/:paymentId/confirm` | Confirma pagamento informado |

### Fluxo comercial (Kanban)

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/flow/board` | Board ativo padrão |
| `GET` | `/flow/boards` | Lista boards |
| `GET` | `/flow/board/:boardId` | Board por ID |
| `POST` | `/flow/board` | Cria board |
| `DELETE` | `/flow/board/:boardId` | Remove board |
| `POST` | `/flow/steps` | Cria coluna |
| `PUT` | `/flow/steps/:stepId` | Atualiza coluna |
| `DELETE` | `/flow/steps/:stepId` | Remove coluna |
| `POST` | `/flow/steps/reorder` | Reordena colunas |
| `POST` | `/flow/cards` | Cria card |
| `POST` | `/flow/cards/:cardId/move` | Move card entre colunas |
| `POST` | `/flow/cards/:cardId/transfer` | Transfere card |
| `DELETE` | `/flow/cards/:cardId` | Cancela card |
| `POST` | `/flow/business` | Inicia negócio (kit no fluxo) |
| `GET` | `/flow/business/:cardId` | Detalhe do negócio |
| `PATCH` | `/flow/business/:cardId/units/:unitId` | Atualiza status da peça |
| `POST` | `/flow/business/:cardId/finalize` | Finaliza negócio e gera acerto |

### Revendedoras

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/resellers` | Lista revendedoras |
| `GET` | `/resellers/:id` | Detalhe |
| `POST` | `/resellers` | Cria revendedora |
| `PUT` | `/resellers/:id` | Atualiza |
| `DELETE` | `/resellers/:id` | Remove |

### Portal da revendedora

| Método | Rota | Descrição |
|--------|------|-----------|
| `POST` | `/reseller-portal/login` | Login revendedora |
| `GET` | `/reseller-portal/me` | Perfil (JWT revendedora) |
| `GET` | `/reseller-portal/businesses` | Negócios ativos |
| `GET` | `/reseller-portal/businesses/:cardId` | Detalhe do negócio |
| `PATCH` | `/reseller-portal/businesses/:cardId/units/:unitId` | Marca peça vendida/perdida |
| `GET` | `/reseller-portal/settlements` | Acertos e pagamentos |
| `POST` | `/reseller-portal/settlements/:kitId/payments` | Informa pagamento |
| `POST` | `/reseller-portal/settlements/:kitId/mark-paid` | Marca kit como pago |

### Configurações (CRUD em cada rota)

| Prefixo | Entidade |
|---------|----------|
| `/categories` | Categorias de produto |
| `/platings` | Tipos de banho |
| `/suppliers` | Fornecedores |
| `/collections` | Coleções |
| `/profit-margins` | Margens de lucro (níveis de preço) |
| `/commission-tiers` | Faixas de comissão |

### Marketplace e tendências

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/marketplace/trends-alta?limit=10` | Top produtos em alta (scraping ML) |
| `GET` | `/marketplace/trends-categoria?category=anel&limit=5` | Tendências por categoria |
| `GET` | `/marketplace/compare?keyword=semi+joia` | Compara keyword com mercado |
| `GET` | `/marketplace/kit-suggestions` | Sugestões cruzando tendências e estoque |
| `GET` | `/trends/analysis` | Análise Google Trends |

### Outros

| Método | Rota | Descrição |
|--------|------|-----------|
| `GET` | `/dashboard/stats` | KPIs para o dashboard admin |
| `POST` | `/upload/product-image` | Upload de imagem (`multipart/form-data`, campo `image`) |

Arquivos estáticos de upload: `GET /uploads/products/<arquivo>`

## Modelo de dados (resumo)

- **User** — administradores do sistema
- **Reseller** — revendedoras com login próprio
- **Product** — estoque, custos, preços por nível, fornecedor, categoria, banho, coleção
- **Kit** / **KitItem** / **KitItemUnit** — montagem comercial e controle peça a peça
- **KitSettlement** / **KitSettlementPayment** — acerto financeiro e confirmação de pagamentos
- **Board** / **Step** / **Card** — fluxo Kanban vinculado a kits
- **Trend** — scores de tendência associados a produtos
- **CommissionTier**, **ProfitMargin** — regras comerciais

Schema completo: `prisma/schema.prisma`

## Dependências principais

- **express** — API HTTP
- **@prisma/client** / **prisma** — ORM MySQL
- **jsonwebtoken** + **bcryptjs** — autenticação
- **puppeteer-extra** + **stealth** + **cheerio** — scraping Mercado Livre
- **google-trends-api** — tendências de busca
- **multer** — upload de imagens
- **node-cron** — atualização periódica de tendências
- **cors** — CORS configurável por origem

## Scripts npm

| Script | Comando |
|--------|---------|
| `npm run dev` | Inicia o servidor |
| `npm start` | Idem ao `dev` |
| `npm run seed:auth` | Cria/atualiza usuário admin de teste |
| `npm run prisma:generate` | Gera client Prisma |
| `npm run prisma:migrate` | Roda migrations |
| `npm test` | Testes unitários (Jest) |
| `npm run test:coverage` | Testes com relatório de cobertura (meta: 75%) |

## Observabilidade

- `GET /health` — status da API  
- `GET /metrics` — métricas Prometheus (`jewelry_http_requests_total`, latência, CPU/memória)  
- Stack local: `docker compose up -d prometheus grafana` (Grafana em `:3002`, admin/admin)

## Exemplo — tendências do marketplace

```json
{
  "timestamp": "2026-04-05T22:10:42.474Z",
  "fonte": "Web Scraping - Mercado Livre (Dados REAIS em Tempo Real)",
  "totalProdutos": 50,
  "topTrends": [
    {
      "posicao": 1,
      "nome": "Anel Ajustável Luxo Martelado Banho Ouro 18k Semi Joia",
      "vendidos": 246,
      "preco": 19.9,
      "marketplace": "mercado-livre",
      "categoria": "produtos",
      "imagem": "https://...",
      "crescimento": 67,
      "rating": "4.7",
      "score": 62,
      "url": "https://mercadolivre.com.br/...",
      "reviews": 215
    }
  ]
}
```

## Próximos passos (roadmap)

- [ ] Autenticação JWT obrigatória em rotas sensíveis (hoje várias rotas estão abertas)
- [ ] Novas fontes de marketplace (Amazon, etc.)
- [ ] Rate limiting adicional
- [ ] Notificações em tempo real
