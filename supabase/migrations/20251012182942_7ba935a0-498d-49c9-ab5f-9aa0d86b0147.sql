-- Add situacao column to documentos_terceirizados
ALTER TABLE documentos_terceirizados 
ADD COLUMN situacao text NOT NULL DEFAULT 'Não Enviado';

-- Add situacao column to documentos_colaboradores_terceirizados
ALTER TABLE documentos_colaboradores_terceirizados 
ADD COLUMN situacao text NOT NULL DEFAULT 'Não Enviado';

-- Add check constraints to ensure valid values
ALTER TABLE documentos_terceirizados
ADD CONSTRAINT documentos_terceirizados_situacao_check 
CHECK (situacao IN ('Não Enviado', 'Solicitado', 'Enviado'));

ALTER TABLE documentos_colaboradores_terceirizados
ADD CONSTRAINT documentos_colaboradores_terceirizados_situacao_check 
CHECK (situacao IN ('Não Enviado', 'Solicitado', 'Enviado'));