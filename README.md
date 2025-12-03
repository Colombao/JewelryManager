# ERP para Semi Joias com Motor de Recomendação Baseado em Tendências de Mercado
**Autor:** João Vitor Colombo  
**Curso:** Engenharia de Software  
**Data:** Dezembro/2025  

---

## Resumo
Este projeto apresenta o desenvolvimento de um ERP especializado para o setor de semi joias, integrado a um módulo inteligente de recomendação responsável por analisar tendências do mercado e gerar kits otimizados para venda. A solução utiliza Next.js, Node.js, Express e MySQL para entregar uma aplicação web moderna, escalável e orientada à eficiência comercial. Este documento aborda o propósito do projeto, sua justificativa, arquitetura, requisitos e diretrizes técnicas.

---

# 1. Introdução

## Contexto
O mercado de semi joias é dinâmico, competitivo e altamente influenciado por tendências de moda e comportamento. Pequenos e médios lojistas enfrentam dificuldade em acompanhar essas tendências e em montar kits de produtos que maximizem suas vendas. A ausência de ferramentas especializadas dificulta análises e reduz a eficiência operacional.

## Justificativa
Este projeto é relevante para Engenharia de Software por integrar:

- Desenvolvimento web moderno  
- Arquitetura limpa e escalável  
- Processamento de dados para recomendação  
- Aplicação direta em um nicho real do mercado  

A proposta preenche uma lacuna existente: ERPs especializados com recomendações inteligentes para semi joias.

## Objetivos

### Objetivo Geral
Desenvolver um ERP para gestão de semi joias integrado a um módulo de recomendação baseado em tendências do mercado.

### Objetivos Específicos
- Criar módulo de cadastro e gerenciamento de produtos  
- Implementar dashboard com indicadores e relatórios  
- Desenvolver API REST em Node.js/Express  
- Integrar coleta de tendências de mercado via APIs externas ou datasets  
- Criar motor de recomendação capaz de montar kits automaticamente  
- Implementar mecanismos de segurança e conformidade com LGPD  

---

# 2. Descrição do Projeto

## Linha de Projeto
Aplicações Web (Web Apps).

## Tema do Projeto
Sistema ERP especializado em semi joias, com funcionalidades de gestão e motor inteligente de recomendação baseado em tendências.

## Propósito e Uso Prático
O projeto visa resolver dificuldades enfrentadas por lojistas na organização de produtos, composição de kits comerciais e análise de tendências. O sistema oferecerá relatórios, indicadores e recomendações automáticas, facilitando a tomada de decisão.

## Público-Alvo
- Lojistas de semi joias  
- Revendedores independentes  
- Pequenos negócios de acessórios  
- Curadores de kits de moda  

## Problemas a Resolver
- Falta de automação na montagem de kits  
- Ausência de ferramentas que interpretem tendências do mercado  
- Gestão de produtos desorganizada  
- Baixa eficiência nas análises visuais e gerenciais  

## Diferenciação / Ineditismo
- ERP completamente focado no nicho de semi joias  
- Módulo de recomendação baseado em tendências  
- Composição automática de kits comerciais  
- Abordagem orientada a dados e otimização de vendas  

## Limitações
O projeto não contemplará:
- Emissão de notas fiscais (NFe)  
- Controle financeiro avançado  
- Aplicativo mobile  
- Modelos avançados de IA (fase futura possível)  

## Normas e Legislações Aplicáveis
- LGPD (Lei Geral de Proteção de Dados)  
- WCAG (Princípios básicos de acessibilidade da web)  
- OWASP Top 10 (boas práticas de segurança)  

## Métricas de Sucesso
- Tempo médio de geração de recomendação inferior a 2s  
- Disponibilidade da API acima de 99%  
- Precisão das recomendações superior a 70%  
- Redução de pelo menos 50% no tempo de criação de kits  
- Aumento do engajamento na visualização de relatórios  

---

# 3. Especificação Técnica

## 3.1. Requisitos de Software

### Requisitos Funcionais (RF)
- RF01 – Permitir cadastro, edição e exclusão de produtos  
- RF02 – Listar e consultar produtos cadastrados  
- RF03 – Gerar kits recomendados automaticamente  
- RF04 – Exibir dashboard com indicadores e relatórios  
- RF05 – Autenticação de usuários  
- RF06 – Exportação de relatórios  

### Requisitos Não-Funcionais (RNF)
- RNF01 – Tempo de resposta inferior a 300ms por requisição  
- RNF02 – Interface clara, responsiva e de fácil uso  
- RNF03 – API estruturada seguindo padrões REST  
- RNF04 – Banco de dados deve garantir integridade ACID  
- RNF05 – Suporte mínimo para 100 usuários simultâneos  

### Representação dos Requisitos
(Pode ser incluído posteriormente o diagrama UML on-demand.)

### Aderência à Linha de Projeto
- Front-end em Next.js  
- Backend em Node.js/Express (API REST)  
- Integração com MySQL  
- Dashboard analítico  
- Autenticação e requisições assíncronas  

---

## 3.2. Considerações de Design

### Visão Inicial da Arquitetura
- Interface desenvolvida com Next.js  
- API ERP construída com Node.js/Express  
- Banco de dados MySQL  
- Módulo de recomendação integrado à API  

### Padrões de Arquitetura
- Arquitetura em camadas  
- MVC no backend  
- Princípios SOLID e Clean Code  

### Modelos C4
## C4 – Nível 1: Diagrama de Contexto

O sistema ERP para Semi Joias é uma aplicação web que permite:

- Gerenciar produtos
- Criar kits automaticamente com base em tendências
- Visualizar relatórios e dashboards
- Integrar dados externos de tendências do mercado

### Atores
- **Usuário (Lojista / Administrador)**  
  Interage através da interface web para gerenciar produtos e visualizar recomendações.

### Sistema Principal
- **ERP para Semi Joias**  
  Sistema web responsável por gerenciar dados, exibir dashboards e processar recomendações.

### Sistemas Externos
- **API de Tendências (Google Trends / Base própria)**  
  Fonte de dados usada para identificar produtos e categorias mais buscadas.

### Relações
- O usuário acessa o ERP via navegador.
- O ERP consulta a API de Tendências.
- O ERP processa dados e monta kits.
- O ERP salva e recupera dados do Banco MySQL.
  
## C4 – Nível 2: Diagrama de Containers

### Containers Principais

1. **Frontend (Next.js)**
   - Interface web responsiva.
   - Renderiza views e dashboards.
   - Envia requisições para a API via HTTP/HTTPS.

2. **API ERP (Node.js / Express)**
   - Contém toda a lógica de negócio.
   - Realiza CRUD de produtos.
   - Processa dados da API externa.
   - Gera kits recomendados.
   - Autentica usuários.

3. **Banco de Dados (MySQL)**
   - Armazena produtos, categorias, kits, tendências processadas, usuários.

4. **API Externa de Tendências**
   - Fornece dados sobre tendências de mercado.
  
## C4 – Nível 3: Componentes do Container "API ERP"

 1. AuthController
- Login, logout, renovação de token JWT.
- Middleware de segurança.

 2. ProductController
- CRUD de produtos.
- Validação de dados.
- Busca paginada.

 3. KitRecommendationService
- Consulta tendências.
- Combina produtos em kits.
- Aplica regras de recomendação.
- Salva kits gerados.

 4. TrendIntegrationService
- Conecta à API externa.
- Converte dados brutos.
- Padroniza formato interno.

 5. DashboardController
- KPIs (estoque, kits, produtos quentes).
- Histórico de tendências.
- Indicadores de vendas (fase futura).

 6. Database Layer (Repository Pattern)
- Conexão MySQL.
- Consultas via MySQL2.
- Sanitização e segurança.

 7. Middlewares
- Autenticação JWT
- Tratamento de erros
- Rate limiting (opcional)
 
<img width="1536" height="1024" alt="image" src="https://github.com/user-attachments/assets/fc937cd7-9a69-48fc-b552-3eb3d484c0a8" />


### Fluxo

Usuário → Frontend Next.js → API Node.js → Banco MySQL  
API Node.js → API Externa de Tendências → Recomenda kits → Retorna ao frontend


### Mockups das Telas Principais
A serem desenvolvidos usando Figma ou ferramenta equivalente.

### Decisões e Alternativas Consideradas
- Next.js escolhido pelo suporte a SSR e ótima performance  
- Node.js pela escalabilidade, comunidade forte e compatibilidade com JSON  
- MySQL pela robustez e facilidade de integração  

### Critérios de Escalabilidade, Resiliência e Segurança
- Controle de acesso por JWT  
- Uso de middlewares de validação  
- Prepared statements para prevenir SQL Injection  
- Logs e monitoramento de requisições  
- Possibilidade de shard/replicação no banco em fases futuras  

---

## 3.3. Stack Tecnológica

### Linguagens
- JavaScript / TypeScript  

### Frameworks e Bibliotecas
- Next.js  
- Node.js / Express  
- MySQL2  

### Ferramentas de Desenvolvimento e Gestão
- VSCode  
- Git e GitHub  
- Docker  
- Postman  
- Jest (futuro, para testes)  

### Licenciamento
- Projeto sob licença MIT  
- Dependências podem incluir MIT, Apache ou semelhantes  

---

## 3.4. Considerações de Segurança

### Riscos Identificados
- Possível SQL Injection  
- Ataques XSS  
- Exposição de dados sensíveis  
- Problemas de autenticação  

### Medidas de Mitigação
- Uso de prepared statements  
- Sanitização de entradas  
- Hashing de senhas com bcrypt  
- Controle de acesso e autorização  

### Normas e Boas Práticas Seguidas
- OWASP Top 10  
- LGPD  
- Boas práticas de segurança em APIs REST  

### Responsabilidade Ética
Embora o projeto utilize tendências de mercado, não faz uso de dados sensíveis. O sistema segue princípios de privacidade e transparência no tratamento das informações.

---

## 3.5. Conformidade e Normas Aplicáveis

### LGPD – Lei Geral de Proteção de Dados
- Coleta de dados mínima e necessária  
- Consentimento para armazenamento  
- Política de privacidade transparente  
- Permissão para edição e exclusão de dados  

---

# 4. Próximos Passos

### Portfólio I
- Finalização da modelagem do banco  
- Desenvolvimento da API base  
- Implementação das telas iniciais do sistema  

### Portfólio II
- Implementação completa do módulo de recomendação  
- Construção do dashboard analítico  
- Testes manuais e automatizados  
- Documentação final  

---

# 5. Referências
