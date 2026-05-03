-- Update check constraints to use 'Recebido' instead of 'Enviado'
ALTER TABLE documentos_terceirizados 
  DROP CONSTRAINT IF EXISTS documentos_terceirizados_situacao_check,
  ADD CONSTRAINT documentos_terceirizados_situacao_check 
    CHECK (situacao IN ('Não Enviado', 'Solicitado', 'Recebido'));

ALTER TABLE documentos_colaboradores_terceirizados 
  DROP CONSTRAINT IF EXISTS documentos_colaboradores_terceirizados_situacao_check,
  ADD CONSTRAINT documentos_colaboradores_terceirizados_situacao_check 
    CHECK (situacao IN ('Não Enviado', 'Solicitado', 'Recebido'));