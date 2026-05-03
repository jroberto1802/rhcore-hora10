
ALTER TABLE public.fornecedores
  ADD COLUMN IF NOT EXISTS banco text,
  ADD COLUMN IF NOT EXISTS agencia text,
  ADD COLUMN IF NOT EXISTS conta text,
  ADD COLUMN IF NOT EXISTS chave_pix text;

ALTER TABLE public.pagamentos_fornecedores
  ADD COLUMN IF NOT EXISTS recibo_url text,
  ADD COLUMN IF NOT EXISTS recibo_nome text;
