-- Adicionar campo status à tabela treinamentos_funcionario para suportar renovação
ALTER TABLE public.treinamentos_funcionario 
ADD COLUMN status text DEFAULT NULL;

-- Comentário explicativo
COMMENT ON COLUMN public.treinamentos_funcionario.status IS 'Status do treinamento: NULL (calculado por validade), Renovado (quando há novo registro)';