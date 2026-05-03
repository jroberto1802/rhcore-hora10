ALTER TABLE folha_pagamento 
ADD COLUMN cargo text;

-- Atualizar registros existentes com o cargo atual do funcionário
UPDATE folha_pagamento fp
SET cargo = COALESCE(f.cargo_atual, '-')
FROM funcionarios f
WHERE fp.funcionario_id = f.id;