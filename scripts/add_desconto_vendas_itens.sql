-- Adiciona a coluna de desconto por item de venda.
-- Rode este script no SQL Editor do Supabase antes de usar o novo campo "Desconto" no formulario de vendas.
ALTER TABLE vendas_itens ADD COLUMN IF NOT EXISTS desconto INTEGER DEFAULT 0;
