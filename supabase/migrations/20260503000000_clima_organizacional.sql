-- Pilares do clima (configuráveis por empresa)
create table if not exists clima_pilares (
  id uuid default gen_random_uuid() primary key,
  empresa_id uuid references empresas(id) on delete cascade,
  nome text not null,
  descricao text,
  ativo boolean default true,
  ordem integer default 0,
  created_at timestamptz default now()
);

-- Campanhas de clima
create table if not exists clima_campanhas (
  id uuid default gen_random_uuid() primary key,
  empresa_id uuid references empresas(id) on delete cascade not null,
  nome text not null,
  ano integer not null,
  periodo_inicio date,
  periodo_fim date,
  status text default 'rascunho' check (status in ('rascunho', 'ativa', 'encerrada')),
  tipo text default 'anonima' check (tipo in ('anonima', 'identificada')),
  publico_alvo text default 'todos' check (publico_alvo in ('todos', 'unidade', 'setor')),
  token_expiracao_horas integer default 168,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Perguntas das campanhas (associadas a pilares)
create table if not exists clima_perguntas (
  id uuid default gen_random_uuid() primary key,
  campanha_id uuid references clima_campanhas(id) on delete cascade,
  pilar_id uuid references clima_pilares(id) on delete set null,
  pilar_nome text,
  texto text not null,
  tipo text default 'escala' check (tipo in ('escala', 'texto_livre', 'enps')),
  ordem integer default 0,
  ativo boolean default true,
  created_at timestamptz default now()
);

-- Participantes com tokens individuais
create table if not exists clima_participantes (
  id uuid default gen_random_uuid() primary key,
  campanha_id uuid references clima_campanhas(id) on delete cascade,
  funcionario_id uuid references funcionarios(id) on delete set null,
  nome text,
  unidade text,
  setor text,
  turno text,
  token text unique not null,
  status text default 'pendente' check (status in ('pendente', 'respondido')),
  data_envio timestamptz default now(),
  data_resposta timestamptz,
  token_expira_em timestamptz,
  created_at timestamptz default now()
);

-- Cabeçalho anônimo da resposta (contexto sem identificação)
create table if not exists clima_respostas_cabecalho (
  id uuid default gen_random_uuid() primary key,
  campanha_id uuid references clima_campanhas(id) on delete cascade,
  participante_id uuid references clima_participantes(id) on delete set null,
  unidade text,
  setor text,
  turno text,
  created_at timestamptz default now()
);

-- Respostas individuais por pergunta
create table if not exists clima_respostas (
  id uuid default gen_random_uuid() primary key,
  cabecalho_id uuid references clima_respostas_cabecalho(id) on delete cascade,
  pergunta_id uuid references clima_perguntas(id),
  pilar_nome text,
  valor_numerico integer,
  valor_texto text,
  created_at timestamptz default now()
);

-- Planos de ação gerados a partir de indicadores críticos
create table if not exists clima_planos_acao (
  id uuid default gen_random_uuid() primary key,
  campanha_id uuid references clima_campanhas(id) on delete cascade,
  empresa_id uuid references empresas(id) on delete cascade not null,
  unidade text,
  setor text,
  indicador_afetado text,
  problema_identificado text,
  acao_corretiva text,
  responsavel text,
  prazo date,
  status text default 'pendente' check (status in ('pendente', 'em_andamento', 'concluido')),
  evidencia text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- RLS
alter table clima_pilares enable row level security;
alter table clima_campanhas enable row level security;
alter table clima_perguntas enable row level security;
alter table clima_participantes enable row level security;
alter table clima_respostas_cabecalho enable row level security;
alter table clima_respostas enable row level security;
alter table clima_planos_acao enable row level security;

-- Políticas para usuários autenticados
create policy "auth_all_pilares" on clima_pilares for all using (auth.uid() is not null);
create policy "auth_all_campanhas" on clima_campanhas for all using (auth.uid() is not null);
create policy "auth_all_perguntas" on clima_perguntas for all using (auth.uid() is not null);
create policy "auth_all_participantes" on clima_participantes for all using (auth.uid() is not null);
create policy "auth_all_cabecalho" on clima_respostas_cabecalho for all using (auth.uid() is not null);
create policy "auth_all_respostas" on clima_respostas for all using (auth.uid() is not null);
create policy "auth_all_planos" on clima_planos_acao for all using (auth.uid() is not null);

-- Políticas públicas para a pesquisa (anônimo via token)
create policy "public_select_campanhas" on clima_campanhas for select using (true);
create policy "public_select_perguntas" on clima_perguntas for select using (true);
create policy "public_select_participantes" on clima_participantes for select using (true);
create policy "public_update_participantes" on clima_participantes for update using (true);
create policy "public_insert_cabecalho" on clima_respostas_cabecalho for insert with check (true);
create policy "public_insert_respostas" on clima_respostas for insert with check (true);

-- Pilares padrão (inseridos via função chamada após criar campanha)
create or replace function criar_pilares_padrao(p_empresa_id uuid)
returns void language plpgsql as $$
declare
  pilares text[] := array[
    'Comunicação','Liderança','Recursos de Trabalho','Metas e Objetivos',
    'Desenvolvimento','Cooperação','Reconhecimento','Bem-estar',
    'Remuneração','Diversidade e Inclusão','Segurança Psicológica',
    'Saúde Mental','Segurança Física'
  ];
  pilar text;
  i integer := 1;
begin
  foreach pilar in array pilares loop
    insert into clima_pilares (empresa_id, nome, ordem)
    values (p_empresa_id, pilar, i)
    on conflict do nothing;
    i := i + 1;
  end loop;
end;
$$;
