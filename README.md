# JewelryManager

1. Introdução
Contexto

O mercado de semi joias é dinâmico, competitivo e altamente influenciado por tendências de moda e comportamento. Pequenos e médios lojistas enfrentam dificuldade em acompanhar essas tendências e em montar kits de produtos que maximizem suas vendas. A ausência de ferramentas especializadas dificulta análises e reduz a eficiência operacional.

Justificativa

Este projeto é relevante para Engenharia de Software por integrar:

Desenvolvimento web moderno,

Arquitetura limpa e escalável,

Processamento de dados para recomendação,

Aplicação direta em um nicho real do mercado.

A proposta preenche uma lacuna existente: ERPs especializados com recomendações inteligentes para semi joias.

Objetivos
Objetivo Geral

Desenvolver um ERP para gestão de semi joias integrado a um módulo de recomendação baseado em tendências do mercado.

Objetivos Específicos

Criar módulo de cadastro e gerenciamento de produtos.

Implementar dashboard com indicadores e relatórios.

Desenvolver API REST em Node.js/Express.

Integrar coleta de tendências de mercado via APIs externas ou datasets.

Criar motor de recomendação capaz de montar kits automaticamente.

Implementar mecanismos de segurança e conformidade com LGPD.

2. Descrição do Projeto
Linha de Projeto

Aplicações Web (Web Apps).

Tema do Projeto

Sistema ERP especializado em semi joias, com funcionalidades de gestão e motor inteligente de recomendação baseado em tendências.

Propósito e Uso Prático

O projeto visa resolver dificuldades enfrentadas por lojistas na organização de produtos, composição de kits comerciais e análise de tendências. O sistema oferecerá relatórios, indicadores e recomendações automáticas, facilitando a tomada de decisão.

Público-Alvo

Lojistas de semi joias

Revendedores independentes

Pequenos negócios de acessórios

Curadores de kits de moda

Problemas a Resolver

Falta de automação na montagem de kits.

Ausência de ferramentas que interpretem tendências do mercado.

Gestão de produtos desorganizada.

Baixa eficiência nas análises visuais e gerenciais.

Diferenciação / Ineditismo

ERP completamente focado no nicho de semi joias.

Módulo de recomendação baseado em tendências.

Composição automática de kits comerciais.

Abordagem orientada a dados e otimização de vendas.

Limitações

O projeto não contemplará:

Emissão de notas fiscais (NFe).

Controle financeiro avançado.

Aplicativo mobile.

Modelos avançados de IA (fase futura possível).

Normas e Legislações Aplicáveis

LGPD (Lei Geral de Proteção de Dados)

WCAG (Princípios básicos de acessibilidade da web)

OWASP Top 10 (boas práticas de segurança)

Métricas de Sucesso

Tempo médio de geração de recomendação inferior a 2s.

Disponibilidade da API acima de 99%.

Precisão das recomendações superior a 70%.

Redução de pelo menos 50% no tempo de criação de kits.

Aumento do engajamento na visualização de relatórios.

3. Especificação Técnica
3.1. Requisitos de Software
Requisitos Funcionais (RF)

RF01 – Permitir cadastro, edição e exclusão de produtos.

RF02 – Listar e consultar produtos cadastrados.

RF03 – Gerar kits recomendados automaticamente.

RF04 – Exibir dashboard com indicadores e relatórios.

RF05 – Autenticação de usuários.

RF06 – Exportação de relatórios.

Requisitos Não-Funcionais (RNF)

RNF01 – Tempo de resposta inferior a 300ms por requisição.

RNF02 – Interface clara, responsiva e de fácil uso.

RNF03 – API estruturada seguindo padrões REST.

RNF04 – Banco de dados deve garantir integridade ACID.

RNF05 – Suporte mínimo para 100 usuários simultâneos.

Representação dos Requisitos

(Pode ser incluído posteriormente o diagrama UML on-demand.)

Aderência à Linha de Projeto

Front-end em Next.js

Backend em Node.js/Express (API REST)

Integração com MySQL

Dashboard analítico

Autenticação e requisições assíncronas

3.2. Considerações de Design
Visão Inicial da Arquitetura

Interface desenvolvida com Next.js

API ERP construída com Node.js/Express

Banco de dados MySQL

Módulo de recomendação integrado à API

Padrões de Arquitetura

Arquitetura em camadas

MVC no backend

Princípios SOLID e Clean Code

Modelos C4

(Disponível para desenvolvimento caso seja solicitado.)

Mockups das Telas Principais

A serem desenvolvidos usando Figma ou ferramenta equivalente.

Decisões e Alternativas Consideradas

Next.js escolhido pelo suporte a SSR e ótima performance.

Node.js pela escalabilidade, comunidade forte e compatibilidade com JSON.

MySQL pela robustez e facilidade de integração.

Critérios de Escalabilidade, Resiliência e Segurança

Controle de acesso por JWT

Uso de middlewares de validação

Prepared statements para prevenir SQL Injection

Logs e monitoramento de requisições

Possibilidade de shard/replicação no banco em fases futuras

3.3. Stack Tecnológica
Linguagens

JavaScript / TypeScript

Frameworks e Bibliotecas

Next.js

Node.js / Express

MySQL2

Ferramentas de Desenvolvimento e Gestão

VSCode

Git e GitHub

Docker

Postman

Jest (futuro, para testes)

Licenciamento

Projeto sob licença MIT

Dependências podem incluir MIT, Apache ou semelhantes

3.4. Considerações de Segurança
Riscos Identificados

Possível SQL Injection

Ataques XSS

Exposição de dados sensíveis

Problemas de autenticação

Medidas de Mitigação

Uso de prepared statements

Sanitização de entradas

Hashing de senhas com bcrypt

Controle de acesso e autorização

Normas e Boas Práticas Seguidas

OWASP Top 10

LGPD

Boas práticas de segurança em APIs REST

Responsabilidade Ética

Embora o projeto utilize tendências de mercado, não faz uso de dados sensíveis. O sistema segue princípios de privacidade e transparência no tratamento das informações.

3.5. Conformidade e Normas Aplicáveis
LGPD – Lei Geral de Proteção de Dados

Coleta de dados mínima e necessária

Consentimento para armazenamento

Política de privacidade transparente

Permissão para edição e exclusão de dados

4. Próximos Passos
Portfólio I

Finalização da modelagem do banco

Desenvolvimento da API base

Implementação das telas iniciais do sistema

Portfólio II

Implementação completa do módulo de recomendação

Construção do dashboard analítico

Testes manuais e automatizados

Documentação final

5. Referências

(Adicionar artigos, materiais de estudo e ferramentas utilizadas.)
