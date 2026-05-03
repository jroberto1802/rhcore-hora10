-- Atualizar trigger para remover restrições de data limite
-- A data limite é apenas um controle gerencial, não deve bloquear cadastros

CREATE OR REPLACE FUNCTION public.periodos_gozo_validate_and_attach()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  f_rec public.ferias%ROWTYPE;
BEGIN
  -- Validação básica: data de início deve ser anterior ou igual à data de fim
  IF NEW.data_inicio > NEW.data_fim THEN
    RAISE EXCEPTION 'Data de início (%) deve ser anterior ou igual à data de fim (%)', NEW.data_inicio, NEW.data_fim;
  END IF;

  -- Verificar se o registro de férias existe
  SELECT * INTO f_rec FROM public.ferias WHERE id = NEW.ferias_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Férias (id=%) não encontrada', NEW.ferias_id;
  END IF;

  -- Validação suave: aviso se data de início é muito anterior ao período aquisitivo
  -- mas não bloqueia o cadastro
  IF NEW.data_inicio::date < (f_rec.periodo_aquisitivo_inicio - INTERVAL '30 days')::date THEN
    RAISE WARNING 'Data de início (%) está muito antes do início do período aquisitivo (%)', 
      NEW.data_inicio, f_rec.periodo_aquisitivo_inicio;
  END IF;

  -- Removidas as validações relacionadas à data limite
  -- A data limite é apenas um controle gerencial e não deve bloquear cadastros

  RETURN NEW;
END;
$function$;