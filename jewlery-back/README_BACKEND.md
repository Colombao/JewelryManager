# Backend - Sistema Inteligente de Gestão de Semi Joias

Node.js + Express + Prisma + MySQL com **Web Scraping em Tempo Real** do Mercado Livre e integração com Google Trends.

## ⚡ Início Rápido

### 1. Configurar Variáveis de Ambiente

Crie `.env` na pasta `jewlery-back`:

```env
DATABASE_URL="mysql://USER:PASSWORD@HOST:3306/jewlery_db"
JWT_SECRET="sua_chave_jwt_secreta"
NODE_ENV="development"
```

### 2. Instalar Dependências

```bash
cd jewlery-back
npm install
npx prisma generate
npx prisma migrate dev --name init
```

### 3. Rodar o Servidor

```bash
node src/server.js
```

Servidor rodando em `http://localhost:3001`

## 🔥 Funcionalidades Principais

### 📊 Web Scraping - Mercado Livre

- **Puppeteer + Stealth Mode**: Extrai dados reais de produtos semi joias
- **50+ Produtos por Ciclo**: Múltiplas categorias (anéis, brincos, colares, pulseiras)
- **100% Dados Reais**: Sem mock data ou simulações
- **Cache 10 minutos**: Reduz carga repetida

### 📈 Análise Google Trends

- Tendências globais de palavras-chave
- Comparação com dados de mercado
- Insights preditivos

## 🛣️ Rotas da API

### Autenticação

```
POST /auth/register
  Body: { email, password, name? }
  Response: { token, user }

POST /auth/login
  Body: { email, password }
  Response: { token, user }

GET /me
  Header: Authorization: Bearer <token>
  Response: { user }
```

### Marketplace (Scraping em Tempo Real)

```
GET /marketplace/trends-alta?limit=10
  Response: { timestamp, fonte, totalProdutos, topTrends[] }
  - Retorna 50 produtos em tendência ordenados por score

GET /marketplace/trends-categoria?category=anel&limit=5
  Response: { category, trends[], total }
  - Filtra produtos por categoria

GET /marketplace/compare?keyword=semi+joia
  Response: { keyword, relatedProducts[], trends[] }
  - Compara palavra-chave com produtos relacionados
```

### Google Trends

```
GET /trends/analysis
  Response: { analysisTime, trendingTopics[], relatedSearches[] }
  - Retorna análise combinada de tendências
```

## 📦 Dependências Principais

- **puppeteer-extra**: Browser automation com plugins
- **puppeteer-extra-plugin-stealth**: Evita detecção de bot
- **cheerio**: HTML parsing e extração de dados
- **express**: Framework web
- **prisma**: ORM para MySQL
- **jsonwebtoken**: Autenticação JWT

## 🔧 Exemplo de Resposta

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

## 🚀 Escalabilidade Futura

- [ ] Adicionar Amazon como fonte
- [ ] Adicionar Facebook Marketplace
- [ ] Machine Learning para previsão
- [ ] Integração com sistemas ERP
- [ ] Notificações em tempo real
