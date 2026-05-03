-- Remove o trigger de auto-vinculação
DROP TRIGGER IF EXISTS trg_periodos_gozo_validate ON public.periodos_gozo_ferias;

-- Recria a função APENAS com validações, SEM auto-vinculação
CREATE OR REPLACE FUNCTION public.periodos_gozo_validate_and_attach()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  f_rec public.ferias%ROWTYPE;
  limite date;
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

  -- Data limite calculada
  limite := COALESCE(f_rec.data_limite, (f_rec.periodo_aquisitivo_fim + INTERVAL '336 days'))::date;

  -- Validação: data de início deve estar dentro do período aquisitivo
  IF NEW.data_inicio::date < f_rec.periodo_aquisitivo_inicio::date THEN
    RAISE EXCEPTION 'Data de início (%) é anterior ao início do período aquisitivo (%)', 
      NEW.data_inicio, f_rec.periodo_aquisitivo_inicio;
  END IF;

  -- Validação: data de início não pode ser muito após o limite (tolerância de 90 dias)
  IF NEW.data_inicio::date > (limite + INTERVAL '90 days')::date THEN
    RAISE EXCEPTION 'Data de início (%) está muito além da data limite permitida (%)', 
      NEW.data_inicio, limite;
  END IF;

  -- Validação: data fim não pode ultrapassar muito o limite (tolerância de 90 dias)
  IF NEW.data_fim::date > (limite + INTERVAL '90 days')::date THEN
    RAISE EXCEPTION 'Data fim (%) ultrapassa muito a data limite permitida (%)', 
      NEW.data_fim, limite;
  END IF;

  RETURN NEW;
END;
$$;

-- Recria o trigger
CREATE TRIGGER trg_periodos_gozo_validate
BEFORE INSERT OR UPDATE ON public.periodos_gozo_ferias
FOR EACH ROW
EXECUTE FUNCTION public.periodos_gozo_validate_and_attach();