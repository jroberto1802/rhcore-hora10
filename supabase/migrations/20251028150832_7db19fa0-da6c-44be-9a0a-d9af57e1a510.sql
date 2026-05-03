-- Add cargo_id field to processos_seletivos table
ALTER TABLE public.processos_seletivos 
ADD COLUMN cargo_id uuid REFERENCES public.cargos(id) ON DELETE SET NULL;

-- Add index for better performance
CREATE INDEX idx_processos_seletivos_cargo_id ON public.processos_seletivos(cargo_id);