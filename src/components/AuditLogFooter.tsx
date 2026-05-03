import { useState, useEffect } from 'react';
import { History, Clock, User, ChevronRight } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';

interface AuditLog {
  id: string;
  campo: string;
  valor_anterior: string | null;
  valor_novo: string | null;
  usuario_nome: string | null;
  created_at: string;
}

interface AuditLogFooterProps {
  tabela: string;
  registroId: string;
  updatedAt?: string | null;
  empresaId?: string;
}

// Mapeamento de nomes de campos para labels legíveis
const fieldLabels: Record<string, string> = {
  nome_completo: 'Nome Completo',
  nome_abreviado: 'Nome Abreviado',
  cargo_atual: 'Cargo',
  salario_atual: 'Salário',
  data_admissao: 'Data de Admissão',
  data_demissao: 'Data de Demissão',
  setor_atual: 'Setor',
  area_atuacao: 'Área de Atuação',
  tipo_contrato: 'Tipo de Contrato',
  tipo_cargo: 'Tipo de Cargo',
  telefone: 'Telefone',
  email: 'E-mail',
  endereco: 'Endereço',
  bairro: 'Bairro',
  cidade: 'Cidade',
  uf: 'UF',
  cep: 'CEP',
  cpf: 'CPF',
  rg: 'RG',
  pis: 'PIS',
  ctps: 'CTPS',
  serie: 'Série',
  banco: 'Banco',
  agencia: 'Agência',
  numero_conta: 'Número da Conta',
  tipo_conta: 'Tipo de Conta',
  chave_pix: 'Chave PIX',
  nome: 'Nome',
  nivel: 'Nível',
  salario: 'Salário',
  tipo: 'Tipo',
  status: 'Status',
  situacao: 'Situação',
  razao_social: 'Razão Social',
  nome_fantasia: 'Nome Fantasia',
  cnpj: 'CNPJ',
  observacoes: 'Observações',
  titulo_treinamento: 'Título do Treinamento',
  data_inicio: 'Data de Início',
  data_termino: 'Data de Término',
  duracao: 'Duração',
  investimento: 'Investimento',
  fornecedor: 'Fornecedor',
  local: 'Local',
  renovado: 'Renovado',
  formacao: 'Formação',
  funcoes: 'Funções',
  contato_whatsapp: 'WhatsApp',
  potencial: 'Potencial',
  desempenho_medio_ponderado: 'Desempenho Médio',
  data_avaliacao: 'Data da Avaliação',
  salario_base: 'Salário Base',
  horas_extras: 'Horas Extras',
  faltas: 'Faltas',
  total: 'Total',
  descricao: 'Descrição',
  permissoes: 'Permissões',
  // Férias
  previsao: 'Previsão',
  ferias_concluidas: 'Férias Concluídas',
  periodo_aquisitivo_inicio: 'Início Período Aquisitivo',
  periodo_aquisitivo_fim: 'Fim Período Aquisitivo',
  valor_ferias: 'Valor das Férias',
  data_limite: 'Data Limite',
  periodo_gozo_adicionado: 'Período de Gozo Adicionado',
  periodo_gozo_removido: 'Período de Gozo Removido',
  // Exames
  nome_exame: 'Nome do Exame',
  clinica: 'Clínica',
  data_realizacao: 'Data de Realização',
  data_validade: 'Data de Validade',
  resultado: 'Resultado',
  // Ausências
  tipo_ausencia: 'Tipo de Ausência',
  justificada: 'Justificada',
  data_fim: 'Data de Fim',
  atestado_medico: 'Atestado Médico',
  // Advertências
  data_ocorrencia: 'Data da Ocorrência',
  tipo_ocorrencia: 'Tipo de Ocorrência',
  dias_penalidade: 'Dias de Penalidade',
  motivo_penalidade: 'Motivo da Penalidade',
  // Demissões
  motivo_desligamento: 'Motivo do Desligamento',
  documento_url: 'Documento',
  // Ocorrências
  anexo_url: 'Anexo',
  usuario_responsavel_id: 'Usuário Responsável',
  // Alterações Salariais
  data_alteracao: 'Data da Alteração',
  motivo: 'Motivo',
  cargo_anterior: 'Cargo Anterior',
  salario_anterior: 'Salário Anterior',
  novo_cargo: 'Novo Cargo',
  novo_salario: 'Novo Salário',
};

const getFieldLabel = (campo: string): string => {
  return fieldLabels[campo] || campo.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
};

const formatValue = (value: string | null): string => {
  if (value === null || value === undefined || value === '') return '(vazio)';
  if (value === 'true') return 'Sim';
  if (value === 'false') return 'Não';
  return value;
};

export function AuditLogFooter({ tabela, registroId, updatedAt, empresaId }: AuditLogFooterProps) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [canViewAudit, setCanViewAudit] = useState<boolean | null>(null);

  // Verificar permissão internamente
  useEffect(() => {
    const checkPermission = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setCanViewAudit(false);
          return;
        }

        // Se não tiver empresaId, tentar buscar do registro
        let targetEmpresaId = empresaId;
        if (!targetEmpresaId) {
          const { data: logData } = await supabase
            .from('audit_logs')
            .select('empresa_id')
            .eq('tabela', tabela)
            .eq('registro_id', registroId)
            .limit(1)
            .single();
          targetEmpresaId = logData?.empresa_id;
        }

        if (!targetEmpresaId) {
          setCanViewAudit(false);
          return;
        }

        // Verificar se é Super Admin
        const { data: adminRoles } = await supabase
          .from('user_roles')
          .select('empresa_id')
          .eq('user_id', user.id)
          .eq('role', 'admin');

        const { data: currentEmpresa } = await supabase
          .from('empresas')
          .select('grupo_empresarial_id')
          .eq('id', targetEmpresaId)
          .single();

        if (adminRoles && adminRoles.length > 0 && currentEmpresa) {
          const empresaIds = adminRoles.map(r => r.empresa_id);
          const { data: empresasAdmin } = await supabase
            .from('empresas')
            .select('grupo_empresarial_id')
            .in('id', empresaIds);

          const isAdmin = empresasAdmin?.some(
            e => e.grupo_empresarial_id === currentEmpresa.grupo_empresarial_id
          ) ?? false;

          if (isAdmin) {
            setCanViewAudit(true);
            return;
          }
        }

        // Buscar permissões dos perfis do usuário
        const { data: userPerfis } = await supabase
          .from('usuarios_perfis')
          .select(`
            perfil_id,
            perfil:perfis_acesso!inner(
              empresa:empresas!inner(grupo_empresarial_id)
            )
          `)
          .eq('user_id', user.id);

        if (!userPerfis || userPerfis.length === 0) {
          setCanViewAudit(false);
          return;
        }

        // Filtrar perfis do mesmo grupo empresarial
        const perfilIds = userPerfis
          .filter((up: any) => up.perfil?.empresa?.grupo_empresarial_id === currentEmpresa?.grupo_empresarial_id)
          .map((up: any) => up.perfil_id);

        if (perfilIds.length === 0) {
          setCanViewAudit(false);
          return;
        }

        // Verificar permissão específica de auditoria
        const { data: permissoesData } = await supabase
          .from('permissoes_perfil')
          .select('codigo_permissao')
          .in('perfil_id', perfilIds)
          .eq('codigo_permissao', 'audit.visualizar');

        setCanViewAudit(permissoesData && permissoesData.length > 0);
      } catch (error) {
        console.error('Error checking audit permission:', error);
        setCanViewAudit(false);
      }
    };

    checkPermission();
  }, [empresaId, tabela, registroId]);

  const loadLogs = async () => {
    if (!registroId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('id, campo, valor_anterior, valor_novo, usuario_nome, created_at')
        .eq('tabela', tabela)
        .eq('registro_id', registroId)
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      console.error('Erro ao carregar logs de auditoria:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (dialogOpen) {
      loadLogs();
    }
  }, [dialogOpen, tabela, registroId]);

  const formatDateTime = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return '-';
    }
  };

  const lastUpdate = updatedAt ? formatDateTime(updatedAt) : null;

  // Agrupar logs por data
  const groupedLogs = logs.reduce((acc, log) => {
    const date = format(new Date(log.created_at), 'dd/MM/yyyy', { locale: ptBR });
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(log);
    return acc;
  }, {} as Record<string, AuditLog[]>);

  // Enquanto verifica permissão ou se não tem permissão, não renderiza nada
  if (canViewAudit === null || canViewAudit === false) {
    return null;
  }

  return (
    <div className="mt-6 pt-4 border-t border-border">
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <button 
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer group"
          >
            <History className="h-4 w-4" />
            <span>Última alteração:</span>
            {lastUpdate ? (
              <span className="text-foreground font-medium">{lastUpdate}</span>
            ) : (
              <span className="italic">Sem registro</span>
            )}
            <ChevronRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="h-5 w-5" />
              Histórico de Alterações
            </DialogTitle>
            <p className="text-xs text-muted-foreground">
              Registros dos últimos 12 meses
            </p>
          </DialogHeader>
          
          <ScrollArea className="h-[60vh] pr-4">
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-20 w-full" />
                  </div>
                ))}
              </div>
            ) : logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <History className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-center">Nenhuma alteração registrada até o momento.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedLogs).map(([date, dateLogs]) => (
                  <div key={date}>
                    <div className="flex items-center gap-2 mb-3">
                      <Badge variant="outline" className="text-xs font-normal">
                        {date}
                      </Badge>
                      <Separator className="flex-1" />
                    </div>
                    <div className="space-y-3">
                      {dateLogs.map((log) => (
                        <div 
                          key={log.id} 
                          className="bg-muted/50 rounded-lg p-3 text-sm"
                        >
                          <div className="flex items-start justify-between mb-2">
                            <Badge variant="secondary" className="font-medium">
                              {getFieldLabel(log.campo)}
                            </Badge>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <Clock className="h-3 w-3" />
                              {format(new Date(log.created_at), 'HH:mm', { locale: ptBR })}
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">De:</span>
                              <p className="mt-0.5 text-destructive/80 line-through">
                                {formatValue(log.valor_anterior)}
                              </p>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Para:</span>
                              <p className="mt-0.5 text-primary font-medium">
                                {formatValue(log.valor_novo)}
                              </p>
                            </div>
                          </div>
                          
                          {log.usuario_nome && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                              <User className="h-3 w-3" />
                              <span>{log.usuario_nome}</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}
