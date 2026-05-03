-- Adicionar foreign key apenas para avaliado (que é um funcionário)
ALTER TABLE public.avaliacoes_desempenho
ADD CONSTRAINT fk_avaliacoes_avaliado
FOREIGN KEY (avaliado_id) REFERENCES public.funcionarios(id)
ON DELETE RESTRICT;

-- Nota: avaliador_id não recebe FK pois referencia auth.users, não funcionarios