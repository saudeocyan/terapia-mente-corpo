-- Inserir configuração padrão se não existir
INSERT INTO public.configuracoes_disponibilidade (id, dias_da_semana, hora_inicio, hora_fim, duracao_sessao, intervalo, vagas_por_horario) 
VALUES (gen_random_uuid(), ARRAY['segunda', 'terca', 'quarta', 'quinta', 'sexta'], '08:00', '17:00', 20, 5, 2)
ON CONFLICT DO NOTHING;