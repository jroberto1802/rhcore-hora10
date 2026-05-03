-- Adicionar coluna renovado à tabela exames
ALTER TABLE exames ADD COLUMN renovado boolean NOT NULL DEFAULT false;