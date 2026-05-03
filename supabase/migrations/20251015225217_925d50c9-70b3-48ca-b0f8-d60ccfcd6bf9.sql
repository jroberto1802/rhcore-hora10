-- Add data_nascimento column to colaboradores_terceirizados table
ALTER TABLE public.colaboradores_terceirizados 
ADD COLUMN data_nascimento date;