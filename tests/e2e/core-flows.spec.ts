import { test, expect } from '@playwright/test';

test.describe('Core Flows', () => {
    // Dynamic date setup
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const dayNumber = today.getDate().toString();
    const formattedDate = today.toLocaleDateString('pt-BR'); // dd/mm/yyyy roughly, or use regex

    // Setup mocks before each test
    test.beforeEach(async ({ page }) => {
        // Mock: Horários Disponíveis
        await page.route('**/functions/v1/horarios-disponiveis*', async (route) => {
            const json = {
                horarios: [
                    { horario: '08:00', vagas_disponiveis: 1, vagas_total: 4 },
                    { horario: '09:00', vagas_disponiveis: 2, vagas_total: 4 }
                ],
                data: todayStr,
                configuracao: { duracao_sessao: 15, vagas_por_horario: 4 }
            };
            await route.fulfill({ json });
        });

        // Mock: Validar CPF - Updated to return a name
        await page.route('**/functions/v1/validar-cpf', async (route) => {
            await route.fulfill({
                json: { habilitado: true, nome: 'João da Silva' }
            });
        });

        // Mock: Criar Agendamento
        await page.route('**/functions/v1/criar-agendamento', async (route) => {
            await route.fulfill({ json: { sucesso: true } });
        });

        // Mock: Consultar Agendamentos (RPC)
        await page.route('**/rest/v1/rpc/consultar_agendamentos_cpf*', async (route) => {
            await route.fulfill({
                json: [
                    {
                        id: '00000000-0000-0000-0000-000000000123',
                        data: todayStr,
                        horario: '10:00:00',
                        status: 'confirmado',
                        nome: 'João da Silva',
                        filial: 'Centro',
                        predio: 'Principal',
                        created_at: new Date().toISOString()
                    }
                ]
            });
        });

        // Mock: Consultar Agendamentos (Function)
        await page.route('**/functions/v1/consultar-agendamentos*', async (route) => {
            await route.fulfill({
                json: [
                    {
                        id: '00000000-0000-0000-0000-000000000123',
                        data: todayStr,
                        horario: '10:00',
                        status: 'confirmado',
                    }
                ]
            });
        });

        // Mock: Cancelar Agendamento
        // Fix: Cancel uses RPC, so it hits rest/v1/rpc, not functions/v1
        await page.route('**/rest/v1/rpc/cancelar_agendamento_usuario', async (route) => {
            await route.fulfill({ json: { success: true } });
        });

        // Mock: Datas Disponíveis (Supabase REST)
        await page.route('**/rest/v1/datas_disponiveis*', async (route) => {
            await route.fulfill({
                json: [{ data: todayStr, ativo: true }]
            });
        });
    });

    test('Cenário A: O "Caminho Feliz" de Agendamento', async ({ page }) => {
        await page.goto('/');

        // Click CTA
        const agendarButton = page.getByRole('button', { name: /agendar/i })
            .or(page.getByRole('link', { name: /agendar/i })).first();
        await agendarButton.click();

        await expect(page).toHaveURL(/.*\/agendar/);

        // Select Date (Today)
        // Note: BookingCalendar renders days as buttons with the day number as text.
        // We ensure we select the exact day number to avoid confusion (e.g. '1' vs '10')
        // We reload to ensuring the mock data is picked up if initial fetch happened too early
        // await page.reload(); // Might not be needed if navigation triggers fetch

        // Using getByRole with exact name to match the day number
        const dayButton = page.getByRole('button', { name: dayNumber, exact: true }).first();

        // Ensure it's enabled before clicking
        await expect(dayButton).toBeEnabled();
        await dayButton.click();

        // Select Time
        await expect(page.getByText(/08:00/)).toBeVisible();
        await page.getByRole('button', { name: '08:00' }).first().click();

        // Fill Form
        const cpfInput = page.getByLabel(/cpf/i)
            .or(page.getByPlaceholder(/cpf|000/i))
            .or(page.getByRole('textbox').first());
        await expect(cpfInput).toBeVisible();
        await cpfInput.fill('123.456.789-00');

        // Verify Name Appears (Read-Only) instead of filling it
        // The mock returns "João da Silva"
        await expect(page.getByText(/João da Silva/i)).toBeVisible();

        // Confirm
        await page.getByRole('button', { name: /confirmar/i }).click();

        // Validate Success
        await expect(page.getByText(/sucesso/i).or(page.getByText(/agendamento foi realizado/i)).first()).toBeVisible();
    });

    test('Cenário B: Consulta e Cancelamento', async ({ page }) => {
        await page.goto('/cancelar');

        const cpfInput = page.getByLabel(/cpf/i)
            .or(page.getByPlaceholder(/cpf|000/i))
            .or(page.getByRole('textbox').first());
        await cpfInput.fill('123.456.789-00');

        const buscarButton = page.getByRole('button', { name: /buscar|consultar/i });

        if (await buscarButton.isVisible()) {
            await buscarButton.click();
        }

        // Validate List
        // Check for Time (10:00) which should be visible in the card
        await expect(page.getByText(/10:00/)).toBeVisible();
        await expect(page.getByRole('button', { name: /cancelar/i }).first()).toBeVisible();

        // Cancel
        await page.getByRole('button', { name: /cancelar/i }).first().click();

        // Confirm Dialog
        const dialog = page.getByRole('alertdialog');
        await expect(dialog).toBeVisible();
        await dialog.getByRole('button', { name: /confirmar|sim|continuar/i }).click();

        // Validate Success
        await expect(page.getByText(/cancelado/i).first()).toBeVisible();
    });
});
