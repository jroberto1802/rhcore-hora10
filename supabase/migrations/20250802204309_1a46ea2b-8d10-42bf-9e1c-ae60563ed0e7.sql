-- Create funcionarios table
CREATE TABLE public.funcionarios (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  empresa_id UUID NOT NULL,
  
  -- Dados pessoais
  codigo TEXT NOT NULL,
  nome_completo TEXT NOT NULL,
  nome_abreviado TEXT,
  genero TEXT CHECK (genero IN ('Masculino', 'Feminino', 'Outros')),
  data_nascimento DATE,
  telefone TEXT,
  email TEXT,
  
  -- Endereço
  endereco TEXT,
  numero_endereco TEXT,
  bairro TEXT,
  cidade TEXT,
  uf TEXT,
  
  -- Outros dados
  telefone_emergencia TEXT,
  tipo_sanguineo TEXT,
  pcd BOOLEAN DEFAULT false,
  
  -- Contratuais
  cargo_atual TEXT,
  tipo_cargo TEXT,
  tipo_contrato TEXT,
  salario_atual DECIMAL(10,2),
  data_admissao DATE,
  data_demissao DATE,
  setor_atual TEXT,
  
  -- Documentação
  rg TEXT,
  cpf TEXT,
  ctps TEXT,
  serie TEXT,
  pis TEXT,
  
  -- Financeiro
  banco TEXT,
  agencia TEXT,
  numero_conta TEXT,
  tipo_conta TEXT,
  chave_pix TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.funcionarios ENABLE ROW LEVEL SECURITY;

-- Create policies for funcionarios
CREATE POLICY "Users can view funcionarios from their companies" 
ON public.funcionarios 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() 
  AND ue.empresa_id = funcionarios.empresa_id
));

CREATE POLICY "Users can create funcionarios in their companies" 
ON public.funcionarios 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() 
  AND ue.empresa_id = funcionarios.empresa_id
));

CREATE POLICY "Users can update funcionarios from their companies" 
ON public.funcionarios 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() 
  AND ue.empresa_id = funcionarios.empresa_id
));

CREATE POLICY "Users can delete funcionarios from their companies" 
ON public.funcionarios 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM usuarios_empresas ue 
  WHERE ue.user_id = auth.uid() 
  AND ue.empresa_id = funcionarios.empresa_id
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_funcionarios_updated_at
BEFORE UPDATE ON public.funcionarios
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX idx_funcionarios_empresa_id ON public.funcionarios(empresa_id);
CREATE INDEX idx_funcionarios_codigo ON public.funcionarios(codigo);
CREATE INDEX idx_funcionarios_cpf ON public.funcionarios(cpf);