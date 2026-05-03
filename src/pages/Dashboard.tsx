// Dashboard component with timezone-safe date formatting
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, TrendingUp, TrendingDown, AlertTriangle, FileText, Calendar, Award, Briefcase, Activity, Clock, Target, UserCheck, GraduationCap } from 'lucide-react';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { usePermissions } from '@/hooks/usePermissions';
import { formatDateForDisplay } from '@/lib/utils';

interface Funcionario {
  id: string;
  nome_completo: string;
  nome_abreviado?: string;
  cargo_atual?: string;
  empresa_id: string;
  data_admissao?: string;
  data_demissao?: string;
  foto_url?: string;
  codigo: string;
}

interface DashboardStats {
  totalFuncionarios: number;
  admissoesDoMes: number;
  demissoesDoMes: number;
  taxaTurnover: number;
  treinamentosVencidos: number;
  examesVencidos: number;
  feriasVencidas: number;
  avaliacoesPendentes: number;
  processosSeletivos: number;
  treinamentosRealizados: number;
  taxaAbsenteismo: number;
  aniversariantes: number;
}

interface DashboardProps {
  currentEmpresa?: any;
  isGroupView?: boolean;
  currentGroupId?: string | null;
}

const Dashboard = ({ currentEmpresa, isGroupView, currentGroupId }: DashboardProps) => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [evolucaoData, setEvolucaoData] = useState<any[]>([]);
  const [setorData, setSetorData] = useState<any[]>([]);
  const [aniversariantesData, setAniversariantesData] = useState<any[]>([]);
  
  // Hook de permissões
  const { hasPermission, hasAnyPermission, isSuperAdmin, isLoading: permissionsLoading } = usePermissions(currentEmpresa?.id);
  
  // Estados para modais de detalhamento
  const [showTurnoverModal, setShowTurnoverModal] = useState(false);
  const [showAbsenteismoModal, setShowAbsenteismoModal] = useState(false);
  const [showExamesModal, setShowExamesModal] = useState(false);
  const [showTreinamentosModal, setShowTreinamentosModal] = useState(false);
  const [showFeriasModal, setShowFeriasModal] = useState(false);
  const [showAvaliacoesModal, setShowAvaliacoesModal] = useState(false);
  
  // Dados detalhados
  const [admisoesDetalhes, setAdmisoesDetalhes] = useState<any[]>([]);
  const [demissoesDetalhes, setDemissoesDetalhes] = useState<any[]>([]);
  const [ausenciasDetalhes, setAusenciasDetalhes] = useState<any[]>([]);
  const [examesDetalhes, setExamesDetalhes] = useState<any[]>([]);
  const [treinamentosDetalhes, setTreinamentosDetalhes] = useState<any[]>([]);
  const [feriasDetalhes, setFeriasDetalhes] = useState<any[]>([]);
  const [avaliacoesDetalhes, setAvaliacoesDetalhes] = useState<any[]>([]);

  // Verificações de permissão para cada card
  const canViewFuncionarios = isSuperAdmin || hasPermission('menu.funcionarios');
  const canViewAbsenteismo = isSuperAdmin || hasPermission('rel.gestao_absenteismo');
  const canViewTreinamentos = isSuperAdmin || hasPermission('rel.gestao_treinamentos');
  const canViewExames = isSuperAdmin || hasPermission('rel.gestao_exames');
  const canViewFerias = isSuperAdmin || hasPermission('rel.gestao_ferias');
  const canViewAvaliacoes = isSuperAdmin || hasPermission('menu.avaliacao_desempenho');
  const canViewProcessosSeletivos = isSuperAdmin || hasPermission('menu.processos_seletivos');
  const canViewAniversariantes = isSuperAdmin || hasPermission('rel.aniversariantes');

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      let empresaIds: string[] = [];

      if (isGroupView && currentGroupId) {
        const { data: empresas } = await supabase
          .from('empresas')
          .select('id')
          .eq('grupo_empresarial_id', currentGroupId);
        empresaIds = empresas?.map(e => e.id) || [];
      } else if (currentEmpresa) {
        empresaIds = [currentEmpresa.id];
      }

      if (empresaIds.length === 0) {
        setStats({
          totalFuncionarios: 0,
          admissoesDoMes: 0,
          demissoesDoMes: 0,
          taxaTurnover: 0,
          treinamentosVencidos: 0,
          examesVencidos: 0,
          feriasVencidas: 0,
          avaliacoesPendentes: 0,
          processosSeletivos: 0,
          treinamentosRealizados: 0,
          taxaAbsenteismo: 0,
          aniversariantes: 0
        });
        return;
      }

      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      const firstDayOfMonth = startOfMonth(currentDate);
      const lastDayOfMonth = endOfMonth(currentDate);

      // Buscar funcionários
      const { data: allFuncionarios } = await supabase.rpc('funcionarios_safe');
      const allEmpresaFuncionarios = (allFuncionarios || []).filter(f => 
        empresaIds.includes(f.empresa_id)
      );
      const funcionariosAtivos = allEmpresaFuncionarios.filter(f => !f.data_demissao);

      // Admissões do mês
      const admissoes = allEmpresaFuncionarios.filter(f => {
        if (!f.data_admissao) return false;
        const admissaoDate = new Date(f.data_admissao);
        return isWithinInterval(admissaoDate, { start: firstDayOfMonth, end: lastDayOfMonth });
      });
      setAdmisoesDetalhes(admissoes);

      // Demissões do mês
      const demissoes = allEmpresaFuncionarios.filter(f => {
        if (!f.data_demissao) return false;
        const demissaoDate = new Date(f.data_demissao);
        return isWithinInterval(demissaoDate, { start: firstDayOfMonth, end: lastDayOfMonth });
      });
      setDemissoesDetalhes(demissoes);

      // Cálculo do Headcount médio mensal:
      // Headcount inicial (primeiro dia do mês) = funcionários admitidos antes do primeiro dia que não foram demitidos antes do primeiro dia
      const headcountInicial = allEmpresaFuncionarios.filter(f => {
        const dataAdmissao = f.data_admissao ? new Date(f.data_admissao) : null;
        const dataDemissao = f.data_demissao ? new Date(f.data_demissao) : null;
        // Admitido antes ou no primeiro dia do mês
        if (!dataAdmissao || dataAdmissao > firstDayOfMonth) return false;
        // Não foi demitido, ou foi demitido depois do primeiro dia do mês
        if (dataDemissao && dataDemissao < firstDayOfMonth) return false;
        return true;
      }).length;

      // Headcount final (último dia do mês) = funcionários admitidos até o último dia que não foram demitidos antes do último dia
      const headcountFinal = allEmpresaFuncionarios.filter(f => {
        const dataAdmissao = f.data_admissao ? new Date(f.data_admissao) : null;
        const dataDemissao = f.data_demissao ? new Date(f.data_demissao) : null;
        // Admitido antes ou no último dia do mês
        if (!dataAdmissao || dataAdmissao > lastDayOfMonth) return false;
        // Não foi demitido, ou foi demitido depois do último dia do mês
        if (dataDemissao && dataDemissao <= lastDayOfMonth) return false;
        return true;
      }).length;

      const headcountMedio = (headcountInicial + headcountFinal) / 2;

      // Taxa de Turnover mensal (%) = ((Admissões do mês + Demissões do mês) ÷ 2) ÷ Headcount médio do mês × 100
      const taxaTurnover = headcountMedio > 0 
        ? (((admissoes.length + demissoes.length) / 2) / headcountMedio) * 100 
        : 0;

      // Helper: Calcular status de ASO (baseado no campo status)
      const calculateASOStatus = (dataValidade: string | null, status: string | null): string => {
        if (status === 'Renovado') return 'Renovado';
        if (!dataValidade) return 'Válido';
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const validade = new Date(dataValidade);
        const diffTime = validade.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return 'Vencido';
        if (diffDays <= 30) return 'Vencendo';
        return 'Válido';
      };

      // Helper: Calcular dias adquiridos de férias (mesma lógica do GestaoFerias)
      const calcularDiasAdquiridos = (periodoInicio: string | null): number => {
        if (!periodoInicio) return 0;
        const inicio = new Date(periodoInicio);
        const hoje = new Date();
        const diffTime = hoje.getTime() - inicio.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const mesesCompletos = Math.floor(diffDays / 30);
        const mesesLimitados = Math.min(mesesCompletos, 12);
        return Math.min(Math.ceil(mesesLimitados * 2.5), 30);
      };

      // Helper: Status de férias (mesma lógica do GestaoFerias)
      const getStatusFerias = (ferias: any, periodosGozo: any[], diasAdquiridos: number) => {
        const diasGozo = periodosGozo.reduce((total: number, periodo: any) => {
          const inicio = new Date(periodo.data_inicio);
          const fim = new Date(periodo.data_fim);
          const diffTime = Math.abs(fim.getTime() - inicio.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
          return total + diffDays;
        }, 0);

        if (ferias.ferias_concluidas) return 'Férias concluídas';
        
        if (periodosGozo.length > 0 && diasAdquiridos > 0) {
          const ultimaDataFim = periodosGozo.reduce((latest: Date, periodo: any) => {
            const dataFim = new Date(periodo.data_fim);
            return dataFim > latest ? dataFim : latest;
          }, new Date(0));
          
          if (new Date() > ultimaDataFim && diasGozo >= diasAdquiridos) {
            return 'Férias concluídas';
          }
        }

        if (ferias.periodo_aquisitivo_fim) {
          const periodoAquisitivoFim = new Date(ferias.periodo_aquisitivo_fim);
          if (new Date() > periodoAquisitivoFim) return 'Férias vencidas';
        }

        return 'Válido';
      };

      // Helper: Status de documento (similar a exames)
      const calculateDocumentoStatus = (dataVigenciaFim: string | null): string => {
        if (!dataVigenciaFim) return 'Válido';
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const fim = new Date(dataVigenciaFim);
        const diffTime = fim.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 0) return 'Vencido';
        if (diffDays <= 30) return 'Vencendo';
        return 'Válido';
      };
      
      // EXAMES: Buscar ASOs consolidados (não exames individuais)
      const { data: asosData } = await supabase
        .from('asos')
        .select('id, funcionario_id, tipo_aso, clinica, data_emissao, data_validade, resultado, status, empresa_id, exames_aso(id)')
        .in('empresa_id', empresaIds);
      
      const funcionarioIdsAsos = [...new Set(asosData?.map(a => a.funcionario_id) || [])];
      const funcionariosAsosMap = new Map(
        funcionariosAtivos
          .filter(f => funcionarioIdsAsos.includes(f.id))
          .map(f => [f.id, f])
      );

      const asosCriticos = (asosData || [])
        .filter(aso => funcionariosAsosMap.has(aso.funcionario_id))
        .map(aso => {
          const funcionario = funcionariosAsosMap.get(aso.funcionario_id);
          const statusCalc = calculateASOStatus(aso.data_validade, aso.status);
          return { ...aso, funcionario, statusCalc, qtd_exames: aso.exames_aso?.length || 0 };
        })
        .filter(a => a.statusCalc === 'Vencido' || a.statusCalc === 'Vencendo');
      
      const examesVencidos = asosCriticos.length;
      setExamesDetalhes(asosCriticos);

      // TREINAMENTOS: Buscar de treinamentos_funcionario (nova tabela)
      const { data: treinamentosData } = await supabase
        .from('treinamentos_funcionario')
        .select('*')
        .in('empresa_id', empresaIds)
        .not('data_validade', 'is', null);
      
      const funcionarioIdsTreinamentos = [...new Set(treinamentosData?.map(t => t.funcionario_id) || [])];
      const funcionariosTreinamentosMap = new Map(
        funcionariosAtivos
          .filter(f => funcionarioIdsTreinamentos.includes(f.id))
          .map(f => [f.id, f])
      );

      const treinamentosCriticos = (treinamentosData || [])
        .filter(t => funcionariosTreinamentosMap.has(t.funcionario_id))
        .map(t => {
          const funcionario = funcionariosTreinamentosMap.get(t.funcionario_id);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const dataValidade = new Date(t.data_validade!);
          const diffTime = dataValidade.getTime() - today.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
          const isVencido = diffDays < 0;
          const isVencendo = diffDays >= 0 && diffDays <= 30;
          return { ...t, funcionario, isVencido, isVencendo };
        })
        .filter(t => t.isVencido || t.isVencendo);
      
      const treinamentosVencidos = treinamentosCriticos.length;
      setTreinamentosDetalhes(treinamentosCriticos);

      // FÉRIAS: Buscar sem join, buscar períodos e processar em JS
      const { data: feriasData } = await supabase
        .from('ferias')
        .select('*')
        .in('empresa_id', empresaIds)
        .eq('ferias_concluidas', false);
      
      const feriasIds = feriasData?.map(f => f.id) || [];
      const { data: periodosGozo } = await supabase
        .from('periodos_gozo_ferias')
        .select('*')
        .in('ferias_id', feriasIds);
      
      const funcionarioIdsFerias = [...new Set(feriasData?.map(f => f.funcionario_id) || [])];
      const funcionariosFeriasMap = new Map(
        funcionariosAtivos
          .filter(f => funcionarioIdsFerias.includes(f.id))
          .map(f => [f.id, f])
      );

      const seisMesesDepois = new Date(currentDate);
      seisMesesDepois.setMonth(seisMesesDepois.getMonth() + 6);

      const feriasCriticas = (feriasData || [])
        .filter(f => funcionariosFeriasMap.has(f.funcionario_id))
        .map(f => {
          const funcionario = funcionariosFeriasMap.get(f.funcionario_id);
          const periodos = periodosGozo?.filter(p => p.ferias_id === f.id) || [];
          const diasAdquiridos = calcularDiasAdquiridos(f.periodo_aquisitivo_inicio);
          const status = getStatusFerias(f, periodos, diasAdquiridos);
          return { ...f, funcionario, status, periodos };
        })
        .filter(f => {
          // Incluir se "Férias vencidas" OU se data_limite está dentro dos próximos 6 meses
          if (f.status === 'Férias vencidas') return true;
          if (f.data_limite) {
            const dataLimite = new Date(f.data_limite);
            return dataLimite >= currentDate && dataLimite <= seisMesesDepois;
          }
          return false;
        });
      
      const feriasVencidas = feriasCriticas.length;
      setFeriasDetalhes(feriasCriticas);


      // Avaliações pendentes (funcionários sem avaliação nos últimos 6 meses)
      const sixMonthsAgo = subMonths(currentDate, 6);
      const { data: avaliacoes } = await supabase
        .from('avaliacoes_desempenho')
        .select('id, avaliado_id')
        .in('empresa_id', empresaIds)
        .gte('data_avaliacao', format(sixMonthsAgo, 'yyyy-MM-dd'));
      const funcionariosAvaliados = new Set(avaliacoes?.map(a => a.avaliado_id).filter(Boolean) || []);
      const funcionariosPendentes = funcionariosAtivos.filter(f => !funcionariosAvaliados.has(f.id));
      const avaliacoesPendentes = funcionariosPendentes.length;
      setAvaliacoesDetalhes(funcionariosPendentes);

      // Processos seletivos ativos - placeholder
      const processosSeletivos = 0;

      // Treinamentos realizados no mês (nova tabela)
      const { data: treinamentosRealizadosData } = await supabase
        .from('treinamentos_funcionario')
        .select('id')
        .in('empresa_id', empresaIds)
        .gte('data_realizacao', format(firstDayOfMonth, 'yyyy-MM-dd'))
        .lte('data_realizacao', format(lastDayOfMonth, 'yyyy-MM-dd'));
      const treinamentosRealizados = treinamentosRealizadosData?.length || 0;

      // Helper: Calcular dias de ausência (similar ao relatório)
      const calculateDaysAbsence = (dataInicio: string, dataFim: string | null): number => {
        const inicio = new Date(dataInicio);
        const fim = dataFim ? new Date(dataFim) : new Date();
        const diffTime = Math.abs(fim.getTime() - inicio.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir o dia inicial
        return diffDays;
      };

      // ABSENTEÍSMO: Buscar sem join e processar em JS
      const { data: ausenciasData } = await supabase
        .from('ausencias')
        .select('*')
        .in('empresa_id', empresaIds)
        .gte('data_inicio', format(firstDayOfMonth, 'yyyy-MM-dd'))
        .lte('data_fim', format(lastDayOfMonth, 'yyyy-MM-dd'));
      
      const funcionarioIdsAusencias = [...new Set(ausenciasData?.map(a => a.funcionario_id) || [])];
      const funcionariosAusenciasMap = new Map(
        funcionariosAtivos
          .filter(f => funcionarioIdsAusencias.includes(f.id))
          .map(f => [f.id, f])
      );

      const ausenciasProcessadas = (ausenciasData || [])
        .filter(aus => funcionariosAusenciasMap.has(aus.funcionario_id))
        .map(aus => {
          const funcionario = funcionariosAusenciasMap.get(aus.funcionario_id);
          const dias_ausencia = calculateDaysAbsence(aus.data_inicio, aus.data_fim);
          return { 
            ...aus, 
            funcionario, 
            funcionario_nome: funcionario?.nome_completo || 'Não encontrado',
            dias_ausencia 
          };
        });

      const diasUteis = 22;
      const totalDiasPossiveis = funcionariosAtivos.length * diasUteis;
      const totalDiasAusentes = ausenciasProcessadas.reduce((sum, aus) => sum + aus.dias_ausencia, 0);
      const taxaAbsenteismo = totalDiasPossiveis > 0 ? (totalDiasAusentes / totalDiasPossiveis) * 100 : 0;
      setAusenciasDetalhes(ausenciasProcessadas);

      // Aniversariantes do mês - extrair mês diretamente da string para evitar problemas de fuso
      const aniversariantes = funcionariosAtivos.filter(f => {
        if (!f.data_nascimento) return false;
        // data_nascimento vem no formato YYYY-MM-DD, extrair o mês diretamente
        const [, mes] = f.data_nascimento.split('-');
        const mesNascimento = parseInt(mes, 10) - 1; // JavaScript usa mês 0-indexed
        return mesNascimento === currentMonth;
      });

      setStats({
        totalFuncionarios: funcionariosAtivos.length,
        admissoesDoMes: admissoes.length,
        demissoesDoMes: demissoes.length,
        taxaTurnover: Number(taxaTurnover.toFixed(1)),
        treinamentosVencidos,
        examesVencidos,
        feriasVencidas,
        avaliacoesPendentes,
        processosSeletivos,
        treinamentosRealizados,
        taxaAbsenteismo: Number(taxaAbsenteismo.toFixed(1)),
        aniversariantes: aniversariantes.length
      });

      // Dados para gráfico de evolução (últimos 6 meses)
      const evolucao = [];
      for (let i = 5; i >= 0; i--) {
        const mes = subMonths(currentDate, i);
        const mesInicio = startOfMonth(mes);
        const mesFim = endOfMonth(mes);
        
        const funcionariosMes = (allFuncionarios || []).filter(f => {
          if (!empresaIds.includes(f.empresa_id)) return false;
          const admitido = f.data_admissao && new Date(f.data_admissao) <= mesFim;
          const naoDesligado = !f.data_demissao || new Date(f.data_demissao) > mesFim;
          return admitido && naoDesligado;
        });

        evolucao.push({
          mes: format(mes, 'MMM', { locale: ptBR }),
          total: funcionariosMes.length
        });
      }
      setEvolucaoData(evolucao);

      // Dados para gráfico de distribuição por setor
      const setores = new Map<string, number>();
      funcionariosAtivos.forEach(f => {
        const setor = f.setor_atual || 'Não definido';
        setores.set(setor, (setores.get(setor) || 0) + 1);
      });
      const setorArray = Array.from(setores.entries())
        .map(([nome, valor]) => ({ nome, valor }))
        .sort((a, b) => b.valor - a.valor)
        .slice(0, 5);
      setSetorData(setorArray);

      // Dados de aniversariantes - extrair dia diretamente da string para evitar problemas de fuso
      setAniversariantesData(
        aniversariantes
          .sort((a, b) => {
            const diaA = parseInt(a.data_nascimento!.split('-')[2], 10);
            const diaB = parseInt(b.data_nascimento!.split('-')[2], 10);
            return diaA - diaB;
          })
          .slice(0, 5)
      );

    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, [currentEmpresa, isGroupView, currentGroupId]);

  const chartColors = ['hsl(var(--primary))', 'hsl(210, 45%, 65%)', 'hsl(210, 40%, 75%)', 'hsl(210, 35%, 85%)', 'hsl(210, 30%, 90%)'];

  if (loading || permissionsLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard Executivo</h1>
          <p className="text-muted-foreground">Indicadores estratégicos de RH</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="h-4 w-24" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-8 w-16 mb-2" />
                <Skeleton className="h-3 w-32" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard Executivo</h1>
        <p className="text-muted-foreground">Indicadores estratégicos para tomada de decisão</p>
      </div>

      {/* Primeira linha: Funcionários Ativos, Taxa de Turnover, Absenteísmo, Avaliações Pendentes */}
      {(canViewFuncionarios || canViewAbsenteismo || canViewAvaliacoes) && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {canViewFuncionarios && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Funcionários Ativos</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.totalFuncionarios}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.admissoesDoMes} admissões este mês
                </p>
              </CardContent>
            </Card>
          )}

          {canViewFuncionarios && (
            <Card 
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => setShowTurnoverModal(true)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Taxa de Turnover</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.taxaTurnover}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stats?.demissoesDoMes} desligamentos este mês
                </p>
              </CardContent>
            </Card>
          )}

          {canViewAbsenteismo && (
            <Card 
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => setShowAbsenteismoModal(true)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Absenteísmo</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats?.taxaAbsenteismo}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {ausenciasDetalhes.length} ausências no mês
                </p>
              </CardContent>
            </Card>
          )}

          {canViewAvaliacoes && (
            <Card 
              className="cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => setShowAvaliacoesModal(true)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avaliações Pendentes</CardTitle>
                <Award className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-500">{stats?.avaliacoesPendentes}</div>
                <p className="text-xs text-muted-foreground mt-1">Clique para ver detalhes</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Segunda linha: Exames Vencendo, Férias Vencendo, Treinamentos Vencendo */}
      {(canViewExames || canViewFerias || canViewTreinamentos) && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {canViewExames && (
            <Card 
              className="border-orange-500/50 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => setShowExamesModal(true)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Exames Vencendo</CardTitle>
                <FileText className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-warning">{stats?.examesVencidos}</div>
                <p className="text-xs text-muted-foreground mt-1">Clique para ver detalhes</p>
              </CardContent>
            </Card>
          )}

          {canViewFerias && (
            <Card 
              className="border-yellow-500/50 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => setShowFeriasModal(true)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Férias Vencendo</CardTitle>
                <Calendar className="h-4 w-4 text-warning" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-warning">{stats?.feriasVencidas}</div>
                <p className="text-xs text-muted-foreground mt-1">Clique para ver detalhes</p>
              </CardContent>
            </Card>
          )}

          {canViewTreinamentos && (
            <Card 
              className="border-purple-500/50 cursor-pointer hover:bg-accent/50 transition-colors"
              onClick={() => setShowTreinamentosModal(true)}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Treinamentos Vencendo</CardTitle>
                <GraduationCap className="h-4 w-4 text-purple-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-500">{stats?.treinamentosVencidos}</div>
                <p className="text-xs text-muted-foreground mt-1">Clique para ver detalhes</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Gráficos e Análises */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Evolução de Funcionários */}
        <Card>
          <CardHeader>
            <CardTitle>Evolução do Quadro</CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ total: { label: "Funcionários", color: "hsl(var(--primary))" } }} className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={evolucaoData}>
                  <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line type="monotone" dataKey="total" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Distribuição por Setor */}
        <Card>
          <CardHeader>
            <CardTitle>Distribuição por Setor</CardTitle>
            <CardDescription>Top 5 setores</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ valor: { label: "Funcionários", color: "hsl(var(--primary))" } }} className="h-[200px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={setorData} layout="vertical">
                  <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis dataKey="nome" type="category" stroke="hsl(var(--muted-foreground))" fontSize={12} width={100} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="valor" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Indicadores Operacionais */}
      <div className="grid gap-6 md:grid-cols-3">
        {canViewProcessosSeletivos && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Processos Seletivos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">{stats?.processosSeletivos}</div>
              <Progress value={stats?.processosSeletivos ? 100 : 0} className="h-2 mb-2" />
              <p className="text-sm text-muted-foreground">Processos em andamento</p>
            </CardContent>
          </Card>
        )}

        {canViewTreinamentos && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5" />
                Treinamentos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">{stats?.treinamentosRealizados}</div>
              <Progress value={(stats?.treinamentosRealizados || 0) * 10} className="h-2 mb-2" />
              <p className="text-sm text-muted-foreground">Realizados este mês</p>
            </CardContent>
          </Card>
        )}

        {canViewAniversariantes && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Aniversariantes
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold mb-2">{stats?.aniversariantes}</div>
              <Progress value={(stats?.aniversariantes || 0) * 5} className="h-2 mb-2" />
              <p className="text-sm text-muted-foreground">Aniversariantes do mês</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Aniversariantes do Mês */}
      {canViewAniversariantes && aniversariantesData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Aniversariantes do Mês
            </CardTitle>
            <CardDescription>Próximos aniversários para celebrar</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {aniversariantesData.map((func) => (
                <div key={func.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{func.nome_completo}</p>
                      <p className="text-sm text-muted-foreground">{func.cargo_atual || 'Cargo não definido'}</p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    {(() => {
                      const [, mes, dia] = func.data_nascimento.split('-');
                      return `${dia}/${mes}`;
                    })()}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal de Turnover */}
      <Dialog open={showTurnoverModal} onOpenChange={setShowTurnoverModal}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Detalhamento - Taxa de Turnover</DialogTitle>
            <DialogDescription>
              Admissões e desligamentos do mês atual
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[500px] pr-4">
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-green-500" />
                  Admissões ({admisoesDetalhes.length})
                </h3>
                {admisoesDetalhes.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead>Data de Admissão</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {admisoesDetalhes.map((func) => (
                        <TableRow key={func.id}>
                          <TableCell>{func.codigo}</TableCell>
                          <TableCell>{func.nome_completo}</TableCell>
                          <TableCell>{func.cargo_atual || '-'}</TableCell>
                          <TableCell>{formatDateForDisplay(func.data_admissao)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhuma admissão no período</p>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                  <TrendingDown className="h-5 w-5 text-red-500" />
                  Desligamentos ({demissoesDetalhes.length})
                </h3>
                {demissoesDetalhes.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Código</TableHead>
                        <TableHead>Nome</TableHead>
                        <TableHead>Cargo</TableHead>
                        <TableHead>Data de Desligamento</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {demissoesDetalhes.map((func) => (
                        <TableRow key={func.id}>
                          <TableCell>{func.codigo}</TableCell>
                          <TableCell>{func.nome_completo}</TableCell>
                          <TableCell>{func.cargo_atual || '-'}</TableCell>
                          <TableCell>{formatDateForDisplay(func.data_demissao)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <p className="text-sm text-muted-foreground">Nenhum desligamento no período</p>
                )}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Modal de Absenteísmo */}
      <Dialog open={showAbsenteismoModal} onOpenChange={setShowAbsenteismoModal}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Detalhamento - Absenteísmo</DialogTitle>
            <DialogDescription>
              Ausências registradas no mês atual
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[500px] pr-4">
            {ausenciasDetalhes.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Data Início</TableHead>
                    <TableHead>Data Fim</TableHead>
                    <TableHead>Dias</TableHead>
                    <TableHead>Justificada</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ausenciasDetalhes.map((ausencia) => (
                    <TableRow key={ausencia.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{ausencia.funcionario_nome || '-'}</div>
                          <div className="text-xs text-muted-foreground">{ausencia.funcionario?.codigo || '-'}</div>
                        </div>
                      </TableCell>
                      <TableCell>{ausencia.tipo_ausencia}</TableCell>
                      <TableCell>{formatDateForDisplay(ausencia.data_inicio)}</TableCell>
                      <TableCell>{formatDateForDisplay(ausencia.data_fim)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{ausencia.dias_ausencia} dia(s)</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={ausencia.justificada ? "default" : "destructive"}>
                          {ausencia.justificada ? 'Sim' : 'Não'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma ausência registrada no período</p>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>


      {/* Modal de ASOs Vencidos */}
      <Dialog open={showExamesModal} onOpenChange={setShowExamesModal}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>ASOs Vencendo</DialogTitle>
            <DialogDescription>
              ASOs vencidos ou que vencem nos próximos 30 dias
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[500px] pr-4">
            {examesDetalhes.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Tipo ASO</TableHead>
                    <TableHead>Data Emissão</TableHead>
                    <TableHead>Data Validade</TableHead>
                    <TableHead>Qtd Exames</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {examesDetalhes.map((aso: any) => (
                    <TableRow key={aso.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{aso.funcionario?.nome_completo || '-'}</div>
                          <div className="text-xs text-muted-foreground">{aso.funcionario?.codigo || '-'}</div>
                        </div>
                      </TableCell>
                      <TableCell>{aso.tipo_aso}</TableCell>
                      <TableCell>{formatDateForDisplay(aso.data_emissao)}</TableCell>
                      <TableCell>
                        <span className={aso.statusCalc === 'Vencido' ? 'text-destructive' : 'text-warning'}>
                          {formatDateForDisplay(aso.data_validade)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{aso.qtd_exames}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={aso.statusCalc === 'Vencido' ? 'destructive' : 'outline'}>
                          {aso.statusCalc}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum ASO vencendo</p>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Modal de Treinamentos Vencidos */}
      <Dialog open={showTreinamentosModal} onOpenChange={setShowTreinamentosModal}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Treinamentos Vencendo</DialogTitle>
            <DialogDescription>
              Treinamentos vencidos ou que vencem nos próximos 30 dias
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[500px] pr-4">
            {treinamentosDetalhes.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Treinamento</TableHead>
                    <TableHead>Data Realização</TableHead>
                    <TableHead>Data Validade</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {treinamentosDetalhes.map((treinamento: any) => (
                    <TableRow key={treinamento.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{treinamento.funcionario?.nome_completo || '-'}</div>
                          <div className="text-xs text-muted-foreground">{treinamento.funcionario?.codigo || '-'}</div>
                        </div>
                      </TableCell>
                      <TableCell>{treinamento.nome_treinamento || '-'}</TableCell>
                      <TableCell>{formatDateForDisplay(treinamento.data_realizacao)}</TableCell>
                      <TableCell>
                        <span className={treinamento.isVencido ? 'text-destructive' : 'text-warning'}>
                          {formatDateForDisplay(treinamento.data_validade)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={treinamento.isVencido ? 'destructive' : 'outline'}>
                          {treinamento.isVencido ? 'Vencido' : 'Vencendo'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhum treinamento vencendo</p>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Modal de Férias Vencidas */}
      <Dialog open={showFeriasModal} onOpenChange={setShowFeriasModal}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Férias Vencendo</DialogTitle>
            <DialogDescription>
              Férias vencidas ou que vencem nos próximos 6 meses
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[500px] pr-4">
            {feriasDetalhes.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Funcionário</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Período Aquisitivo</TableHead>
                    <TableHead>Data Limite</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {feriasDetalhes.map((ferias: any) => (
                    <TableRow key={ferias.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{ferias.funcionario?.nome_completo || '-'}</div>
                          <div className="text-xs text-muted-foreground">{ferias.funcionario?.codigo || '-'}</div>
                        </div>
                      </TableCell>
                      <TableCell>{ferias.funcionario?.cargo_atual || '-'}</TableCell>
                      <TableCell>
                        {ferias.periodo_aquisitivo_inicio && ferias.periodo_aquisitivo_fim 
                          ? `${formatDateForDisplay(ferias.periodo_aquisitivo_inicio)} - ${formatDateForDisplay(ferias.periodo_aquisitivo_fim)}`
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <span className={ferias.status === 'Férias vencidas' ? 'text-destructive' : 'text-warning'}>
                          {formatDateForDisplay(ferias.data_limite)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant={ferias.status === 'Férias vencidas' ? 'destructive' : 'outline'}>
                          {ferias.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma férias vencendo</p>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Modal de Avaliações Pendentes */}
      <Dialog open={showAvaliacoesModal} onOpenChange={setShowAvaliacoesModal}>
        <DialogContent className="max-w-4xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Avaliações Pendentes</DialogTitle>
            <DialogDescription>
              Funcionários que não foram avaliados nos últimos 6 meses
            </DialogDescription>
          </DialogHeader>
          <ScrollArea className="h-[500px] pr-4">
            {avaliacoesDetalhes.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Setor</TableHead>
                    <TableHead>Data Admissão</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {avaliacoesDetalhes.map((func) => (
                    <TableRow key={func.id}>
                      <TableCell>{func.codigo}</TableCell>
                      <TableCell className="font-medium">{func.nome_completo}</TableCell>
                      <TableCell>{func.cargo_atual || '-'}</TableCell>
                      <TableCell>{func.setor_atual || '-'}</TableCell>
                      <TableCell>
                        {formatDateForDisplay(func.data_admissao)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground">Nenhuma avaliação pendente</p>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;