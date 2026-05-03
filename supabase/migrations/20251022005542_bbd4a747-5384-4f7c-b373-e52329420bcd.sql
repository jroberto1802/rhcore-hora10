-- Remove trigger temporariamente
DROP TRIGGER IF EXISTS trg_periodos_gozo_validate ON public.periodos_gozo_ferias;

-- Recria a função com validação mais flexível para dados históricos
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
  dias_apos_limite integer;
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

  -- Validação da data fim:
  -- Permite até 90 dias após data limite para dados históricos/flexibilidade
  dias_apos_limite := NEW.data_fim::date - limite;
  IF dias_apos_limite > 90 THEN
    RAISE EXCEPTION 'Data fim do gozo (%) ultrapassa muito a data limite de férias (%). Diferença: % dias', 
      NEW.data_fim, limite, dias_apos_limite;
  END IF;

  -- Warning para dados fora do padrão mas dentro da tolerância (não bloqueia)
  IF NEW.data_fim::date > limite THEN
    RAISE WARNING 'Período de gozo termina após data limite (% vs %). Diferença: % dias', 
      NEW.data_fim, limite, dias_apos_limite;
  END IF;

  RETURN NEW;
END;
$$;

-- Recria o trigger
CREATE TRIGGER trg_periodos_gozo_validate
BEFORE INSERT OR UPDATE ON public.periodos_gozo_ferias
FOR EACH ROW
EXECUTE FUNCTION public.periodos_gozo_validate_and_attach();