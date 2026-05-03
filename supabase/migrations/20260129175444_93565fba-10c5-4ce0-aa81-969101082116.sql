-- Passo 1: Remover a constraint antiga
ALTER TABLE exames_cargo_eventos DROP CONSTRAINT IF EXISTS exames_cargo_eventos_tipo_evento_check;

-- Passo 2: Atualizar os dados existentes de 'Admissão' para 'Admissional'
UPDATE exames_cargo_eventos 
SET tipo_evento = 'Admissional' 
WHERE tipo_evento = 'Admissão';

-- Passo 3: Criar a nova constraint com 'Admissional' em vez de 'Admissão'
ALTER TABLE exames_cargo_eventos ADD CONSTRAINT exames_cargo_eventos_tipo_evento_check 
CHECK (tipo_evento = ANY (ARRAY['Admissional'::text, 'Periódico'::text, 'Demissional'::text, 'Retorno ao Trabalho'::text, 'Mudança de Riscos Ocupacionais'::text, 'Exame Avulso'::text]));