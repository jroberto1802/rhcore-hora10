-- =====================================================
-- FASE 1: MIGRAÇÃO COMPLETA - MÓDULO GERENCIAMENTO DE CARGOS
-- =====================================================

-- 1. MODIFICAR TABELA CARGOS - Adicionar novos campos
ALTER TABLE public.cargos 
ADD COLUMN IF NOT EXISTS cbo text,
ADD COLUMN IF NOT EXISTS grau text,
ADD COLUMN IF NOT EXISTS descricao_cargo text,
ADD COLUMN IF NOT EXISTS atividades_responsabilidades text,
ADD COLUMN IF NOT EXISTS sistemas_acessos text,
ADD COLUMN IF NOT EXISTS competencias_exigidas text,
ADD COLUMN IF NOT EXISTS requisitos text,
ADD COLUMN IF NOT EXISTS posicao_hierarquica text;

-- 2. CRIAR TABELA exames_cargo
CREATE TABLE IF NOT EXISTS public.exames_cargo (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cargo_id uuid NOT NULL REFERENCES public.cargos(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome_exame text NOT NULL,
  periodicidade_meses integer NOT NULL DEFAULT 12,
  obrigatorio boolean NOT NULL DEFAULT true,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. CRIAR TABELA exames_cargo_eventos
CREATE TABLE IF NOT EXISTS public.exames_cargo_eventos (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  exame_cargo_id uuid NOT NULL REFERENCES public.exames_cargo(id) ON DELETE CASCADE,
  tipo_evento text NOT NULL CHECK (tipo_evento IN ('Admissão', 'Periódico', 'Demissional', 'Retorno ao Trabalho', 'Mudança de Riscos Ocupacionais', 'Exame Avulso')),
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. CRIAR TABELA treinamentos_cargo
CREATE TABLE IF NOT EXISTS public.treinamentos_cargo (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cargo_id uuid NOT NULL REFERENCES public.cargos(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome_treinamento text NOT NULL,
  norma text,
  periodicidade_meses integer NOT NULL DEFAULT 12,
  obrigatorio boolean NOT NULL DEFAULT true,
  observacao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. CRIAR TABELA trilha_carreira
CREATE TABLE IF NOT EXISTS public.trilha_carreira (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  nome text NOT NULL,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 6. CRIAR TABELA trilha_carreira_etapas
CREATE TABLE IF NOT EXISTS public.trilha_carreira_etapas (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  trilha_id uuid NOT NULL REFERENCES public.trilha_carreira(id) ON DELETE CASCADE,
  cargo_id uuid NOT NULL REFERENCES public.cargos(id) ON DELETE CASCADE,
  ordem integer NOT NULL DEFAULT 1,
  tipo_progressao text NOT NULL DEFAULT 'Vertical' CHECK (tipo_progressao IN ('Vertical', 'Horizontal')),
  tempo_minimo_meses integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 7. CRIAR TABELA criterios_evolucao
CREATE TABLE IF NOT EXISTS public.criterios_evolucao (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  etapa_id uuid NOT NULL REFERENCES public.trilha_carreira_etapas(id) ON DELETE CASCADE,
  tipo_criterio text NOT NULL CHECK (tipo_criterio IN ('tempo_minimo', 'treinamento', 'avaliacao_desempenho', 'competencia')),
  treinamento_id uuid REFERENCES public.treinamentos_cargo(id) ON DELETE SET NULL,
  competencia_id uuid REFERENCES public.competencias(id) ON DELETE SET NULL,
  nota_minima numeric,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 8. CRIAR TABELA seguranca_trabalho_cargo
CREATE TABLE IF NOT EXISTS public.seguranca_trabalho_cargo (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cargo_id uuid NOT NULL REFERENCES public.cargos(id) ON DELETE CASCADE,
  empresa_id uuid NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(cargo_id)
);

-- 9. CRIAR TABELA nrs_aplicaveis
CREATE TABLE IF NOT EXISTS public.nrs_aplicaveis (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seguranca_cargo_id uuid NOT NULL REFERENCES public.seguranca_trabalho_cargo(id) ON DELETE CASCADE,
  nr text NOT NULL,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 10. CRIAR TABELA epis_cargo
CREATE TABLE IF NOT EXISTS public.epis_cargo (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seguranca_cargo_id uuid NOT NULL REFERENCES public.seguranca_trabalho_cargo(id) ON DELETE CASCADE,
  nome_epi text NOT NULL,
  descricao text,
  obrigatorio boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 11. CRIAR TABELA documentos_exigidos_cargo
CREATE TABLE IF NOT EXISTS public.documentos_exigidos_cargo (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seguranca_cargo_id uuid NOT NULL REFERENCES public.seguranca_trabalho_cargo(id) ON DELETE CASCADE,
  nome_documento text NOT NULL,
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 12. CRIAR TABELA riscos_ocupacionais
CREATE TABLE IF NOT EXISTS public.riscos_ocupacionais (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seguranca_cargo_id uuid NOT NULL REFERENCES public.seguranca_trabalho_cargo(id) ON DELETE CASCADE,
  grupo text NOT NULL CHECK (grupo IN ('Físico', 'Químico', 'Biológico', 'Ergonômico', 'Acidente/Mecânico')),
  risco text NOT NULL,
  possiveis_lesoes text,
  medidas_controle text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- =====================================================
-- HABILITAR RLS EM TODAS AS NOVAS TABELAS
-- =====================================================

ALTER TABLE public.exames_cargo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exames_cargo_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.treinamentos_cargo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trilha_carreira ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.trilha_carreira_etapas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.criterios_evolucao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seguranca_trabalho_cargo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nrs_aplicaveis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.epis_cargo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documentos_exigidos_cargo ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.riscos_ocupacionais ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLÍTICAS RLS PARA exames_cargo
-- =====================================================

CREATE POLICY "Users can view exames_cargo from their companies"
ON public.exames_cargo FOR SELECT
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = exames_cargo.empresa_id
));

CREATE POLICY "Users can create exames_cargo in their companies"
ON public.exames_cargo FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM usuarios_empresas ue
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = exames_cargo.empresa_id
));

CREATE POLICY "Users can update exames_cargo from their companies"
ON public.exames_cargo FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = exames_cargo.empresa_id
));

CREATE POLICY "Users can delete exames_cargo from their companies"
ON public.exames_cargo FOR DELETE
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = exames_cargo.empresa_id
));

-- =====================================================
-- POLÍTICAS RLS PARA exames_cargo_eventos
-- =====================================================

CREATE POLICY "Users can view exames_cargo_eventos from their companies"
ON public.exames_cargo_eventos FOR SELECT
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = exames_cargo_eventos.empresa_id
));

CREATE POLICY "Users can create exames_cargo_eventos in their companies"
ON public.exames_cargo_eventos FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM usuarios_empresas ue
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = exames_cargo_eventos.empresa_id
));

CREATE POLICY "Users can update exames_cargo_eventos from their companies"
ON public.exames_cargo_eventos FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = exames_cargo_eventos.empresa_id
));

CREATE POLICY "Users can delete exames_cargo_eventos from their companies"
ON public.exames_cargo_eventos FOR DELETE
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = exames_cargo_eventos.empresa_id
));

-- =====================================================
-- POLÍTICAS RLS PARA treinamentos_cargo
-- =====================================================

CREATE POLICY "Users can view treinamentos_cargo from their companies"
ON public.treinamentos_cargo FOR SELECT
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = treinamentos_cargo.empresa_id
));

CREATE POLICY "Users can create treinamentos_cargo in their companies"
ON public.treinamentos_cargo FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM usuarios_empresas ue
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = treinamentos_cargo.empresa_id
));

CREATE POLICY "Users can update treinamentos_cargo from their companies"
ON public.treinamentos_cargo FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = treinamentos_cargo.empresa_id
));

CREATE POLICY "Users can delete treinamentos_cargo from their companies"
ON public.treinamentos_cargo FOR DELETE
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = treinamentos_cargo.empresa_id
));

-- =====================================================
-- POLÍTICAS RLS PARA trilha_carreira
-- =====================================================

CREATE POLICY "Users can view trilha_carreira from their companies"
ON public.trilha_carreira FOR SELECT
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = trilha_carreira.empresa_id
));

CREATE POLICY "Users can create trilha_carreira in their companies"
ON public.trilha_carreira FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM usuarios_empresas ue
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = trilha_carreira.empresa_id
));

CREATE POLICY "Users can update trilha_carreira from their companies"
ON public.trilha_carreira FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = trilha_carreira.empresa_id
));

CREATE POLICY "Users can delete trilha_carreira from their companies"
ON public.trilha_carreira FOR DELETE
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = trilha_carreira.empresa_id
));

-- =====================================================
-- POLÍTICAS RLS PARA trilha_carreira_etapas
-- =====================================================

CREATE POLICY "Users can view trilha_carreira_etapas from their companies"
ON public.trilha_carreira_etapas FOR SELECT
USING (EXISTS (
  SELECT 1 FROM trilha_carreira tc
  JOIN usuarios_empresas ue ON ue.empresa_id = tc.empresa_id
  WHERE ue.user_id = auth.uid() AND tc.id = trilha_carreira_etapas.trilha_id
));

CREATE POLICY "Users can create trilha_carreira_etapas in their companies"
ON public.trilha_carreira_etapas FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM trilha_carreira tc
  JOIN usuarios_empresas ue ON ue.empresa_id = tc.empresa_id
  WHERE ue.user_id = auth.uid() AND tc.id = trilha_carreira_etapas.trilha_id
));

CREATE POLICY "Users can update trilha_carreira_etapas from their companies"
ON public.trilha_carreira_etapas FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM trilha_carreira tc
  JOIN usuarios_empresas ue ON ue.empresa_id = tc.empresa_id
  WHERE ue.user_id = auth.uid() AND tc.id = trilha_carreira_etapas.trilha_id
));

CREATE POLICY "Users can delete trilha_carreira_etapas from their companies"
ON public.trilha_carreira_etapas FOR DELETE
USING (EXISTS (
  SELECT 1 FROM trilha_carreira tc
  JOIN usuarios_empresas ue ON ue.empresa_id = tc.empresa_id
  WHERE ue.user_id = auth.uid() AND tc.id = trilha_carreira_etapas.trilha_id
));

-- =====================================================
-- POLÍTICAS RLS PARA criterios_evolucao
-- =====================================================

CREATE POLICY "Users can view criterios_evolucao from their companies"
ON public.criterios_evolucao FOR SELECT
USING (EXISTS (
  SELECT 1 FROM trilha_carreira_etapas tce
  JOIN trilha_carreira tc ON tc.id = tce.trilha_id
  JOIN usuarios_empresas ue ON ue.empresa_id = tc.empresa_id
  WHERE ue.user_id = auth.uid() AND tce.id = criterios_evolucao.etapa_id
));

CREATE POLICY "Users can create criterios_evolucao in their companies"
ON public.criterios_evolucao FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM trilha_carreira_etapas tce
  JOIN trilha_carreira tc ON tc.id = tce.trilha_id
  JOIN usuarios_empresas ue ON ue.empresa_id = tc.empresa_id
  WHERE ue.user_id = auth.uid() AND tce.id = criterios_evolucao.etapa_id
));

CREATE POLICY "Users can update criterios_evolucao from their companies"
ON public.criterios_evolucao FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM trilha_carreira_etapas tce
  JOIN trilha_carreira tc ON tc.id = tce.trilha_id
  JOIN usuarios_empresas ue ON ue.empresa_id = tc.empresa_id
  WHERE ue.user_id = auth.uid() AND tce.id = criterios_evolucao.etapa_id
));

CREATE POLICY "Users can delete criterios_evolucao from their companies"
ON public.criterios_evolucao FOR DELETE
USING (EXISTS (
  SELECT 1 FROM trilha_carreira_etapas tce
  JOIN trilha_carreira tc ON tc.id = tce.trilha_id
  JOIN usuarios_empresas ue ON ue.empresa_id = tc.empresa_id
  WHERE ue.user_id = auth.uid() AND tce.id = criterios_evolucao.etapa_id
));

-- =====================================================
-- POLÍTICAS RLS PARA seguranca_trabalho_cargo
-- =====================================================

CREATE POLICY "Users can view seguranca_trabalho_cargo from their companies"
ON public.seguranca_trabalho_cargo FOR SELECT
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = seguranca_trabalho_cargo.empresa_id
));

CREATE POLICY "Users can create seguranca_trabalho_cargo in their companies"
ON public.seguranca_trabalho_cargo FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM usuarios_empresas ue
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = seguranca_trabalho_cargo.empresa_id
));

CREATE POLICY "Users can update seguranca_trabalho_cargo from their companies"
ON public.seguranca_trabalho_cargo FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = seguranca_trabalho_cargo.empresa_id
));

CREATE POLICY "Users can delete seguranca_trabalho_cargo from their companies"
ON public.seguranca_trabalho_cargo FOR DELETE
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue
  WHERE ue.user_id = auth.uid() AND ue.empresa_id = seguranca_trabalho_cargo.empresa_id
));

-- =====================================================
-- POLÍTICAS RLS PARA nrs_aplicaveis
-- =====================================================

CREATE POLICY "Users can view nrs_aplicaveis from their companies"
ON public.nrs_aplicaveis FOR SELECT
USING (EXISTS (
  SELECT 1 FROM seguranca_trabalho_cargo stc
  JOIN usuarios_empresas ue ON ue.empresa_id = stc.empresa_id
  WHERE ue.user_id = auth.uid() AND stc.id = nrs_aplicaveis.seguranca_cargo_id
));

CREATE POLICY "Users can create nrs_aplicaveis in their companies"
ON public.nrs_aplicaveis FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM seguranca_trabalho_cargo stc
  JOIN usuarios_empresas ue ON ue.empresa_id = stc.empresa_id
  WHERE ue.user_id = auth.uid() AND stc.id = nrs_aplicaveis.seguranca_cargo_id
));

CREATE POLICY "Users can update nrs_aplicaveis from their companies"
ON public.nrs_aplicaveis FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM seguranca_trabalho_cargo stc
  JOIN usuarios_empresas ue ON ue.empresa_id = stc.empresa_id
  WHERE ue.user_id = auth.uid() AND stc.id = nrs_aplicaveis.seguranca_cargo_id
));

CREATE POLICY "Users can delete nrs_aplicaveis from their companies"
ON public.nrs_aplicaveis FOR DELETE
USING (EXISTS (
  SELECT 1 FROM seguranca_trabalho_cargo stc
  JOIN usuarios_empresas ue ON ue.empresa_id = stc.empresa_id
  WHERE ue.user_id = auth.uid() AND stc.id = nrs_aplicaveis.seguranca_cargo_id
));

-- =====================================================
-- POLÍTICAS RLS PARA epis_cargo
-- =====================================================

CREATE POLICY "Users can view epis_cargo from their companies"
ON public.epis_cargo FOR SELECT
USING (EXISTS (
  SELECT 1 FROM seguranca_trabalho_cargo stc
  JOIN usuarios_empresas ue ON ue.empresa_id = stc.empresa_id
  WHERE ue.user_id = auth.uid() AND stc.id = epis_cargo.seguranca_cargo_id
));

CREATE POLICY "Users can create epis_cargo in their companies"
ON public.epis_cargo FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM seguranca_trabalho_cargo stc
  JOIN usuarios_empresas ue ON ue.empresa_id = stc.empresa_id
  WHERE ue.user_id = auth.uid() AND stc.id = epis_cargo.seguranca_cargo_id
));

CREATE POLICY "Users can update epis_cargo from their companies"
ON public.epis_cargo FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM seguranca_trabalho_cargo stc
  JOIN usuarios_empresas ue ON ue.empresa_id = stc.empresa_id
  WHERE ue.user_id = auth.uid() AND stc.id = epis_cargo.seguranca_cargo_id
));

CREATE POLICY "Users can delete epis_cargo from their companies"
ON public.epis_cargo FOR DELETE
USING (EXISTS (
  SELECT 1 FROM seguranca_trabalho_cargo stc
  JOIN usuarios_empresas ue ON ue.empresa_id = stc.empresa_id
  WHERE ue.user_id = auth.uid() AND stc.id = epis_cargo.seguranca_cargo_id
));

-- =====================================================
-- POLÍTICAS RLS PARA documentos_exigidos_cargo
-- =====================================================

CREATE POLICY "Users can view documentos_exigidos_cargo from their companies"
ON public.documentos_exigidos_cargo FOR SELECT
USING (EXISTS (
  SELECT 1 FROM seguranca_trabalho_cargo stc
  JOIN usuarios_empresas ue ON ue.empresa_id = stc.empresa_id
  WHERE ue.user_id = auth.uid() AND stc.id = documentos_exigidos_cargo.seguranca_cargo_id
));

CREATE POLICY "Users can create documentos_exigidos_cargo in their companies"
ON public.documentos_exigidos_cargo FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM seguranca_trabalho_cargo stc
  JOIN usuarios_empresas ue ON ue.empresa_id = stc.empresa_id
  WHERE ue.user_id = auth.uid() AND stc.id = documentos_exigidos_cargo.seguranca_cargo_id
));

CREATE POLICY "Users can update documentos_exigidos_cargo from their companies"
ON public.documentos_exigidos_cargo FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM seguranca_trabalho_cargo stc
  JOIN usuarios_empresas ue ON ue.empresa_id = stc.empresa_id
  WHERE ue.user_id = auth.uid() AND stc.id = documentos_exigidos_cargo.seguranca_cargo_id
));

CREATE POLICY "Users can delete documentos_exigidos_cargo from their companies"
ON public.documentos_exigidos_cargo FOR DELETE
USING (EXISTS (
  SELECT 1 FROM seguranca_trabalho_cargo stc
  JOIN usuarios_empresas ue ON ue.empresa_id = stc.empresa_id
  WHERE ue.user_id = auth.uid() AND stc.id = documentos_exigidos_cargo.seguranca_cargo_id
));

-- =====================================================
-- POLÍTICAS RLS PARA riscos_ocupacionais
-- =====================================================

CREATE POLICY "Users can view riscos_ocupacionais from their companies"
ON public.riscos_ocupacionais FOR SELECT
USING (EXISTS (
  SELECT 1 FROM seguranca_trabalho_cargo stc
  JOIN usuarios_empresas ue ON ue.empresa_id = stc.empresa_id
  WHERE ue.user_id = auth.uid() AND stc.id = riscos_ocupacionais.seguranca_cargo_id
));

CREATE POLICY "Users can create riscos_ocupacionais in their companies"
ON public.riscos_ocupacionais FOR INSERT
WITH CHECK (EXISTS (
  SELECT 1 FROM seguranca_trabalho_cargo stc
  JOIN usuarios_empresas ue ON ue.empresa_id = stc.empresa_id
  WHERE ue.user_id = auth.uid() AND stc.id = riscos_ocupacionais.seguranca_cargo_id
));

CREATE POLICY "Users can update riscos_ocupacionais from their companies"
ON public.riscos_ocupacionais FOR UPDATE
USING (EXISTS (
  SELECT 1 FROM seguranca_trabalho_cargo stc
  JOIN usuarios_empresas ue ON ue.empresa_id = stc.empresa_id
  WHERE ue.user_id = auth.uid() AND stc.id = riscos_ocupacionais.seguranca_cargo_id
));

CREATE POLICY "Users can delete riscos_ocupacionais from their companies"
ON public.riscos_ocupacionais FOR DELETE
USING (EXISTS (
  SELECT 1 FROM seguranca_trabalho_cargo stc
  JOIN usuarios_empresas ue ON ue.empresa_id = stc.empresa_id
  WHERE ue.user_id = auth.uid() AND stc.id = riscos_ocupacionais.seguranca_cargo_id
));

-- =====================================================
-- TRIGGERS PARA UPDATED_AT
-- =====================================================

CREATE TRIGGER update_exames_cargo_updated_at
BEFORE UPDATE ON public.exames_cargo
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_treinamentos_cargo_updated_at
BEFORE UPDATE ON public.treinamentos_cargo
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_trilha_carreira_updated_at
BEFORE UPDATE ON public.trilha_carreira
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_seguranca_trabalho_cargo_updated_at
BEFORE UPDATE ON public.seguranca_trabalho_cargo
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();