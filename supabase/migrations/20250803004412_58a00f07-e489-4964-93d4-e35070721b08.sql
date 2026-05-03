-- Criar bucket para logos
INSERT INTO storage.buckets (id, name, public) 
VALUES ('logos', 'logos', true);

-- Adicionar coluna logo_url na tabela grupos_empresariais
ALTER TABLE grupos_empresariais 
ADD COLUMN logo_url TEXT;

-- Criar políticas para o bucket de logos
CREATE POLICY "Logos are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'logos');

CREATE POLICY "Users can upload logos for their companies" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'logos' AND 
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue 
    WHERE ue.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update logos for their companies" 
ON storage.objects 
FOR UPDATE 
USING (
  bucket_id = 'logos' AND 
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue 
    WHERE ue.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete logos for their companies" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'logos' AND 
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue 
    WHERE ue.user_id = auth.uid()
  )
);