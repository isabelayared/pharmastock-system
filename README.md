# 💊 PharmaStock - Sistema Inteligente de Gestão Farmacêutica

![React](https://img.shields.io/badge/Frontend-React-blue) ![NestJS](https://img.shields.io/badge/Backend-NestJS-red) ![Prisma](https://img.shields.io/badge/ORM-Prisma-white) ![Status](https://img.shields.io/badge/Status-Em_Produção-green)

> **"A tecnologia aplicada para evitar o desperdício de medicamentos e agilizar o atendimento no balcão."**

🔗 **Acesse o Sistema Online:** [CLIQUE AQUI PARA TESTAR]([https://pharmastock-system.vercel.app](https://pharmastock-system-c0e134su4-isabela-yared-soares-projects.vercel.app))  
*(Nota: O Backend está hospedado no plano gratuito do Render, pode levar 50s para "acordar" no primeiro acesso).*

---

## A História por Trás do Projeto

Durante minha experiência profissional em uma grande rede farmacêutica (Drogaria São Paulo), notei uma "dor" latente na operação diária: **o controle de validade e perdas.**

Muitas vezes, o controle de lotes é manual ou visual, o que leva ao vencimento de produtos nas prateleiras e prejuízo financeiro. Além disso, no momento da venda, a agilidade é crucial.

Como estudante do **5º Semestre de Ciência da Computação**, decidi unir a teoria acadêmica com essa vivência prática. O **PharmaStock** não é apenas um CRUD; é uma solução desenhada para resolver o problema do **FEFO (First Expired, First Out)** — o primeiro que vence é o primeiro que sai.

---

## Tecnologias e Arquitetura

O projeto foi desenvolvido utilizando uma arquitetura moderna **Fullstack**, separando as responsabilidades para garantir escalabilidade.

### Frontend (A "Cara" do Sistema)
- **React + Vite:** Para uma interface ultra-rápida e reativa.
- **TypeScript:** Para garantir tipagem segura e evitar erros de código.
- **TailwindCSS:** Estilização moderna e responsiva.
- **Recharts:** Biblioteca para os gráficos de análise de estoque.

### Backend (O "Cérebro")
- **NestJS:** Framework Node.js progressivo (padrão de mercado enterprise).
- **Prisma ORM:** Para comunicação eficiente e segura com o banco de dados.
- **SQLite:** Banco de dados relacional (escolhido pela portabilidade neste MVP).

### Infraestrutura (DevOps)
- **Vercel:** Hospedagem do Frontend.
- **Render:** Hospedagem da API Backend.
- **GitHub:** Versionamento e CI/CD manual.

---

## Aplicação dos Conceitos da Faculdade

Este projeto consolida conhecimentos de diversas matérias da graduação em Ciência da Computação:

1.  **Estrutura de Dados:**
    * Uso intenso de *Arrays* e manipulação de objetos para filtrar produtos e lotes.
    * Algoritmos de ordenação (`sort`) para garantir que o lote com validade mais próxima apareça primeiro (Lógica FEFO).

2.  **Engenharia de Software:**
    * Arquitetura MVC (Model-View-Controller) aplicada no Backend.
    * Princípios SOLID e injeção de dependência no NestJS.
    * Design de API RESTful (Get, Post, Patch, Delete).

3.  **Banco de Dados:**
    * Modelagem Relacional: Um `Produto` pode ter vários `Lotes` (Relacionamento 1:N).
    * Normalização de dados para evitar duplicidade de cadastros.

---

## Funcionalidades Principais

### 1. Cadastro Inteligente (Busca Externa)
Ao cadastrar um produto, o usuário não precisa digitar tudo. O sistema consome uma API simulada que busca o produto pelo nome (ex: "Dorf") e preenche automaticamente o EAN e Categoria, reduzindo erros humanos.

### 2. Dashboard de Validade (Semáforo)
O sistema categoriza visualmente os produtos:
- 🔴 **VENCIDO:** Vermelho (Alerta Crítico)
- 🟠 **ATENÇÃO:** Vence em menos de 3 meses.
- 🔵 **MÉDIO PRAZO:** Vence entre 6 a 12 meses.
- 🟢 **SEGURO:** Validade superior a 1 ano.

### 3. Frente de Caixa (PDV)
Simulação de venda rápida. O sistema baixa automaticamente o estoque do lote **mais antigo** (lógica automática) ou permite que o operador escolha manualmente o lote específico via leitura de Datamatrix.

---

## Como Rodar Localmente

Se quiser rodar o projeto na sua máquina:

```bash
# 1. Clone o repositório
git clone [https://github.com/isabelayared/pharmastock-system.git](https://github.com/isabelayared/pharmastock-system.git)

# 2. Instale as dependências (Backend)
cd backend
npm install
npx prisma generate
npm run start:dev

# 3. Instale as dependências (Frontend)
cd ../frontend
npm install
npm run dev




