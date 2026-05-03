-- Adicionar coluna salario_base para preservar histórico de salário
ALTER TABLE vale_transporte 
ADD COLUMN salario_base numeric DEFAULT 0;

-- Atualizar registros existentes com o salário atual do funcionário
UPDATE vale_transporte vt
SET salario_base = COALESCE(f.salario_atual, 0)
FROM funcionarios f
WHERE vt.funcionario_id = f.id;