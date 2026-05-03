-- Remover tabela niveis_importancia e atualizar schema para níveis fixos

-- Primeiro, remover a foreign key de mapeamento_competencias_cargos
ALTER TABLE mapeamento_competencias_cargos 
DROP CONSTRAINT IF EXISTS mapeamento_competencias_cargos_nivel_importancia_id_fkey;

-- Remover a foreign key de competencias_avaliadas
ALTER TABLE competencias_avaliadas 
DROP CONSTRAINT IF EXISTS competencias_avaliadas_nivel_importancia_id_fkey;

-- Criar tipo enum para níveis de importância
CREATE TYPE nivel_importancia_enum AS ENUM ('Baixa', 'Média', 'Alta', 'Muito Alta');

-- Adicionar nova coluna nivel_importancia em mapeamento_competencias_cargos
ALTER TABLE mapeamento_competencias_cargos 
ADD COLUMN nivel_importancia nivel_importancia_enum;

-- Migrar dados existentes (mapear IDs para os novos valores enum)
-- Assumindo uma lógica de mapeamento baseada no peso:
-- peso 2 = Baixa, peso 3 = Média, peso 4 = Alta, peso 5 = Muito Alta
UPDATE mapeamento_competencias_cargos
SET nivel_importancia = CASE
  WHEN peso = 2 THEN 'Baixa'::nivel_importancia_enum
  WHEN peso = 3 THEN 'Média'::nivel_importancia_enum
  WHEN peso = 4 THEN 'Alta'::nivel_importancia_enum
  WHEN peso = 5 THEN 'Muito Alta'::nivel_importancia_enum
  ELSE 'Média'::nivel_importancia_enum
END;

-- Tornar a nova coluna obrigatória
ALTER TABLE mapeamento_competencias_cargos 
ALTER COLUMN nivel_importancia SET NOT NULL;

-- Remover a coluna antiga nivel_importancia_id
ALTER TABLE mapeamento_competencias_cargos 
DROP COLUMN nivel_importancia_id;

-- Fazer o mesmo para competencias_avaliadas
ALTER TABLE competencias_avaliadas 
ADD COLUMN nivel_importancia nivel_importancia_enum;

-- Migrar dados existentes
UPDATE competencias_avaliadas
SET nivel_importancia = CASE
  WHEN peso = 2 THEN 'Baixa'::nivel_importancia_enum
  WHEN peso = 3 THEN 'Média'::nivel_importancia_enum
  WHEN peso = 4 THEN 'Alta'::nivel_importancia_enum
  WHEN peso = 5 THEN 'Muito Alta'::nivel_importancia_enum
  ELSE 'Média'::nivel_importancia_enum
END;

-- Tornar a nova coluna obrigatória
ALTER TABLE competencias_avaliadas 
ALTER COLUMN nivel_importancia SET NOT NULL;

-- Remover a coluna antiga nivel_importancia_id
ALTER TABLE competencias_avaliadas 
DROP COLUMN nivel_importancia_id;

-- Finalmente, remover a tabela niveis_importancia
DROP TABLE IF EXISTS niveis_importancia CASCADE;