-- Inserir algumas datas de exemplo para os próximos dias
INSERT INTO public.datas_disponiveis (data, ativo) VALUES 
(CURRENT_DATE + INTERVAL '1 day', true),
(CURRENT_DATE + INTERVAL '2 days', true),
(CURRENT_DATE + INTERVAL '3 days', true),
(CURRENT_DATE + INTERVAL '5 days', true),
(CURRENT_DATE + INTERVAL '8 days', true),
(CURRENT_DATE + INTERVAL '9 days', true),
(CURRENT_DATE + INTERVAL '10 days', true)
ON CONFLICT (data) DO NOTHING;