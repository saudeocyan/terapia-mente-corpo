# Documentação Técnica: Sistema de Agendamento Terapia Mente e Corpo

## 1. Visão Geral
A plataforma **Terapia Mente e Corpo** é uma aplicação corporativa desenvolvida para gerenciar agendamentos de sessões de massoterapia para os integrantes da Ocyan. O sistema substitui ferramentas genéricas de terceiros (como o Calendly), trazendo o controle total dos dados para a infraestrutura aprovada da empresa, garantindo aderência à LGPD e proporcionando ganho de eficiência operacional para a equipe de saúde.

---

## 2. Stack Tecnológica
A aplicação segue os padrões modernos da indústria para garantir escalabilidade, manutenibilidade e segurança:

### Frontend
* **Core:** React 18, TypeScript, Vite.
* **Roteamento:** React Router DOM.
* **Estilização & UI:** Tailwind CSS + Shadcn UI (Componentes acessíveis e modulares).
* **Gerenciamento de Estado/Formulários:** React Hook Form + Zod (Validação estrita).
* **Hospedagem:** Vercel (Configurado para Serverless estático).

### Backend (Infraestrutura como Serviço - BaaS)
* **Provedor:** Supabase (Rodando sob infraestrutura AWS).
* **Banco de Dados:** PostgreSQL (Relacional, open-source, sem lock-in).
* **Lógica de Servidor:** Supabase Edge Functions (Escritas em TypeScript/Deno).

### Qualidade e QA
* **Testes Automatizados:** Playwright (Testes End-to-End cobrindo o fluxo crítico de agendamento e cancelamento).

---

## 3. Arquitetura de Segurança e Conformidade (LGPD)
O sistema foi construído sob o pilar de "Privacy by Design", mitigando riscos de vazamento de dados sensíveis dos integrantes.

* **Criptografia Irreversível de CPF (Server-Side Pepper):** Os CPFs dos integrantes não são salvos em texto puro no banco de dados. Utilizamos a função de hashing SHA-256 combinada com um *Pepper* (um segredo criptográfico armazenado exclusivamente nas variáveis de ambiente do servidor). Isso inviabiliza ataques de força bruta (Rainbow Tables) em caso de vazamento da base de dados.
* **Hardening de Banco de Dados (Row Level Security - RLS):**
  A política pública de acesso ao banco de dados foi revogada (`Default Deny`). Nenhuma tabela sensível pode ser lida pelo cliente (navegador).
* **Delegação via Service Role:**
  Todas as operações de leitura e gravação no banco de dados passam obrigatoriamente pelas Edge Functions, que atuam como intermediárias seguras e validam as regras de negócio antes de interagir com o PostgreSQL.
* **Proteção CORS Estrita:**
  A API restringe requisições cross-origin, aceitando chamadas apenas da URL oficial de produção configurada na variável `ALLOWED_ORIGIN`.

---

## 4. Estrutura do Repositório

O projeto adota uma arquitetura modular ("Feature-sliced design" simplificado):

```text
/
├── src/
│   ├── components/       # Componentes globais compartilhados (Layout, AdminLayout)
│   ├── components/ui/    # Biblioteca de componentes base (Shadcn)
│   ├── lib/              # Utilitários e configurações (utils.ts, supabase/client.ts)
│   ├── pages/            # Páginas da aplicação (Roteamento visual)
│   │   ├── Booking/      # Componentes quebrados do fluxo de agendamento
│   │   └── admin/        # Rotas protegidas de administração
│   └── main.tsx          # Ponto de entrada React
├── supabase/
│   ├── functions/        # Edge Functions (Lógica de servidor Backend)
│   └── migrations/       # Versionamento do esquema do banco de dados (SQL)
└── tests/
    └── e2e/              # Suíte de testes automatizados (Playwright)
