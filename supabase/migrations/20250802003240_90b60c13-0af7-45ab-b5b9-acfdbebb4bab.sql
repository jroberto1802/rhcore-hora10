-- Create profiles table for additional user information
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create grupos_empresariais table
CREATE TABLE public.grupos_empresariais (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  nome TEXT NOT NULL,
  descricao TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create empresas table
CREATE TABLE public.empresas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  grupo_empresarial_id UUID NOT NULL REFERENCES public.grupos_empresariais(id) ON DELETE CASCADE,
  nome TEXT NOT NULL,
  logo_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create usuarios_empresas junction table (many-to-many relationship)
CREATE TABLE public.usuarios_empresas (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, empresa_id)
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grupos_empresariais ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.empresas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usuarios_empresas ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own profile" 
ON public.profiles 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own profile" 
ON public.profiles 
FOR UPDATE 
USING (auth.uid() = user_id);

-- Create RLS policies for grupos_empresariais
CREATE POLICY "Users can view grupos_empresariais of their companies" 
ON public.grupos_empresariais 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios_empresas ue
    JOIN public.empresas e ON e.id = ue.empresa_id
    WHERE ue.user_id = auth.uid() AND e.grupo_empresarial_id = grupos_empresariais.id
  )
);

-- Create RLS policies for empresas
CREATE POLICY "Users can view their own empresas" 
ON public.empresas 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.usuarios_empresas ue
    WHERE ue.user_id = auth.uid() AND ue.empresa_id = empresas.id
  )
);

-- Create RLS policies for usuarios_empresas
CREATE POLICY "Users can view their own empresa relationships" 
ON public.usuarios_empresas 
FOR SELECT 
USING (auth.uid() = user_id);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_grupos_empresariais_updated_at
  BEFORE UPDATE ON public.grupos_empresariais
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_empresas_updated_at
  BEFORE UPDATE ON public.empresas
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, nome)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data ->> 'nome', 'Usuário'));
  RETURN NEW;
END;
$$;

-- Create trigger for automatic profile creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Insert sample data for testing
INSERT INTO public.grupos_empresariais (nome, descricao) VALUES 
('Grupo TechCorp', 'Grupo de empresas de tecnologia'),
('Grupo CommerceMax', 'Grupo de empresas de comércio eletrônico');

INSERT INTO public.empresas (grupo_empresarial_id, nome, logo_url) VALUES 
((SELECT id FROM public.grupos_empresariais WHERE nome = 'Grupo TechCorp'), 'TechCorp Solutions', null),
((SELECT id FROM public.grupos_empresariais WHERE nome = 'Grupo TechCorp'), 'TechCorp Consulting', null),
((SELECT id FROM public.grupos_empresariais WHERE nome = 'Grupo CommerceMax'), 'CommerceMax Brasil', null),
((SELECT id FROM public.grupos_empresariais WHERE nome = 'Grupo CommerceMax'), 'CommerceMax Internacional', null);