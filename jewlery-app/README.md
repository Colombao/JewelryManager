# Frontend — CRM de Semi Joias

Interface web em **Next.js 16**, **React 19**, **TypeScript** e **Tailwind CSS 4** para gestão de produtos, kits, fluxo comercial, tendências de mercado e portal da revendedora.

## Início rápido

### 1. Instalar dependências

```bash
cd jewlery-app
npm install
```

Requer **Node.js 20+** (ver `.nvmrc`).

### 2. Variáveis de ambiente

Crie `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 3. Desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

O backend deve estar rodando em `http://localhost:3001` (ver `jewlery-back/README_BACKEND.md`).

### 4. Produção

```bash
npm run build
npm start
```

## Páginas e rotas

| Rota | Descrição | Acesso |
|------|-----------|--------|
| `/` | Login do administrador | Público |
| `/dashboard` | KPIs de estoque, kits e acertos | Admin |
| `/fluxo` | Kanban do fluxo comercial (boards, cards, negócios) | Admin |
| `/produtos` | Listagem e gestão de produtos | Admin |
| `/cadastro` | Cadastro/edição de produtos e importação via planilha | Admin |
| `/kit` | Montagem de kit comercial | Admin |
| `/kits` | Kits montados e histórico | Admin |
| `/usuarios` | Cadastro de revendedoras | Admin |
| `/tendencias` | Tendências do Mercado Livre em tempo real | Admin |
| `/analise` | Análise Google Trends | Admin |
| `/configuracoes` | Categorias, banhos, fornecedores, margens e comissões | Admin |
| `/revendedora/login` | Login da revendedora | Público |
| `/revendedora` | Portal: negócios ativos, peças e acertos | Revendedora |

Rotas admin protegidas por `RequireAuth` (token JWT em `localStorage` via `AuthContext`).

## Componentes principais

| Componente | Função |
|------------|--------|
| `MainLayout` + `Sidebar` | Layout autenticado com navegação lateral |
| `MarketplaceTrends` | Cards de produtos em alta do Mercado Livre |
| `TrendsAnalysis` | Gráficos e insights do Google Trends |
| `BusinessKitPanel` | Painel de negócio: unidades vendidas, perdidas e acerto |
| `DataTable` | Tabelas reutilizáveis com busca e ações |
| `ResellerLayout` | Layout do portal da revendedora |
| `RequireAuth` / `RequireResellerAuth` | Guards de rota |

## Integração com a API

A URL base vem de `lib/api.ts`:

```typescript
export const apiUrl =
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";
```

Exemplos de endpoints consumidos:

- `POST /auth/login` — login admin
- `GET /dashboard/stats` — dashboard
- `GET /products`, `POST /products`, `POST /products/import` — produtos
- `GET /kits`, `POST /kits` — kits
- `GET /flow/board`, `POST /flow/business` — fluxo Kanban
- `GET /marketplace/trends-alta` — tendências ML
- `GET /trends/analysis` — Google Trends
- `POST /reseller-portal/login` — portal revendedora

## Bibliotecas auxiliares (`lib/`)

- `api.ts` — URL da API
- `pricing.ts` — margens, comissões e formatação de preços
- `business.ts` — tipos do fluxo comercial
- `settlement.ts` — acertos, pagamentos e status

## Importação de produtos

A página `/cadastro` aceita planilhas (`.xlsx`, `.xls`, `.csv`) via biblioteca **xlsx**, com parsing em `cadastro/productImport.ts` e envio em lotes para `POST /products/import`.

## Upload de imagens

Imagens de produto são enviadas para `POST /upload/product-image` e exibidas a partir de `/uploads/products/...` no backend. O `next.config.ts` permite carregar imagens do Mercado Livre (`*.mlstatic.com`) e do servidor da API.

## Stack tecnológica

| Tecnologia | Uso |
|------------|-----|
| Next.js 16 | App Router, SSR/CSR |
| React 19 | UI |
| TypeScript | Tipagem |
| Tailwind CSS 4 | Estilização |
| react-hot-toast | Notificações |
| sweetalert2 | Diálogos de confirmação |
| react-select | Seletores avançados |
| react-icons | Ícones |
| xlsx | Importação de planilhas |

## Fluxo de dados — tendências

```
Browser
  → MarketplaceTrends.tsx
  → GET /marketplace/trends-alta
  → marketplace.provider.js (scraping)
  → Mercado Livre
  → cache → JSON → dashboard
```

## Estrutura do projeto

```
jewlery-app/
├── app/
│   ├── components/       # UI compartilhada
│   ├── contexts/         # AuthContext
│   ├── cadastro/         # productImport.ts
│   ├── kit/              # kitUtils.ts
│   └── [páginas]/        # Uma pasta por rota
├── lib/                  # Utilitários e tipos
├── public/
└── next.config.ts
```

## Recursos implementados

- Autenticação admin (JWT) e portal da revendedora
- Dashboard com indicadores de estoque, kits e acertos
- CRUD de produtos com importação em lote e upload de imagem
- Montagem e listagem de kits comerciais
- Fluxo Kanban com acompanhamento peça a peça e acerto financeiro
- Gestão de revendedoras e configurações comerciais
- Tendências do Mercado Livre e análise Google Trends
- Interface responsiva com sidebar mobile

## Deploy

### Vercel (recomendado)

Configure `NEXT_PUBLIC_API_URL` apontando para a API em produção e faça deploy do diretório `jewlery-app`.

### Docker (exemplo)

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Próximos passos (roadmap)

- [ ] Exportação de relatórios (PDF/Excel)
- [ ] Gráficos históricos de preços e tendências
- [ ] Testes E2E
- [ ] App mobile
