# Preparação para Migração de Banco de Dados

## Resumo das Alterações
Para facilitar a conexão com o novo banco de dados Supabase, as seguintes alterações foram realizadas:

1.  **Centralização de URLs da API**: Foi criado o arquivo `src/lib/api-constants.ts`. Todas as chamadas para Edge Functions agora usam este arquivo central.
2.  **Parametrização de Ambiente**: O aplicação agora lê `VITE_SUPABASE_URL` e `VITE_SUPABASE_PROJECT_ID` exclusivamente das variáveis de ambiente (`.env`). Não há mais URLs "hardcoded" espalhadas pelos arquivos.
3.  **Script de Tipagem**: Adicionado o script `npm run db:types` no `package.json` para facilitar a atualização dos tipos TypeScript quando você conectar o novo banco.

## Instruções para Migração

Para conectar seu novo projeto Supabase, siga estes passos:

### 1. Atualizar Variáveis de Ambiente
Edite o arquivo `.env` na raiz do projeto e atualize as seguintes chaves com as credenciais do seu **NOVO** projeto Supabase:

```env
VITE_SUPABASE_PROJECT_ID="seu-novo-project-id"
VITE_SUPABASE_URL="https://seu-novo-project-id.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="sua-nova-anon-key"
```

### 2. Configurar Edge Functions
Seu novo projeto precisará ter as Edge Functions implantadas. Se você tiver o código fonte das functions (pasta `supabase/functions`), precisará fazer o deploy para o novo projeto usando a CLI do Supabase:

```bash
npx supabase features --project-id seu-novo-project-id
npx supabase functions deploy --project-id seu-novo-project-id
```

Não esqueça de configurar os **Secrets** no novo projeto Supabase (Painel -> Edge Functions -> Secrets):
*   `ADMIN_EMAIL`
*   `ADMIN_PASSWORD`
*   `JWT_SECRET`

### 3. Atualizar Tipos do Banco de Dados
Após criar as tabelas no novo banco, atualize as definições de tipos do TypeScript rodando:

```bash
npm run db:types
```
*Nota: Você precisará estar logado na CLI do Supabase (`npx supabase login`) para que isso funcione.*

### 4. Testar
Rode a aplicação localmente para garantir que tudo está conectando corretamente:
```bash
npm run dev
```

## Próximos Passos Sugeridos
*   Criar o schema do banco de dados no novo projeto (Tabelas: `agendamentos`, `configuracoes_disponibilidade`, `cpf_habilitado`, `datas_disponiveis`, etc).
*   Configurar as políticas de segurança (RLS) no Supabase.
