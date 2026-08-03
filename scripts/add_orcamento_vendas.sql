-- Marca a venda como orçamento (simulação enviada ao cliente).
-- Orçamento não baixa estoque, não gera lançamento financeiro e não entra
-- em faturamento/lucro no dashboard, relatórios e listagem de vendas.
-- Rode este script no SQL Editor do Supabase.
ALTER TABLE vendas ADD COLUMN IF NOT EXISTS orcamento BOOLEAN DEFAULT FALSE;
