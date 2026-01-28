# Testes End-to-End (E2E) com Playwright

Este projeto utiliza o Playwright para testes automatizados dos fluxos críticos (Agendamento e Cancelamento).

## 1. Instalação

Como o Playwright ainda não foi inicializado no projeto, execute os comandos abaixo para configurar o ambiente:

```bash
# Instalar dependências do Playwright
npm init playwright@latest

# Durante a instalação, selecione as seguintes opções (recomendado):
# - Do you want to use TypeScript or JavaScript? -> TypeScript
# - Where to put your end-to-end tests? -> tests/e2e (Nós já criamos esta pasta, mas o init pode perguntar)
# - Add a GitHub Actions workflow? -> Yes (ou No, se preferir configurar depois)
# - Install Playwright browsers (can be done manually via 'npx playwright install')? -> Yes
```

> **Nota:** Se o comando acima sobescrever o `playwright.config.ts` que criamos, você pode reverter as alterações nesse arquivo específico ou usar o nosso como base. O ideal é dizer "Não" para sobrescrever se ele perguntar, ou fazer backup.
> **Alternativa Segura:** Apenas instale o pacote e os browsers sem rodar o init completo se quiser preservar a config:
> `npm install -D @playwright/test && npx playwright install`

## 2. Estrutura dos Testes

- `playwright.config.ts`: Configuração global (Base URL, Browsers, Mocking, CI).
- `tests/e2e/core-flows.spec.ts`: Testes dos cenários críticos:
  - **Cenário A:** Agendamento "Caminho Feliz" (Seleção de Data, Hora, CPF, Confirmação).
  - **Cenário B:** Consulta e Cancelamento de Agendamento.

## 3. Executando os Testes

Para rodar os testes (modo headless/CI):

```bash
npx playwright test
```

Para rodar com interface visual (para debugging):

```bash
npx playwright test --ui
```

Para ver o relatório HTML após a execução:

```bash
npx playwright show-report
```

## 4. Notas Técnicas

- **Mocking de Rede:** Os testes utilizam `page.route` para interceptar chamadas ao Supabase (`/functions/v1/*` e `/rest/v1/*`). Isso garante que os testes não sujem o banco de dados real e funcionem mesmo sem backend ativo (desde que o frontend esteja rodando).
- **Fuso Horário:** Certifique-se de que o ambiente de teste rode com timezone correto se hover dependência de data/hora no frontend, embora os mocks mitiguem isso.
