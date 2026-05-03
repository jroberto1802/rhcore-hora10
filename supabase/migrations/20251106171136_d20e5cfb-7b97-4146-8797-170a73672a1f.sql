-- Adicionar campos para detalhamento da vaga em processos_seletivos
ALTER TABLE processos_seletivos
ADD COLUMN IF NOT EXISTS descricao_vaga TEXT,
ADD COLUMN IF NOT EXISTS responsabilidades TEXT,
ADD COLUMN IF NOT EXISTS faixa_salarial_minima DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS faixa_salarial_maxima DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS beneficios TEXT,
ADD COLUMN IF NOT EXISTS competencias_necessarias TEXT[];

-- Criar tabela para roteiros de entrevista
CREATE TABLE IF NOT EXISTS roteiros_entrevista (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  processo_seletivo_id UUID NOT NULL REFERENCES processos_seletivos(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL,
  nome_roteiro TEXT NOT NULL,
  tipo TEXT NOT NULL,
  perguntas JSONB DEFAULT '[]'::jsonb,
  criador_id UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS na tabela roteiros_entrevista
ALTER TABLE roteiros_entrevista ENABLE ROW LEVEL SECURITY;

-- Políticas RLS para roteiros_entrevista
CREATE POLICY "Users can view roteiros from their companies"
ON roteiros_entrevista FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid()
    AND ue.empresa_id = roteiros_entrevista.empresa_id
  )
);

CREATE POLICY "Users can create roteiros in their companies"
ON roteiros_entrevista FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid()
    AND ue.empresa_id = roteiros_entrevista.empresa_id
  )
);

CREATE POLICY "Users can update roteiros from their companies"
ON roteiros_entrevista FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid()
    AND ue.empresa_id = roteiros_entrevista.empresa_id
  )
);

CREATE POLICY "Users can delete roteiros from their companies"
ON roteiros_entrevista FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid()
    AND ue.empresa_id = roteiros_entrevista.empresa_id
  )
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_roteiros_entrevista_processo_seletivo_id ON roteiros_entrevista(processo_seletivo_id);
CREATE INDEX IF NOT EXISTS idx_roteiros_entrevista_empresa_id ON roteiros_entrevista(empresa_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_roteiros_entrevista_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_roteiros_entrevista_updated_at
BEFORE UPDATE ON roteiros_entrevista
FOR EACH ROW
EXECUTE FUNCTION update_roteiros_entrevista_updated_at();