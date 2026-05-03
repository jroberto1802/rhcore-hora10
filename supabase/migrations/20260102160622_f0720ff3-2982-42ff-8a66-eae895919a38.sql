-- Add avaliacao_id and competencia_id columns to planos_acao_desempenho
ALTER TABLE public.planos_acao_desempenho 
ADD COLUMN avaliacao_id uuid REFERENCES public.avaliacoes_desempenho(id) ON DELETE SET NULL,
ADD COLUMN competencia_id uuid REFERENCES public.competencias(id) ON DELETE SET NULL;

-- Create indexes for better query performance
CREATE INDEX idx_planos_acao_avaliacao ON public.planos_acao_desempenho(avaliacao_id);
CREATE INDEX idx_planos_acao_competencia ON public.planos_acao_desempenho(competencia_id);