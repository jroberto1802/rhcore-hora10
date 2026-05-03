-- Add new allowed value to motivo in alteracoes_salariais
ALTER TABLE public.alteracoes_salariais
  DROP CONSTRAINT IF EXISTS alteracoes_salariais_motivo_check;

ALTER TABLE public.alteracoes_salariais
  ADD CONSTRAINT alteracoes_salariais_motivo_check
  CHECK (
    motivo = ANY (ARRAY['Promocao'::text, 'AlteracaoSalarial'::text, 'TransferenciaEmpresa'::text])
  );