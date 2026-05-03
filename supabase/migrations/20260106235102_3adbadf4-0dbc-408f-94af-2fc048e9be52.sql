
-- Adicionar permissão func.dados_sensiveis ao perfil existente
INSERT INTO permissoes_perfil (perfil_id, codigo_permissao)
SELECT DISTINCT up.perfil_id, 'func.dados_sensiveis'
FROM usuarios_perfis up
WHERE NOT EXISTS (
  SELECT 1 FROM permissoes_perfil pp 
  WHERE pp.perfil_id = up.perfil_id 
  AND pp.codigo_permissao = 'func.dados_sensiveis'
);
