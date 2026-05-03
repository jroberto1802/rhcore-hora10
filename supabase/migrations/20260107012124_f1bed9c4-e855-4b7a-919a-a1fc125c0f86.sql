-- Criar tabela de logs de auditoria para todas as entidades do sistema
CREATE TABLE public.audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  tabela TEXT NOT NULL,
  registro_id UUID NOT NULL,
  campo TEXT NOT NULL,
  valor_anterior TEXT,
  valor_novo TEXT,
  usuario_id UUID,
  usuario_nome TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Criar índices para consultas eficientes
CREATE INDEX idx_audit_logs_tabela_registro ON public.audit_logs (tabela, registro_id);
CREATE INDEX idx_audit_logs_empresa ON public.audit_logs (empresa_id);
CREATE INDEX idx_audit_logs_created_at ON public.audit_logs (created_at DESC);

-- Habilitar RLS
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Policy para visualização: usuários podem ver logs das empresas que têm acesso
CREATE POLICY "Usuários podem ver logs das suas empresas"
ON public.audit_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid()
      AND ue.empresa_id = audit_logs.empresa_id
  )
);

-- Policy para inserção: usuários autenticados podem inserir logs
CREATE POLICY "Usuários autenticados podem inserir logs"
ON public.audit_logs
FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

-- Comentário na tabela
COMMENT ON TABLE public.audit_logs IS 'Tabela para armazenar logs de auditoria de alterações em registros do sistema';