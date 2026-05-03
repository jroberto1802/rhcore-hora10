-- Add ferias_concluidas flag to ferias table
ALTER TABLE public.ferias ADD COLUMN ferias_concluidas boolean NOT NULL DEFAULT false;