-- Criar função de limpeza automática de logs antigos (mais de 12 meses)
CREATE OR REPLACE FUNCTION public.limpar_audit_logs_antigos()
RETURNS void AS $$
BEGIN
  DELETE FROM public.audit_logs 
  WHERE created_at < NOW() - INTERVAL '12 months';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar índice composto para otimizar consultas por tabela e registro
CREATE INDEX IF NOT EXISTS idx_audit_logs_tabela_registro 
ON public.audit_logs (tabela, registro_id, created_at DESC);

-- Criar índice para consultas por empresa e data
CREATE INDEX IF NOT EXISTS idx_audit_logs_empresa_data 
ON public.audit_logs (empresa_id, created_at DESC);