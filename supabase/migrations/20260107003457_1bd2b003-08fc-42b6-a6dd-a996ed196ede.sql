-- Remover a constraint única incorreta (user_id, perfil_id)
ALTER TABLE public.usuarios_perfis 
DROP CONSTRAINT IF EXISTS usuarios_perfis_user_id_perfil_id_key;

-- Adicionar a constraint correta (user_id, empresa_id)
-- Um usuário pode ter apenas um perfil por empresa
ALTER TABLE public.usuarios_perfis 
ADD CONSTRAINT usuarios_perfis_user_id_empresa_id_key UNIQUE (user_id, empresa_id);