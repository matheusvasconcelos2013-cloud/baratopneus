-- As notificações estavam gravando created_at em UTC (padrão NOW() do
-- Postgres), mas eram exibidas como se já fossem horário de Brasília,
-- ficando 3h à frente do horário real do evento.
-- Já aplicado em produção em 2026-07-24. Script só para histórico —
-- não rode de novo (o UPDATE não é idempotente).

-- 1. Corrige o valor padrão da coluna para gravar direto em horário de
--    Brasília, então funciona mesmo se algum insert não informar created_at.
ALTER TABLE notificacoes ALTER COLUMN created_at SET DEFAULT (NOW() AT TIME ZONE 'America/Sao_Paulo');

-- 2. Corrige os registros já existentes, que foram gravados em UTC.
UPDATE notificacoes SET created_at = created_at - INTERVAL '3 hours';
