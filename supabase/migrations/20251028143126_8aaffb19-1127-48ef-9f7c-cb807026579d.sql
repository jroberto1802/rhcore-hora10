-- Add foreign key constraint between entrevistas and candidatos
ALTER TABLE public.entrevistas
  ADD CONSTRAINT entrevistas_candidato_id_fkey 
  FOREIGN KEY (candidato_id) 
  REFERENCES public.candidatos(id)
  ON DELETE CASCADE;

-- Add foreign key constraint between entrevistas and processos_seletivos
ALTER TABLE public.entrevistas
  ADD CONSTRAINT entrevistas_processo_seletivo_id_fkey 
  FOREIGN KEY (processo_seletivo_id) 
  REFERENCES public.processos_seletivos(id)
  ON DELETE CASCADE;

-- Change data_entrevista from DATE to TIMESTAMP WITH TIME ZONE to include time
ALTER TABLE public.entrevistas
  ALTER COLUMN data_entrevista TYPE TIMESTAMP WITH TIME ZONE
  USING data_entrevista::TIMESTAMP WITH TIME ZONE;