export interface PermissionGroup {
  label: string;
  permissions: Permission[];
}

export interface Permission {
  codigo: string;
  label: string;
  description?: string;
}

export const PERMISSION_GROUPS: PermissionGroup[] = [
  {
    label: "Funcionários - Cadastro",
    permissions: [
      { codigo: "func.cadastrar", label: "Cadastrar funcionário" },
      { codigo: "func.editar", label: "Editar funcionário" },
      { codigo: "func.excluir", label: "Excluir funcionário" },
      { codigo: "func.dados_sensiveis", label: "Ver dados sensíveis (CPF, RG, salário, etc.)" },
    ],
  },
  {
    label: "Funcionários - Aba Dados (Seções)",
    permissions: [
      { codigo: "func.aba.dados_pessoais", label: "Ver Dados Pessoais" },
      { codigo: "func.aba.documentacao", label: "Ver Documentação" },
      { codigo: "func.aba.endereco", label: "Ver Endereço" },
      { codigo: "func.aba.contratuais", label: "Ver Dados Contratuais" },
      { codigo: "func.aba.documentos_anexados", label: "Ver Documentos Anexados" },
      { codigo: "func.aba.financeiro", label: "Ver Dados Financeiros" },
      { codigo: "func.aba.outros", label: "Ver Outros Dados" },
    ],
  },
  {
    label: "Funcionários - Outras Abas",
    permissions: [
      { codigo: "func.aba.ferias", label: "Ver aba Férias" },
      { codigo: "func.aba.treinamentos", label: "Ver aba Treinamentos" },
      { codigo: "func.aba.exames", label: "Ver aba Exames" },
      { codigo: "func.aba.ausencias", label: "Ver aba Ausências" },
      { codigo: "func.aba.ocorrencias", label: "Ver aba Ocorrências" },
      { codigo: "func.aba.advertencias", label: "Ver aba Advertências" },
      { codigo: "func.aba.historico", label: "Ver aba Histórico" },
      { codigo: "func.aba.acesso", label: "Ver aba Acesso ao Sistema" },
    ],
  },
  {
    label: "Menu Lateral - Funcionários",
    permissions: [
      { codigo: "menu.funcionarios", label: "Visualizar Lista de Funcionários" },
      { codigo: "menu.cargos", label: "Acessar menu Cargos" },
    ],
  },
  {
    label: "Gerenciamento de Cargos",
    permissions: [
      { codigo: "cargo.visualizar", label: "Visualizar listagem de cargos" },
      { codigo: "cargo.criar", label: "Criar cargo" },
      { codigo: "cargo.editar", label: "Editar cargo" },
      { codigo: "cargo.excluir", label: "Excluir cargo" },
    ],
  },
  {
    label: "Cargos - Aba Dados / Descritivo",
    permissions: [
      { codigo: "cargo.dados.visualizar", label: "Visualizar aba Dados / Descritivo" },
      { codigo: "cargo.dados.editar", label: "Editar descritivo do cargo" },
      { codigo: "cargo.dados.salario", label: "Visualizar salário do cargo" },
    ],
  },
  {
    label: "Cargos - Aba Exames",
    permissions: [
      { codigo: "cargo.exames.visualizar", label: "Visualizar aba Exames" },
      { codigo: "cargo.exames.criar", label: "Criar exame" },
      { codigo: "cargo.exames.editar", label: "Editar exame" },
      { codigo: "cargo.exames.excluir", label: "Excluir exame" },
    ],
  },
  {
    label: "Cargos - Aba Treinamentos",
    permissions: [
      { codigo: "cargo.treinamentos.visualizar", label: "Visualizar aba Treinamentos" },
      { codigo: "cargo.treinamentos.criar", label: "Criar treinamento" },
      { codigo: "cargo.treinamentos.editar", label: "Editar treinamento" },
      { codigo: "cargo.treinamentos.excluir", label: "Excluir treinamento" },
    ],
  },
  {
    label: "Cargos - Aba Riscos Ocupacionais",
    permissions: [
      { codigo: "cargo.riscos.visualizar", label: "Visualizar aba Riscos Ocupacionais" },
      { codigo: "cargo.riscos.criar", label: "Criar risco" },
      { codigo: "cargo.riscos.editar", label: "Editar risco" },
      { codigo: "cargo.riscos.excluir", label: "Excluir risco" },
    ],
  },
  {
    label: "Cargos - Aba EPIs",
    permissions: [
      { codigo: "cargo.epis.visualizar", label: "Visualizar aba EPIs" },
      { codigo: "cargo.epis.criar", label: "Criar EPI" },
      { codigo: "cargo.epis.editar", label: "Editar EPI" },
      { codigo: "cargo.epis.excluir", label: "Excluir EPI" },
    ],
  },
  {
    label: "Cargos - Plano de Carreira",
    permissions: [
      { codigo: "cargo.carreira.visualizar", label: "Visualizar Plano de Carreira" },
      { codigo: "cargo.carreira.criar", label: "Criar trilha de carreira" },
      { codigo: "cargo.carreira.editar", label: "Editar trilha de carreira" },
      { codigo: "cargo.carreira.excluir", label: "Excluir trilha de carreira" },
    ],
  },
  {
    label: "Menu Lateral - Recrutamento",
    permissions: [
      { codigo: "menu.recrutamento", label: "Acessar menu Recrutamento" },
      { codigo: "menu.processos_seletivos", label: "Visualizar Processos Seletivos" },
      { codigo: "menu.banco_talentos", label: "Visualizar Banco de Talentos" },
    ],
  },
  {
    label: "Ocorrências Gerais",
    permissions: [
      { codigo: "menu.ocorrencias_gerais", label: "Acessar menu Ocorrências Gerais" },
      { codigo: "ocg.visualizar", label: "Visualizar ocorrências gerais" },
      { codigo: "ocg.criar", label: "Criar ocorrência geral" },
      { codigo: "ocg.editar", label: "Editar ocorrência geral" },
      { codigo: "ocg.excluir", label: "Excluir ocorrência geral" },
    ],
  },
  {
    label: "Menu Lateral - Configurações",
    permissions: [
      { codigo: "menu.configuracoes", label: "Acessar Configurações" },
      { codigo: "menu.permissoes", label: "Gerenciar Permissões" },
    ],
  },
  {
    label: "Auditoria",
    permissions: [
      { codigo: "audit.visualizar", label: "Visualizar histórico de auditoria" },
    ],
  },
  {
    label: "Relatórios - Funcionários",
    permissions: [
      { codigo: "rel.gestao_funcionarios", label: "Gestão de Funcionários" },
      { codigo: "rel.gestao_ferias", label: "Gestão de Férias" },
      { codigo: "rel.gestao_exames", label: "Gestão de Exames" },
      { codigo: "rel.gestao_treinamentos", label: "Gestão de Treinamentos" },
      { codigo: "rel.gestao_turnover", label: "Gestão de Turnover" },
      { codigo: "rel.aniversariantes", label: "Aniversariantes" },
      { codigo: "rel.gestao_absenteismo", label: "Gestão de Absenteísmo" },
      { codigo: "rel.gestao_documental_pessoas", label: "Gestão Documental de Pessoas" },
    ],
  },
];

export const ALL_PERMISSION_CODES = PERMISSION_GROUPS.flatMap(
  (group) => group.permissions.map((p) => p.codigo)
);

export const MENU_PERMISSION_MAP: Record<string, string[]> = {
  "/funcionarios": ["menu.funcionarios"],
  "/cargos": ["menu.cargos"],
  "/processos-seletivos": ["menu.recrutamento", "menu.processos_seletivos"],
  "/banco-talentos": ["menu.recrutamento", "menu.banco_talentos"],
  "/ocorrencias-gerais": ["menu.ocorrencias_gerais"],
  "/configuracoes": ["menu.configuracoes"],
  "/configuracoes/permissoes": ["menu.permissoes"],
  "/relatorios": ["rel.gestao_funcionarios"],
  "/relatorios/ferias": ["rel.gestao_ferias"],
  "/relatorios/exames": ["rel.gestao_exames"],
  "/relatorios/treinamentos": ["rel.gestao_treinamentos"],
  "/relatorios/turnover": ["rel.gestao_turnover"],
  "/relatorios/aniversariantes": ["rel.aniversariantes"],
  "/relatorios/absenteismo": ["rel.gestao_absenteismo"],
  "/relatorios/gestao-documental-pessoas": ["rel.gestao_documental_pessoas"],
};
