-- Corrigir funções para definir search_path explicitamente
CREATE OR REPLACE FUNCTION public.update_funcionario_demissao()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualiza a data_demissao na tabela funcionarios
  UPDATE public.funcionarios 
  SET data_demissao = NEW.data_demissao, updated_at = now()
  WHERE id = NEW.funcionario_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Corrigir função para reverter demissão
CREATE OR REPLACE FUNCTION public.revert_funcionario_demissao()
RETURNS TRIGGER AS $$
BEGIN
  -- Remove a data_demissao na tabela funcionarios
  UPDATE public.funcionarios 
  SET data_demissao = NULL, updated_at = now()
  WHERE id = OLD.funcionario_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;