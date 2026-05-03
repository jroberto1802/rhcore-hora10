
-- Adicionar campos de valor manual e seleção na tabela vale_transporte
ALTER TABLE public.vale_transporte
  ADD COLUMN IF NOT EXISTS valor_manual boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS valor_recarregar_manual numeric,
  ADD COLUMN IF NOT EXISTS selecionado boolean NOT NULL DEFAULT true;

-- Tabela para observações gerais por período (mês/ano/empresa)
CREATE TABLE IF NOT EXISTS public.vale_transporte_observacoes_gerais (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL,
  ano integer NOT NULL,
  mes integer NOT NULL,
  observacoes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (empresa_id, ano, mes)
);

ALTER TABLE public.vale_transporte_observacoes_gerais ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem visualizar observações da sua empresa"
  ON public.vale_transporte_observacoes_gerais FOR SELECT
  USING (EXISTS (SELECT 1 FROM usuarios_empresas ue WHERE ue.user_id = auth.uid() AND ue.empresa_id = vale_transporte_observacoes_gerais.empresa_id));

CREATE POLICY "Usuários podem inserir observações na sua empresa"
  ON public.vale_transporte_observacoes_gerais FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM usuarios_empresas ue WHERE ue.user_id = auth.uid() AND ue.empresa_id = vale_transporte_observacoes_gerais.empresa_id));

CREATE POLICY "Usuários podem atualizar observações da sua empresa"
  ON public.vale_transporte_observacoes_gerais FOR UPDATE
  USING (EXISTS (SELECT 1 FROM usuarios_empresas ue WHERE ue.user_id = auth.uid() AND ue.empresa_id = vale_transporte_observacoes_gerais.empresa_id));

CREATE POLICY "Usuários podem deletar observações da sua empresa"
  ON public.vale_transporte_observacoes_gerais FOR DELETE
  USING (EXISTS (SELECT 1 FROM usuarios_empresas ue WHERE ue.user_id = auth.uid() AND ue.empresa_id = vale_transporte_observacoes_gerais.empresa_id));

CREATE TRIGGER update_vt_obs_gerais_updated_at
  BEFORE UPDATE ON public.vale_transporte_observacoes_gerais
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
