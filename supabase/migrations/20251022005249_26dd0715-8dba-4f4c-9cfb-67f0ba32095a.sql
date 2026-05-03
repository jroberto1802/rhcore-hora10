-- 1) Ensure fast lookup and referential integrity for periodos_gozo_ferias
CREATE INDEX IF NOT EXISTS idx_periodos_gozo_ferias_ferias_id ON public.periodos_gozo_ferias(ferias_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'periodos_gozo_ferias_ferias_id_fkey'
  ) THEN
    ALTER TABLE public.periodos_gozo_ferias
    ADD CONSTRAINT periodos_gozo_ferias_ferias_id_fkey
    FOREIGN KEY (ferias_id) REFERENCES public.ferias(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 2) Validation and auto-association trigger for periodos_gozo_ferias
CREATE OR REPLACE FUNCTION public.periodos_gozo_validate_and_attach()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  f_rec public.ferias%ROWTYPE;
  limite date;
  candidate uuid;
BEGIN
  -- Datas válidas
  IF NEW.data_inicio > NEW.data_fim THEN
    RAISE EXCEPTION 'Data de início (%) deve ser anterior ou igual à data de fim (%)', NEW.data_inicio, NEW.data_fim;
  END IF;

  -- Férias existente
  SELECT * INTO f_rec FROM public.ferias WHERE id = NEW.ferias_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Férias (id=%) não encontrada', NEW.ferias_id;
  END IF;

  -- Data limite calculada caso não exista
  limite := COALESCE(f_rec.data_limite, (f_rec.periodo_aquisitivo_fim + INTERVAL '336 days'))::date;

  -- Se a data de início do gozo não pertence ao range da férias vinculada,
  -- tentar vincular automaticamente à férias correta do mesmo colaborador/empresa
  IF NEW.data_inicio::date < f_rec.periodo_aquisitivo_inicio::date OR NEW.data_inicio::date > limite THEN
    SELECT f.id
      INTO candidate
      FROM public.ferias f
     WHERE f.funcionario_id = f_rec.funcionario_id
       AND f.empresa_id = f_rec.empresa_id
       AND NEW.data_inicio::date >= f.periodo_aquisitivo_inicio::date
       AND NEW.data_inicio::date <= COALESCE(f.data_limite, (f.periodo_aquisitivo_fim + INTERVAL '336 days'))::date
     ORDER BY f.periodo_aquisitivo_inicio DESC
     LIMIT 1;

    IF candidate IS NULL THEN
      RAISE EXCEPTION 'Período de gozo em % fora do intervalo de qualquer férias do colaborador.', NEW.data_inicio;
    ELSE
      NEW.ferias_id := candidate;
      SELECT * INTO f_rec FROM public.ferias WHERE id = candidate;
      limite := COALESCE(f_rec.data_limite, (f_rec.periodo_aquisitivo_fim + INTERVAL '336 days'))::date;
    END IF;
  END IF;

  -- Data fim não pode ultrapassar a data limite
  IF NEW.data_fim::date > limite THEN
    RAISE EXCEPTION 'Data fim do gozo (%) ultrapassa a data limite de férias (%)', NEW.data_fim, limite;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_periodos_gozo_validate ON public.periodos_gozo_ferias;
CREATE TRIGGER trg_periodos_gozo_validate
BEFORE INSERT OR UPDATE ON public.periodos_gozo_ferias
FOR EACH ROW
EXECUTE FUNCTION public.periodos_gozo_validate_and_attach();