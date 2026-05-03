-- Migrar treinamentos antigos (apenas funcionários válidos)
INSERT INTO treinamentos_funcionario (
  funcionario_id, 
  empresa_id, 
  nome_treinamento, 
  data_realizacao, 
  data_validade, 
  carga_horaria, 
  instrutor, 
  observacoes,
  created_at,
  updated_at
)
SELECT 
  t.funcionario_id, 
  t.empresa_id, 
  t.titulo_treinamento,
  t.data_inicio, 
  t.data_termino, 
  t.duracao,
  t.fornecedor, 
  t.observacoes,
  t.created_at,
  t.updated_at
FROM treinamentos t
INNER JOIN funcionarios f ON f.id = t.funcionario_id
WHERE NOT EXISTS (
  SELECT 1 FROM treinamentos_funcionario tf 
  WHERE tf.funcionario_id = t.funcionario_id 
    AND tf.nome_treinamento = t.titulo_treinamento
    AND tf.data_realizacao = t.data_inicio
);

-- Migrar exames antigos para ASOs (apenas funcionários válidos)
INSERT INTO asos (
  funcionario_id,
  empresa_id,
  tipo_aso,
  data_emissao,
  data_validade,
  resultado,
  observacoes,
  created_at,
  updated_at
)
SELECT DISTINCT ON (e.funcionario_id, e.data_realizacao)
  e.funcionario_id,
  e.empresa_id,
  'Exame Avulso',
  e.data_realizacao,
  e.data_validade,
  e.resultado,
  e.observacoes,
  e.created_at,
  e.updated_at
FROM exames e
INNER JOIN funcionarios f ON f.id = e.funcionario_id
WHERE NOT EXISTS (
  SELECT 1 FROM asos a 
  WHERE a.funcionario_id = e.funcionario_id 
    AND a.data_emissao = e.data_realizacao
);

-- Criar exames_aso vinculados aos ASOs recém-criados
INSERT INTO exames_aso (
  aso_id,
  empresa_id,
  nome_exame,
  data_realizacao,
  data_validade,
  resultado,
  observacoes,
  created_at,
  updated_at
)
SELECT 
  a.id,
  e.empresa_id,
  e.nome_exame,
  e.data_realizacao,
  e.data_validade,
  e.resultado,
  e.observacoes,
  e.created_at,
  e.updated_at
FROM exames e
INNER JOIN funcionarios f ON f.id = e.funcionario_id
JOIN asos a ON a.funcionario_id = e.funcionario_id AND a.data_emissao = e.data_realizacao
WHERE NOT EXISTS (
  SELECT 1 FROM exames_aso ea 
  WHERE ea.aso_id = a.id 
    AND ea.nome_exame = e.nome_exame
);