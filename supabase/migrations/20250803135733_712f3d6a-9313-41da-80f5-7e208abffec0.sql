-- Create storage bucket for employee documents
INSERT INTO storage.buckets (id, name, public) VALUES ('documentos', 'documentos', true);

-- Create policies for document uploads
CREATE POLICY "Users can view documents from their companies" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'documentos' AND 
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid() AND 
          (storage.foldername(name))[2] = ue.empresa_id::text
  )
);

CREATE POLICY "Users can upload documents to their companies" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'documentos' AND 
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid() AND 
          (storage.foldername(name))[2] = ue.empresa_id::text
  )
);

CREATE POLICY "Users can delete documents from their companies" 
ON storage.objects 
FOR DELETE 
USING (
  bucket_id = 'documentos' AND 
  EXISTS (
    SELECT 1 FROM usuarios_empresas ue
    WHERE ue.user_id = auth.uid() AND 
          (storage.foldername(name))[2] = ue.empresa_id::text
  )
);