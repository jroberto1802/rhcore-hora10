-- Adicionar coluna JSONB para armazenar múltiplas competências em um único plano
ALTER TABLE planos_acao_desempenho 
  ADD COLUMN competencias jsonb DEFAULT '[]'::jsonb;

-- Comentário explicando a estrutura do JSONB
COMMENT ON COLUMN planos_acao_desempenho.competencias IS 'Array de competências: [{competencia_id, competencia_nome, nota, descricao_acao}]';

-- Remover colunas antigas que não serão mais usadas
ALTER TABLE planos_acao_desempenho 
  DROP COLUMN IF EXISTS competencia,
  DROP COLUMN IF EXISTS competencia_id,
  DROP COLUMN IF EXISTS descricao;

-- Adicionar coluna para observações gerais do plano
ALTER TABLE planos_acao_desempenho 
  ADD COLUMN observacoes text;