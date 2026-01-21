# Documento de Requisitos do Produto (PRD) - Agenda Shiatsu Ocyan

## 1. Introdução

### 1.1 Visão Geral
"Agenda Shiatsu Ocyan" é uma aplicação web projetada para gerenciar o agendamento de sessões de massagem Shiatsu para os integrantes da Ocyan. O sistema visa agilizar o processo de reserva, garantir acesso justo ao serviço (limitando sessões por semana) e fornecer uma interface administrativa para a equipe de saúde gerenciar agendas, visualizar agendamentos e gerar relatórios.

### 1.2 Objetivos
*   **Simplificar o Agendamento:** Fornecer uma interface fácil de usar para os integrantes reservarem suas sessões.
*   **Garantir Privacidade de Dados:** Implementar uma arquitetura "Privacy by Design" para proteger dados sensíveis do usuário (CPF, informações de saúde).
*   **Otimizar a Gestão:** Permitir que a equipe de saúde gerencie facilmente a disponibilidade, imprima listas de presença e acompanhe o uso.
*   **Aplicar Regras:** Aplicar automaticamente regras de negócio, como uma sessão por semana por integrante.

## 2. Público-Alvo

*   **Integrantes (Colaboradores):** Usuários que desejam agendar, visualizar ou cancelar suas sessões de Shiatsu.
*   **Equipe de Saúde (Admin):** Administradores responsáveis por gerenciar as agendas, validar acesso e gerar relatórios.

## 3. Funcionalidades Principais

### 3.1 Funcionalidades do Usuário (Integrantes)
*   **Página Inicial:** Página de destino com acesso a Agendamento, Cancelamento e Regras.
*   **Fluxo de Agendamento:**
    *   **Seleção de Data e Hora:** Visualizar dias e horários disponíveis.
    *   **Validação de CPF:** Validação segura da elegibilidade do integrante via CPF.
    *   **Confirmação:** Confirmação imediata do agendamento.
*   **Fluxo de Cancelamento:**
    *   **Busca:** Encontrar agendamentos existentes usando o CPF.
    *   **Cancelar:** Capacidade de cancelar agendamentos futuros.
*   **Regras e Diretrizes:** Informações sobre o uso do serviço e políticas.

### 3.2 Funcionalidades do Admin (Equipe de Saúde)
*   **Login Seguro:** Autenticação para acesso administrativo.
*   **Dashboard:** Visão geral do status do sistema e estatísticas rápidas.
*   **Visualização da Agenda:** Calendário visual de todos os agendamentos com detalhes.
*   **Gestão de Disponibilidade:**
    *   Configurar horários de funcionamento, duração da sessão e intervalos.
    *   Gerenciar datas disponíveis (abrir/fechar dias específicos).
*   **Gestão de Usuários (CPFs Habilitados):**
    *   Gerenciar a lista de integrantes elegíveis (CPFs).
    *   Armazenamento focado em privacidade (usando hashes/técnicas de criptografia).
*   **Lista de Presença:**
    *   Gerar um PDF imprimível para assinaturas diárias.
    *   Design corporativo com a marca da Ocyan.
*   **Exportação de Dados:** Exportar dados de agendamento para CSV/Excel para análise externa.
*   **Configurações:** Configuração geral do sistema.

## 4. Requisitos Funcionais

### 4.1 Sistema de Agendamento
*   **RF-01:** O sistema deve impedir agendamentos em datas/horários que estejam cheios ou desativados.
*   **RF-02:** O sistema deve impor um limite de um agendamento por semana por integrante.
*   **RF-03:** Os usuários devem validar sua identidade usando seu CPF. O sistema deve corresponder o CPF inserido com uma lista de permitidos.

### 4.2 Privacidade de Dados
*   **RF-04:** Dados de CPF não devem ser expostos diretamente ao lado do cliente (client-side). Hashing ou RPCs seguros devem ser usados para consultas.
*   **RF-05:** O acesso a funcionalidades administrativas deve ser restrito a usuários autenticados.

### 4.3 Administração
*   **RF-06:** Administradores devem poder definir a estrutura da agenda diária (Horário de início, fim, duração, pausa para almoço).
*   **RF-07:** Administradores devem poder visualizar detalhes de qualquer agendamento.
*   **RF-08:** A impressão da Lista de Presença deve caber estritamente em papel A4 e evitar cortar conteúdo entre páginas.

## 5. Requisitos Não-Funcionais

*   **RNF-01: Desempenho:** Os horários de agendamento devem carregar rapidamente (menos de 2 segundos).
*   **RNF-02: Segurança:** Todos os endpoints da API relacionados a ações sensíveis devem verificar autorização ou usar tokens seguros.
*   **RNF-03: UX/UI:** A interface deve ser responsiva (amigável para dispositivos móveis) e seguir a identidade visual da Ocyan (profissional, limpa, cores corporativas).
*   **RNF-04: Confiabilidade:** O sistema deve lidar com agendamentos simultâneos de forma graciosa para evitar duplo agendamento.

## 6. Arquitetura Técnica

*   **Frontend:**
    *   **Framework:** React (Vite)
    *   **Linguagem:** TypeScript
    *   **Estilização:** Tailwind CSS + Shadcn/UI
    *   **Gerenciamento de Estado:** React Hooks
*   **Backend:**
    *   **Plataforma:** Supabase (BaaS)
    *   **Banco de Dados:** PostgreSQL
    *   **Lógica:** Supabase Edge Functions (Deno/TypeScript) para execução segura de lógica de negócios.
    *   **Auth:** Supabase Auth para login de Admin.
*   **Estratégia de Segurança:**
    *   **Row Level Security (RLS):** Políticas estritas nas tabelas do Banco de Dados.
    *   **RPC/Edge Functions:** Encapsular consultas complexas para evitar expor acesso direto a tabelas ao cliente público.

## 7. Modelos de Dados (Alto Nível)

*   **`agendamentos`**: Armazena detalhes do agendamento (data, horário, identificador do usuário, status).
*   **`datas_disponiveis`**: Armazena datas abertas para agendamento.
*   **`configuracoes_disponibilidade`**: Armazena regras para geração de horários.
*   **`cpfs_habilitados`**: Armazena a lista de usuários permitidos (hashed/seguro).
*   **`profiles`**: Perfis de usuários administradores.

## 8. Fluxos de Usuário

### 8.1 Agendamento
1.  Usuário seleciona uma data no calendário.
2.  Sistema exibe horários disponíveis.
3.  Usuário seleciona um horário.
4.  Usuário insere CPF.
5.  Sistema valida CPF e elegibilidade.
6.  Usuário confirma.
7.  Sistema salva agendamento e exibe tela de sucesso.

### 8.2 Cancelamento
1.  Usuário insere CPF.
2.  Sistema recupera agendamentos ativos para esse CPF.
3.  Usuário seleciona agendamento para cancelar.
4.  Sistema processa cancelamento e atualiza disponibilidade.

---
**Versão:** 1.0
**Última Atualização:** 21 de Janeiro de 2026
**Status:** Desenvolvimento Ativo
