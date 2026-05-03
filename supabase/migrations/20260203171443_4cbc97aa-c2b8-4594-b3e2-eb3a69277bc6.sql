-- Adicionar coluna status para armazenar o status administrativo
ALTER TABLE asos ADD COLUMN status text;

-- Migrar dados existentes: se resultado = 'Renovado', mover para status
UPDATE asos 
SET status = 'Renovado', resultado = 'Apto'
WHERE resultado = 'Renovado';