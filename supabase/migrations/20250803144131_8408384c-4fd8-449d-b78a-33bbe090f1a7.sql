-- Criar função para atualizar data_demissao do funcionário quando demissão for registrada
CREATE OR REPLACE FUNCTION public.update_funcionario_demissao()
RETURNS TRIGGER AS $$
BEGIN
  -- Atualiza a data_demissao na tabela funcionarios
  UPDATE public.funcionarios 
  SET data_demissao = NEW.data_demissao, updated_at = now()
  WHERE id = NEW.funcionario_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger que executa a função após inserção na tabela demissoes
CREATE TRIGGER trigger_update_funcionario_demissao
  AFTER INSERT ON public.demissoes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_funcionario_demissao();

-- Criar função para reverter data_demissao quando demissão for excluída
CREATE OR REPLACE FUNCTION public.revert_funcionario_demissao()
RETURNS TRIGGER AS $$
BEGIN
  -- Remove a data_demissao na tabela funcionarios
  UPDATE public.funcionarios 
  SET data_demissao = NULL, updated_at = now()
  WHERE id = OLD.funcionario_id;
  
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Criar trigger que executa a função após exclusão na tabela demissoes
CREATE TRIGGER trigger_revert_funcionario_demissao
  AFTER DELETE ON public.demissoes
  FOR EACH ROW
  EXECUTE FUNCTION public.revert_funcionario_demissao();