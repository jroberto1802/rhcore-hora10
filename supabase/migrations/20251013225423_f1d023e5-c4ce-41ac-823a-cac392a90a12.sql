-- Add a flag to mark documents as valid regardless of vigency
ALTER TABLE public.documentos_terceirizados
  ADD COLUMN IF NOT EXISTS status_valido boolean NOT NULL DEFAULT false;

ALTER TABLE public.documentos_colaboradores_terceirizados
  ADD COLUMN IF NOT EXISTS status_valido boolean NOT NULL DEFAULT false;

-- Optional comments for clarity
COMMENT ON COLUMN public.documentos_terceirizados.status_valido IS 'Se true, documento é considerado Válido independentemente da vigência';
COMMENT ON COLUMN public.documentos_colaboradores_terceirizados.status_valido IS 'Se true, documento é considerado Válido independentemente da vigência';