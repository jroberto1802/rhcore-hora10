-- Tabela de configuração de cidades e valores de VT
CREATE TABLE public.vale_transporte_cidades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  cidade TEXT NOT NULL,
  valor_diario NUMERIC(10,2) NOT NULL DEFAULT 0,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de controle mensal de vale transporte
CREATE TABLE public.vale_transporte (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  funcionario_id UUID NOT NULL REFERENCES public.funcionarios(id) ON DELETE CASCADE,
  ano INTEGER NOT NULL,
  mes INTEGER NOT NULL,
  numero_cartao TEXT,
  cidade TEXT,
  dias_uteis INTEGER NOT NULL DEFAULT 22,
  valor_dia NUMERIC(10,2) NOT NULL DEFAULT 0,
  saldo_atual_cartao NUMERIC(10,2) NOT NULL DEFAULT 0,
  observacoes TEXT,
  is_recarga_adicional BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(empresa_id, funcionario_id, ano, mes, is_recarga_adicional)
);

-- Coluna no funcionário para marcar quem recebe VT
ALTER TABLE public.funcionarios ADD COLUMN recebe_vale_transporte BOOLEAN DEFAULT false;

-- RLS para vale_transporte_cidades
ALTER TABLE public.vale_transporte_cidades ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios veem cidades VT da sua empresa" ON public.vale_transporte_cidades
  FOR SELECT USING (empresa_id IN (
    SELECT empresa_id FROM public.usuarios_empresas WHERE user_id = auth.uid()
  ));

CREATE POLICY "Usuarios inserem cidades VT da sua empresa" ON public.vale_transporte_cidades
  FOR INSERT WITH CHECK (empresa_id IN (
    SELECT empresa_id FROM public.usuarios_empresas WHERE user_id = auth.uid()
  ));

CREATE POLICY "Usuarios atualizam cidades VT da sua empresa" ON public.vale_transporte_cidades
  FOR UPDATE USING (empresa_id IN (
    SELECT empresa_id FROM public.usuarios_empresas WHERE user_id = auth.uid()
  ));

CREATE POLICY "Usuarios deletam cidades VT da sua empresa" ON public.vale_transporte_cidades
  FOR DELETE USING (empresa_id IN (
    SELECT empresa_id FROM public.usuarios_empresas WHERE user_id = auth.uid()
  ));

-- RLS para vale_transporte
ALTER TABLE public.vale_transporte ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuarios veem VT da sua empresa" ON public.vale_transporte
  FOR SELECT USING (empresa_id IN (
    SELECT empresa_id FROM public.usuarios_empresas WHERE user_id = auth.uid()
  ));

CREATE POLICY "Usuarios inserem VT da sua empresa" ON public.vale_transporte
  FOR INSERT WITH CHECK (empresa_id IN (
    SELECT empresa_id FROM public.usuarios_empresas WHERE user_id = auth.uid()
  ));

CREATE POLICY "Usuarios atualizam VT da sua empresa" ON public.vale_transporte
  FOR UPDATE USING (empresa_id IN (
    SELECT empresa_id FROM public.usuarios_empresas WHERE user_id = auth.uid()
  ));

CREATE POLICY "Usuarios deletam VT da sua empresa" ON public.vale_transporte
  FOR DELETE USING (empresa_id IN (
    SELECT empresa_id FROM public.usuarios_empresas WHERE user_id = auth.uid()
  ));

-- Trigger para updated_at
CREATE TRIGGER update_vale_transporte_cidades_updated_at
  BEFORE UPDATE ON public.vale_transporte_cidades
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_vale_transporte_updated_at
  BEFORE UPDATE ON public.vale_transporte
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();