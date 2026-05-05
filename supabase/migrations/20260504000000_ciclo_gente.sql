-- Ciclo de Gente

create table if not exists ciclo_gente (
  id uuid default gen_random_uuid() primary key,
  empresa_id uuid references empresas(id) on delete cascade not null,
  nome text not null,
  tipo text not null check (tipo in ('administrativo_operacional', 'lideranca')),
  ano integer not null,
  descricao text,
  status text default 'rascunho' check (status in ('rascunho', 'ativo', 'encerrado')),
  created_by uuid references auth.users(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists ciclo_gente_questoes (
  id uuid default gen_random_uuid() primary key,
  empresa_id uuid references empresas(id) on delete cascade not null,
  tipo_ciclo text not null check (tipo_ciclo in ('administrativo_operacional', 'lideranca')),
  tipo_avaliacao text default 'ambos' check (tipo_avaliacao in ('gestor', 'auto', 'ambos')),
  grupo_numero integer not null,
  grupo_nome text not null,
  item_numero text not null,
  descricao text not null,
  tipo_resposta text default 'escala' check (tipo_resposta in ('escala', 'texto')),
  ativo boolean default true,
  ordem integer default 0,
  created_at timestamptz default now()
);

create table if not exists ciclo_gente_participantes (
  id uuid default gen_random_uuid() primary key,
  ciclo_id uuid references ciclo_gente(id) on delete cascade not null,
  funcionario_id uuid references funcionarios(id) on delete cascade not null,
  gestor_id uuid references funcionarios(id) on delete set null,
  etapa_atual text default 'avaliacao_desempenho' check (etapa_atual in (
    'avaliacao_desempenho', 'reuniao_gente', 'feedback', 'pdi', 'follow', 'concluido'
  )),
  classificacao text check (classificacao in ('desligar', 'recuperar', 'bom', 'muito_bom', 'preparar')),
  observacoes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(ciclo_id, funcionario_id)
);

create table if not exists ciclo_avaliacao_desempenho (
  id uuid default gen_random_uuid() primary key,
  participante_id uuid references ciclo_gente_participantes(id) on delete cascade not null,
  tipo text default 'gestor' check (tipo in ('gestor', 'auto')),
  respostas jsonb default '[]'::jsonb not null,
  comentarios text,
  concluido boolean default false,
  concluido_em timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(participante_id, tipo)
);

create table if not exists ciclo_reuniao_gente (
  id uuid default gen_random_uuid() primary key,
  participante_id uuid references ciclo_gente_participantes(id) on delete cascade not null unique,
  classificacao_anterior text,
  classificacao_sugerida text check (classificacao_sugerida in ('desligar', 'recuperar', 'bom', 'muito_bom', 'preparar')),
  classificacao_final text check (classificacao_final in ('desligar', 'recuperar', 'bom', 'muito_bom', 'preparar')),
  participantes_nomes jsonb default '[]'::jsonb,
  comentarios text,
  concluido boolean default false,
  concluido_em timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Feedback preenchido pelo gestor/liderança
create table if not exists ciclo_feedback_gestor (
  id uuid default gen_random_uuid() primary key,
  participante_id uuid references ciclo_gente_participantes(id) on delete cascade not null unique,
  respostas jsonb default '[]'::jsonb not null,
  observacoes text,
  concluido boolean default false,
  concluido_em timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Feedback preenchido pelo colaborador via token único
create table if not exists ciclo_feedback_colaborador (
  id uuid default gen_random_uuid() primary key,
  participante_id uuid references ciclo_gente_participantes(id) on delete cascade not null unique,
  token text unique not null,
  respostas jsonb default '[]'::jsonb not null,
  observacoes text,
  preenchido boolean default false,
  preenchido_em timestamptz,
  token_expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- PDI (Bom/Muito Bom/Preparar) ou Plano de Reversão (Recuperar)
create table if not exists ciclo_pdi (
  id uuid default gen_random_uuid() primary key,
  participante_id uuid references ciclo_gente_participantes(id) on delete cascade not null unique,
  tipo text not null check (tipo in ('pdi', 'reversao')),
  acoes jsonb default '[]'::jsonb not null,
  -- Campos adicionais para Plano de Reversão
  causas_baixo_desempenho jsonb default '[]'::jsonb,
  habilidade_trabalho_grupo text check (habilidade_trabalho_grupo in ('sim', 'parcialmente', 'nao')),
  uso_uniformes text check (uso_uniformes in ('sim', 'parcialmente', 'nao')),
  cultura_seguranca text check (cultura_seguranca in ('sim', 'parcialmente', 'nao')),
  ponto_adicional text,
  cinco_porques jsonb default '[]'::jsonb,
  concluido boolean default false,
  concluido_em timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Acompanhamento (Follow) das ações do PDI/Plano de Reversão
create table if not exists ciclo_follow (
  id uuid default gen_random_uuid() primary key,
  participante_id uuid references ciclo_gente_participantes(id) on delete cascade not null,
  numero integer not null check (numero in (1, 2)),
  status_acoes jsonb default '[]'::jsonb not null,
  comentarios text,
  concluido boolean default false,
  concluido_em timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique(participante_id, numero)
);

-- RLS
alter table ciclo_gente enable row level security;
alter table ciclo_gente_questoes enable row level security;
alter table ciclo_gente_participantes enable row level security;
alter table ciclo_avaliacao_desempenho enable row level security;
alter table ciclo_reuniao_gente enable row level security;
alter table ciclo_feedback_gestor enable row level security;
alter table ciclo_feedback_colaborador enable row level security;
alter table ciclo_pdi enable row level security;
alter table ciclo_follow enable row level security;

create policy "auth_all_ciclo_gente" on ciclo_gente for all using (auth.uid() is not null);
create policy "auth_all_ciclo_questoes" on ciclo_gente_questoes for all using (auth.uid() is not null);
create policy "auth_all_ciclo_participantes" on ciclo_gente_participantes for all using (auth.uid() is not null);
create policy "auth_all_ciclo_avaliacao" on ciclo_avaliacao_desempenho for all using (auth.uid() is not null);
create policy "auth_all_ciclo_reuniao" on ciclo_reuniao_gente for all using (auth.uid() is not null);
create policy "auth_all_ciclo_feedback_gestor" on ciclo_feedback_gestor for all using (auth.uid() is not null);
create policy "auth_all_ciclo_feedback_colab" on ciclo_feedback_colaborador for all using (auth.uid() is not null);
create policy "auth_all_ciclo_pdi" on ciclo_pdi for all using (auth.uid() is not null);
create policy "auth_all_ciclo_follow" on ciclo_follow for all using (auth.uid() is not null);

-- Políticas públicas para o formulário de feedback do colaborador via token
create policy "public_select_ciclo_feedback_colab" on ciclo_feedback_colaborador for select using (true);
create policy "public_update_ciclo_feedback_colab" on ciclo_feedback_colaborador for update using (true);
create policy "public_select_ciclo_participantes" on ciclo_gente_participantes for select using (true);
create policy "public_select_ciclo_gente" on ciclo_gente for select using (true);

-- Função para inserir questões padrão
create or replace function inserir_questoes_padrao_ciclo(p_empresa_id uuid, p_tipo_ciclo text)
returns void language plpgsql as $$
begin
  insert into ciclo_gente_questoes
    (empresa_id, tipo_ciclo, tipo_avaliacao, grupo_numero, grupo_nome, item_numero, descricao, tipo_resposta, ordem)
  values
    (p_empresa_id, p_tipo_ciclo, 'ambos', 1, 'Postura Profissional, Organização e Produtividade', '1.1',
     'Cumpre a rotina de trabalho com organização, foco e responsabilidade, respeitando prioridades e padrões definidos.', 'escala', 1),
    (p_empresa_id, p_tipo_ciclo, 'ambos', 1, 'Postura Profissional, Organização e Produtividade', '1.2',
     'Demonstra domínio, atenção e seriedade na execução das atividades sob sua responsabilidade.', 'escala', 2),
    (p_empresa_id, p_tipo_ciclo, 'ambos', 1, 'Postura Profissional, Organização e Produtividade', '1.3',
     'Executa suas atividades com produtividade, cumprindo as demandas dentro dos prazos e do volume esperado, sem comprometer a qualidade, a segurança e os procedimentos da função.', 'escala', 3),
    (p_empresa_id, p_tipo_ciclo, 'ambos', 1, 'Postura Profissional, Organização e Produtividade', '1.4',
     'Participa ativamente das rotinas da unidade (matinais/reuniões, alinhamentos e treinamentos), demonstrando compromisso com o trabalho.', 'escala', 4),
    (p_empresa_id, p_tipo_ciclo, 'ambos', 2, 'Comunicação Efetiva', '2.1',
     'Comunica-se de forma clara, objetiva e respeitosa, expressando ideias e informações necessárias para o bom andamento do trabalho.', 'escala', 5),
    (p_empresa_id, p_tipo_ciclo, 'ambos', 2, 'Comunicação Efetiva', '2.2',
     'Escuta atentamente e busca compreender orientações, feedbacks e o ponto de vista de outras pessoas.', 'escala', 6),
    (p_empresa_id, p_tipo_ciclo, 'ambos', 3, 'Colaboração e Trabalho em Equipe', '3.1',
     'Atua de forma colaborativa com colegas e outras áreas, contribuindo para um ambiente de trabalho positivo.', 'escala', 7),
    (p_empresa_id, p_tipo_ciclo, 'ambos', 3, 'Colaboração e Trabalho em Equipe', '3.2',
     'Compartilha conhecimento, orienta colegas quando necessário e valoriza sugestões, opiniões e críticas construtivas.', 'escala', 8),
    (p_empresa_id, p_tipo_ciclo, 'ambos', 4, 'Flexibilidade e Adaptação', '4.1',
     'Demonstra flexibilidade para lidar com mudanças, demandas não planejadas e situações fora da rotina.', 'escala', 9),
    (p_empresa_id, p_tipo_ciclo, 'ambos', 4, 'Flexibilidade e Adaptação', '4.2',
     'Toma decisões com responsabilidade e equilíbrio, mesmo sob pressão.', 'escala', 10),
    (p_empresa_id, p_tipo_ciclo, 'ambos', 5, 'Iniciativa e Protagonismo', '5.1',
     'Demonstra iniciativa para solucionar problemas do dia a dia e contribuir com melhorias na rotina de trabalho.', 'escala', 11),
    (p_empresa_id, p_tipo_ciclo, 'ambos', 5, 'Iniciativa e Protagonismo', '5.2',
     'Busca aprendizado contínuo e se adapta às mudanças, incluindo novas tecnologias, processos e formas de trabalho.', 'escala', 12),
    (p_empresa_id, p_tipo_ciclo, 'ambos', 6, 'Relacionamento com o Cliente', '6.1',
     'Mantém um bom nível de serviço e relacionamento com clientes internos e externos, quando aplicável à função.', 'escala', 13),
    (p_empresa_id, p_tipo_ciclo, 'ambos', 6, 'Relacionamento com o Cliente', '6.2',
     'Demonstra capacidade de entender necessidades, lidar com situações de conflito e buscar soluções adequadas ao contexto da operação e do cliente.', 'escala', 14),
    (p_empresa_id, p_tipo_ciclo, 'ambos', 7, 'Relacionamento Interpessoal', '7.1',
     'Mantém convivência harmoniosa, respeito e boa interação com as pessoas no ambiente de trabalho.', 'escala', 15),
    (p_empresa_id, p_tipo_ciclo, 'ambos', 8, 'Cultura de Segurança', '8.1',
     'Demonstra a segurança como valor, cumprindo normas e procedimentos e não apresentando histórico de descumprimento.', 'escala', 16),
    (p_empresa_id, p_tipo_ciclo, 'ambos', 8, 'Cultura de Segurança', '8.2',
     'Utiliza corretamente uniformes, EPIs e EPCs, contribuindo para um ambiente de trabalho seguro.', 'escala', 17),
    (p_empresa_id, p_tipo_ciclo, 'ambos', 9, 'Saúde Mental e Equilíbrio Emocional', '9.1',
     'Demonstra atenção ao próprio bem-estar físico e emocional, reconhecendo limites e adotando comportamentos seguros no trabalho.', 'escala', 18),
    (p_empresa_id, p_tipo_ciclo, 'ambos', 10, 'Sonhar Grande e Desenvolvimento', '10.1',
     'Demonstra interesse em seu desenvolvimento pessoal e profissional, com expectativas e objetivos alinhados ao trabalho e à empresa.', 'escala', 19),
    (p_empresa_id, p_tipo_ciclo, 'ambos', 11, 'Comentários do Avaliador', '11.1',
     'Registre pontos fortes, oportunidades de desenvolvimento ou qualquer observação relevante para o feedback e o plano de ação.', 'texto', 20);
end;
$$;
