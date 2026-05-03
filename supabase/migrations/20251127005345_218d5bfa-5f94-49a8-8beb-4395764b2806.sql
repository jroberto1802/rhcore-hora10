-- Etapa 2: Limpar documentos órfãos existentes (colaboradores que não existem mais)
DELETE FROM documentos_colaboradores_terceirizados
WHERE colaborador_id NOT IN (
  SELECT id FROM colaboradores_terceirizados
);

-- Etapa 3: Adicionar foreign key constraint com CASCADE DELETE para prevenir futuros órfãos
ALTER TABLE documentos_colaboradores_terceirizados
ADD CONSTRAINT fk_documentos_colaboradores_terceirizados_colaborador
FOREIGN KEY (colaborador_id) 
REFERENCES colaboradores_terceirizados(id) 
ON DELETE CASCADE;