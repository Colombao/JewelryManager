# Frontend - Dashboard de Tendências de Semi Joias

Next.js 15 + TypeScript + Tailwind CSS - Interface visual para análise inteligente de tendências do mercado de semi joias com dados em tempo real.

## 🚀 Início Rápido

### 1. Instalar Dependências

```bash
cd jewlery-app
npm install
```

### 2. Rodar Servidor de Desenvolvimento

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000)

### 3. Build para Produção

```bash
npm run build
npm start
```

## 📊 Componentes Principais

### MarketplaceTrends Component
- **Visualização em tempo real** de produtos em tendência
- **Cards interativos** com preço, vendas, crescimento e rating
- **Score visual** calculado automaticamente
- **Progress bar** de crescimento
- **Estatísticas resumidas**: Total de produtos, crescimento médio, avaliação média
- Dados integrados da API de web scraping

### TrendsAnalysis Component
- Análise Google Trends integrada
- Comparação de palavras-chave
- Insights preditivos
- Visualização de tendências globais

## 🎨 Páginas Disponíveis

```
/dashboard          - Dashboard principal
/tendencias         - Tendências em alta (MarketplaceTrends)
/analise            - Análise Google Trends 
/cadastro           - Registro de novos usuários
/login              - Autenticação de usuários
/usuarios           - Gerenciamento de usuários
```

## 🔗 Integração com Backend

A aplicação se conecta aos endpoints do backend:

```typescript
// Em MarketplaceTrends.tsx
const response = await fetch(
  'http://localhost:3001/marketplace/trends-alta?limit=10'
);
const data = await response.json();
```

**Certifique-se que o backend está rodando em `http://localhost:3001`**

## 🛠️ Stack Tecnológico

- **Next.js 15**: Framework React com SSR
- **TypeScript**: Type safety
- **Tailwind CSS**: Estilização utilitária
- **React Hooks**: State management
- **next/image**: Otimização de imagens
- **Axios/Fetch**: Requisições HTTP

## 📦 Configuração de Imagens Externas

O projeto está configurado para carregar imagens do Mercado Livre:

```typescript
// next.config.ts
remotePatterns: [
  { protocol: "https", hostname: "http2.mlstatic.com" },
  { protocol: "https", hostname: "images.unsplash.com" }
]
```

## 🚀 Deploy

### Vercel (Recomendado)

```bash
npm i -g vercel
vercel
```

Ou conecte diretamente um repositório GitHub à Vercel.

### Docker

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY . .
RUN npm install && npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 🔄 Fluxo de Dados

```
Browser (Frontend)
    ↓
MarketplaceTrends.tsx (fetch)
    ↓
http://localhost:3001/marketplace/trends-alta
    ↓
Backend API (marketplace.provider.js)
    ↓
Puppeteer + Cheerio (Web Scraping)
    ↓
Mercado Livre (Source)
    ↓
Dados REAIS → Cache → JSON Response → Dashboard
```

## 📝 Variáveis de Ambiente

Crie `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_APP_NAME=JewelTrends
NEXT_PUBLIC_APP_VERSION=1.0.0
```

## ✅ Recursos Implementados

✅ Exibição de tendências em tempo real  
✅ Integração com dados reais do Mercado Livre  
✅ Scores automáticos de viabilidade  
✅ Visualização responsiva  
✅ Cache de dados  
✅ Imagens otimizadas  
✅ Interface moderna com Tailwind CSS  

## 📈 Próximas Funcionalidades

- [ ] Autenticação completa de usuários
- [ ] Dashboard customizável
- [ ] Exportação de relatórios em PDF
- [ ] Gráficos de histórico de preços
- [ ] Notificações de oportunidades
- [ ] App Mobile (React Native)
