-- Adicionar foreign key entre mapeamento_competencias_cargos e competencias
ALTER TABLE public.mapeamento_competencias_cargos
ADD CONSTRAINT fk_mapeamento_competencia
FOREIGN KEY (competencia_id) REFERENCES public.competencias(id)
ON DELETE CASCADE;

-- Adicionar foreign key entre mapeamento_competencias_cargos e cargos (se não existir)
ALTER TABLE public.mapeamento_competencias_cargos
ADD CONSTRAINT fk_mapeamento_cargo
FOREIGN KEY (cargo_id) REFERENCES public.cargos(id)
ON DELETE CASCADE;