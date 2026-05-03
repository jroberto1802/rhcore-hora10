import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FileText, Filter, CalendarIcon, Eye, Check, ChevronsUpDown } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDateForDisplay } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { type Empresa } from '@/hooks/useUserEmpresas';
import { useUserEmpresas } from '@/hooks/useUserEmpresas';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link } from 'react-router-dom';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface FeriasData {
  id: string;
  funcionario_id: string;
  funcionario_nome: string;
  cargo_atual: string | null;
  data_admissao: string | null;
  periodo_aquisitivo_inicio: string | null;
  periodo_aquisitivo_fim: string | null;
  data_limite: string | null;
  periodos_gozo: Array<{
    data_inicio: string;
    data_fim: string;
  }>;
  dias_adquiridos: number;
  dias_gozo: number;
  status: string;
  empresa_nome?: string;
  ferias_concluidas: boolean;
  previsao: boolean;
}

interface GestaoFeriasProps {
  currentEmpresa: Empresa | null;
  isGroupView?: boolean;
  currentGroupId?: string | null;
}

export const GestaoFerias = ({ currentEmpresa, isGroupView, currentGroupId }: GestaoFeriasProps) => {
  const [feriasData, setFeriasData] = useState<FeriasData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchColaborador, setSearchColaborador] = useState('');
  const [periodoAquisitivo, setPeriodoAquisitivo] = useState<string>('all');
  const [dataLimiteFilter, setDataLimiteFilter] = useState<string>('all');
  const [periodoGozoFilter, setPeriodoGozoFilter] = useState<string>('all');
  const [empresaFilter, setEmpresaFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [showFeriasPrevistas, setShowFeriasPrevistas] = useState(false);
  const [customStartMonth, setCustomStartMonth] = useState<number | null>(null);
  const [customStartYear, setCustomStartYear] = useState<number | null>(null);
  const [customEndMonth, setCustomEndMonth] = useState<number | null>(null);
  const [customEndYear, setCustomEndYear] = useState<number | null>(null);
  const [customDataLimiteStartMonth, setCustomDataLimiteStartMonth] = useState<number | null>(null);
  const [customDataLimiteStartYear, setCustomDataLimiteStartYear] = useState<number | null>(null);
  const [customDataLimiteEndMonth, setCustomDataLimiteEndMonth] = useState<number | null>(null);
  const [customDataLimiteEndYear, setCustomDataLimiteEndYear] = useState<number | null>(null);
  const [customPeriodoGozoStartMonth, setCustomPeriodoGozoStartMonth] = useState<number | null>(null);
  const [customPeriodoGozoStartYear, setCustomPeriodoGozoStartYear] = useState<number | null>(null);
  const [customPeriodoGozoEndMonth, setCustomPeriodoGozoEndMonth] = useState<number | null>(null);
  const [customPeriodoGozoEndYear, setCustomPeriodoGozoEndYear] = useState<number | null>(null);
  const { user } = useAuth();
  const { empresas, loading: empresasLoading } = useUserEmpresas();

  const getDateRangeForPeriod = (period: string, startMonth?: number | null, startYear?: number | null, endMonth?: number | null, endYear?: number | null) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    switch (period) {
      case 'mes-seguinte':
        return {
          start: new Date(currentYear, currentMonth + 1, 1),
          end: new Date(currentYear, currentMonth + 2, 0)
        };
      case 'proximos-3-meses':
        return {
          start: now,
          end: new Date(currentYear, currentMonth + 3, 0)
        };
      case 'ano-anterior':
        return {
          start: new Date(currentYear - 1, 0, 1),
          end: new Date(currentYear - 1, 11, 31)
        };
      case 'ano-atual':
        return {
          start: new Date(currentYear, 0, 1),
          end: new Date(currentYear, 11, 31)
        };
      case 'proximo-ano':
        return {
          start: new Date(currentYear + 1, 0, 1),
          end: new Date(currentYear + 1, 11, 31)
        };
      case 'personalizado':
        const startDate = (startMonth !== null && startYear !== null) 
          ? new Date(startYear, startMonth - 1, 1) 
          : undefined;
        const endDate = (endMonth !== null && endYear !== null) 
          ? new Date(endYear, endMonth, 0) 
          : undefined;
        return {
          start: startDate,
          end: endDate
        };
      default:
        return {
          start: new Date(currentYear, currentMonth + 1, 1),
          end: new Date(currentYear, currentMonth + 2, 0)
        };
    }
  };

  // Função para calcular dias adquiridos baseado no período aquisitivo
  const calcularDiasAdquiridos = (periodoInicio: string | null): number => {
    if (!periodoInicio) return 0;
    
    const inicio = new Date(periodoInicio);
    const hoje = new Date();
    
    // Calcular meses completos desde o início do período aquisitivo
    const diffTime = hoje.getTime() - inicio.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const mesesCompletos = Math.floor(diffDays / 30);
    
    // Limitar a 12 meses (1 ano)
    const mesesLimitados = Math.min(mesesCompletos, 12);
    
    // 2.5 dias por mês com arredondamento para cima, limitado a 30 dias
    return Math.min(Math.ceil(mesesLimitados * 2.5), 30);
  };

  const getStatusFerias = (ferias: any, periodosGozo: any[], diasAdquiridos: number) => {
    // Calcula os dias de gozo total
    const diasGozo = periodosGozo.reduce((total, periodo) => {
      const inicio = new Date(periodo.data_inicio);
      const fim = new Date(periodo.data_fim);
      const diffTime = Math.abs(fim.getTime() - inicio.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return total + diffDays;
    }, 0);

    // LÓGICA IDÊNTICA AO FeriasManager.tsx
    
    // 1. Verifica se as férias estão concluídas
    // Se a flag estiver marcada, retorna true
    if (ferias.ferias_concluidas) {
      return 'Férias concluídas';
    }
    
    // Se não tem flag marcada, verifica pela lógica de períodos
    if (periodosGozo.length > 0 && diasAdquiridos > 0) {
      // Encontrar a data de fim mais recente dos períodos de gozo
      const ultimaDataFim = periodosGozo.reduce((latest, periodo) => {
        const dataFim = new Date(periodo.data_fim);
        return dataFim > latest ? dataFim : latest;
      }, new Date(0));
      
      // Verificar se a data atual é maior que a última data de fim E a soma dos dias é >= dias adquiridos
      if (new Date() > ultimaDataFim && diasGozo >= diasAdquiridos) {
        return 'Férias concluídas';
      }
    }

    // 2. Verifica se as férias estão vencidas
    // Usa periodo_aquisitivo_fim como no FeriasManager, não data_limite
    if (ferias.periodo_aquisitivo_fim) {
      const periodoAquisitivoFim = new Date(ferias.periodo_aquisitivo_fim);
      if (new Date() > periodoAquisitivoFim) {
        return 'Férias vencidas';
      }
    }

    // 3. Caso contrário, está válido
    return 'Válido';
  };

  const fetchFeriasData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Para este relatório, buscamos TODAS as empresas do usuário
      // pois há filtro específico de empresa no relatório
      const empresaIds = empresas.map(emp => emp.id);

      if (empresaIds.length === 0) {
        setFeriasData([]);
        setLoading(false);
        return;
      }

      // Buscar todas as férias das empresas
      let query = supabase
        .from('ferias')
        .select(`
          id,
          funcionario_id,
          periodo_aquisitivo_inicio,
          periodo_aquisitivo_fim,
          data_limite,
          ferias_concluidas,
          previsao,
          empresa_id
        `)
        .in('empresa_id', empresaIds);

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar dados de férias:', error);
        return;
      }

      if (data && data.length > 0) {
        const empresaMap = new Map(empresas.map(emp => [emp.id, emp.fantasia]));
        
        // Buscar dados dos funcionários ATIVOS separadamente usando funcionarios_safe()
        const funcionarioIds = data.map(f => f.funcionario_id);
        const { data: allFuncionarios, error: funcError } = await supabase
          .rpc('funcionarios_safe');

        if (funcError) {
          console.error('Erro ao buscar funcionários:', funcError);
        }

        // Filter to get only the funcionarios we need
        const funcionariosData = (allFuncionarios || [])
          .filter((f: any) => 
            funcionarioIds.includes(f.id) && 
            f.data_demissao === null // Apenas funcionários ativos
          );

        if (!funcionariosData || funcionariosData.length === 0) {
          setFeriasData([]);
          return;
        }

        // Buscar períodos de gozo separadamente COM ORDENAÇÃO
        const feriasIds = data.map(f => f.id);
        const { data: periodosData } = await supabase
          .from('periodos_gozo_ferias')
          .select('ferias_id, data_inicio, data_fim')
          .in('ferias_id', feriasIds)
          .order('data_inicio', { ascending: true });

        const funcionariosMap = new Map(funcionariosData.map(f => [f.id, f]));
        const periodosMap = new Map<string, Array<{data_inicio: string, data_fim: string}>>();
        
        periodosData?.forEach(periodo => {
          if (!periodosMap.has(periodo.ferias_id)) {
            periodosMap.set(periodo.ferias_id, []);
          }
          periodosMap.get(periodo.ferias_id)?.push({
            data_inicio: periodo.data_inicio,
            data_fim: periodo.data_fim
          });
        });

        // Filtrar férias apenas de funcionários ativos
        const feriasAtivos = data.filter(ferias => funcionariosMap.has(ferias.funcionario_id));
        
        const processedData = feriasAtivos.map(ferias => {
          const funcionario = funcionariosMap.get(ferias.funcionario_id);
          const periodosGozo = periodosMap.get(ferias.id) || [];
          const diasGozo = periodosGozo.reduce((total, periodo) => {
            const inicio = new Date(periodo.data_inicio);
            const fim = new Date(periodo.data_fim);
            const diffTime = Math.abs(fim.getTime() - inicio.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
            return total + diffDays;
          }, 0);

          const diasAdquiridos = calcularDiasAdquiridos(ferias.periodo_aquisitivo_inicio);
          const status = getStatusFerias(ferias, periodosGozo, diasAdquiridos);

          return {
            id: ferias.id,
            funcionario_id: ferias.funcionario_id,
            funcionario_nome: funcionario?.nome_completo || '',
            cargo_atual: funcionario?.cargo_atual || null,
            data_admissao: funcionario?.data_admissao || null,
            periodo_aquisitivo_inicio: ferias.periodo_aquisitivo_inicio,
            periodo_aquisitivo_fim: ferias.periodo_aquisitivo_fim,
            data_limite: ferias.data_limite,
            periodos_gozo: periodosGozo,
            dias_adquiridos: diasAdquiridos,
            dias_gozo: diasGozo,
            status,
            empresa_nome: empresaMap.get(funcionario?.empresa_id || ''),
            ferias_concluidas: ferias.ferias_concluidas,
            previsao: ferias.previsao ?? false
          };
        });

        setFeriasData(processedData);
      } else {
        setFeriasData([]);
      }
    } catch (error) {
      console.error('Erro ao carregar dados de férias:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    if (empresasLoading) return;
    fetchFeriasData();
  }, [user, empresasLoading, empresas, isGroupView, currentGroupId]);

  const filteredData = useMemo(() => {
    return feriasData.filter(item => {
      const matchesColaborador = !searchColaborador || 
        item.funcionario_nome.toLowerCase().includes(searchColaborador.toLowerCase());
      
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(item.status);
      
      const matchesEmpresa = empresaFilter === 'all' || item.empresa_nome === empresaFilter;
      
      // Filtro por período aquisitivo (data final)
      let matchesPeriodoAquisitivo = true;
      if (periodoAquisitivo !== 'all') {
        const dateRange = getDateRangeForPeriod(periodoAquisitivo, customStartMonth, customStartYear, customEndMonth, customEndYear);
        if (dateRange.start && dateRange.end && item.periodo_aquisitivo_fim) {
          const dataFimAquisitivo = new Date(item.periodo_aquisitivo_fim);
          matchesPeriodoAquisitivo = dataFimAquisitivo >= dateRange.start && dataFimAquisitivo <= dateRange.end;
        }
      }
      
      // Filtro por data limite
      let matchesDataLimite = true;
      if (dataLimiteFilter !== 'all') {
        const dateRange = getDateRangeForPeriod(dataLimiteFilter, customDataLimiteStartMonth, customDataLimiteStartYear, customDataLimiteEndMonth, customDataLimiteEndYear);
        if (dateRange.start && dateRange.end && item.data_limite) {
          const dataLimite = new Date(item.data_limite);
          matchesDataLimite = dataLimite >= dateRange.start && dataLimite <= dateRange.end;
        }
      }
      
      // Filtro por período de gozo (data final)
      let matchesPeriodoGozo = true;
      if (periodoGozoFilter !== 'all') {
        const dateRange = getDateRangeForPeriod(periodoGozoFilter, customPeriodoGozoStartMonth, customPeriodoGozoStartYear, customPeriodoGozoEndMonth, customPeriodoGozoEndYear);
        if (dateRange.start && dateRange.end) {
          if (item.periodos_gozo.length > 0) {
            const ultimaDataFimGozo = item.periodos_gozo
              .map(p => new Date(p.data_fim))
              .sort((a, b) => b.getTime() - a.getTime())[0];
            matchesPeriodoGozo = ultimaDataFimGozo >= dateRange.start && ultimaDataFimGozo <= dateRange.end;
          } else {
            // Se não há períodos de gozo, não deve aparecer no filtro de período de gozo
            matchesPeriodoGozo = false;
          }
        }
      }
      
      const matchesPrevisao = !showFeriasPrevistas || item.previsao === true;
      
      return matchesColaborador && matchesStatus && matchesEmpresa && 
             matchesPeriodoAquisitivo && matchesDataLimite && matchesPeriodoGozo && matchesPrevisao;
    });
   }, [feriasData, searchColaborador, statusFilter, empresaFilter, periodoAquisitivo, 
      dataLimiteFilter, periodoGozoFilter, showFeriasPrevistas, customStartMonth, customStartYear, customEndMonth, customEndYear,
      customDataLimiteStartMonth, customDataLimiteStartYear, customDataLimiteEndMonth, customDataLimiteEndYear,
      customPeriodoGozoStartMonth, customPeriodoGozoStartYear, customPeriodoGozoEndMonth, customPeriodoGozoEndYear]);

  const exportToPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text('Relatório de Gestão de Férias', 20, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 30);

    const tableData = filteredData.map(item => [
      item.funcionario_nome,
      item.cargo_atual || '',
      item.data_admissao ? formatDateForDisplay(item.data_admissao) : '',
      `${item.periodo_aquisitivo_inicio ? formatDateForDisplay(item.periodo_aquisitivo_inicio) : ''} - ${item.periodo_aquisitivo_fim ? formatDateForDisplay(item.periodo_aquisitivo_fim) : ''}`,
      item.data_limite ? formatDateForDisplay(item.data_limite) : '',
      item.periodos_gozo.map(p => `${formatDateForDisplay(p.data_inicio)} a ${formatDateForDisplay(p.data_fim)}`).join(', '),
      item.dias_adquiridos.toString(),
      item.dias_gozo.toString(),
      item.status
    ]);

    autoTable(doc, {
      head: [['Funcionário', 'Cargo', 'Admissão', 'Período Aquisitivo', 'Data Limite', 'Períodos de Gozo', 'Dias Adquiridos', 'Dias de Gozo', 'Status']],
      body: tableData,
      startY: 40,
      styles: { fontSize: 7 },
      columnStyles: {
        0: { cellWidth: 22 },
        1: { cellWidth: 18 },
        2: { cellWidth: 18 },
        3: { cellWidth: 28 },
        4: { cellWidth: 18 },
        5: { cellWidth: 32 },
        6: { cellWidth: 14 },
        7: { cellWidth: 14 },
        8: { cellWidth: 18 }
      }
    });

    doc.save('gestao-ferias.pdf');
  };

  const exportToExcel = () => {
    const worksheetData = filteredData.map(item => ({
      'Funcionário': item.funcionario_nome,
      'Cargo': item.cargo_atual || '',
      'Data de Admissão': item.data_admissao ? formatDateForDisplay(item.data_admissao) : '',
      'Período Aquisitivo Início': item.periodo_aquisitivo_inicio ? formatDateForDisplay(item.periodo_aquisitivo_inicio) : '',
      'Período Aquisitivo Fim': item.periodo_aquisitivo_fim ? formatDateForDisplay(item.periodo_aquisitivo_fim) : '',
      'Data Limite': item.data_limite ? formatDateForDisplay(item.data_limite) : '',
      'Períodos de Gozo': item.periodos_gozo.map(p => `${formatDateForDisplay(p.data_inicio)} a ${formatDateForDisplay(p.data_fim)}`).join(', '),
      'Dias Adquiridos': item.dias_adquiridos,
      'Dias de Gozo': item.dias_gozo,
      'Status': item.status,
      ...(isGroupView && { 'Empresa': item.empresa_nome || '' })
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Gestão de Férias');
    XLSX.writeFile(workbook, 'gestao-ferias.xlsx');
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case 'Válido':
        return 'bg-blue-500 hover:bg-blue-600 text-white';
      case 'Férias vencidas':
        return 'bg-red-500 hover:bg-red-600 text-white';
      case 'Férias concluídas':
        return 'bg-green-500 hover:bg-green-600 text-white';
      default:
        return 'bg-gray-500 hover:bg-gray-600 text-white';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gestão de Férias
          </CardTitle>
          <div className="flex gap-2">
            <Button 
              onClick={() => setShowFeriasPrevistas(!showFeriasPrevistas)} 
              variant={showFeriasPrevistas ? "default" : "outline"} 
              size="sm"
            >
              <CalendarIcon className="h-4 w-4 mr-2" />
              Férias Previstas
            </Button>
            <Button onClick={exportToPDF} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              PDF
            </Button>
            <Button onClick={exportToExcel} variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Excel
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4 p-4 bg-muted/50 rounded-lg">
            <div className="space-y-2">
              <label className="text-sm font-medium">Colaborador</label>
              <Input
                placeholder="Buscar colaborador..."
                value={searchColaborador}
                onChange={(e) => setSearchColaborador(e.target.value)}
              />
            </div>

            {(isGroupView || empresas.length > 1) && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Empresa</label>
                <Select value={empresaFilter} onValueChange={setEmpresaFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas as empresas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as empresas</SelectItem>
                    {empresas
                      .filter(emp => isGroupView ? emp.grupo_empresarial?.id === currentGroupId : true)
                      .map(empresa => (
                        <SelectItem key={empresa.id} value={empresa.fantasia}>
                          {empresa.fantasia}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Período Aquisitivo</label>
              <Select value={periodoAquisitivo} onValueChange={setPeriodoAquisitivo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="mes-seguinte">Mês seguinte</SelectItem>
                  <SelectItem value="proximos-3-meses">Próximos 3 meses</SelectItem>
                  <SelectItem value="ano-anterior">Ano anterior</SelectItem>
                  <SelectItem value="ano-atual">Ano atual</SelectItem>
                  <SelectItem value="proximo-ano">Próximo ano</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Data Limite</label>
              <Select value={dataLimiteFilter} onValueChange={setDataLimiteFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="mes-seguinte">Mês seguinte</SelectItem>
                  <SelectItem value="proximos-3-meses">Próximos 3 meses</SelectItem>
                  <SelectItem value="ano-anterior">Ano anterior</SelectItem>
                  <SelectItem value="ano-atual">Ano atual</SelectItem>
                  <SelectItem value="proximo-ano">Próximo ano</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Período de Gozo</label>
              <Select value={periodoGozoFilter} onValueChange={setPeriodoGozoFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="mes-seguinte">Mês seguinte</SelectItem>
                  <SelectItem value="proximos-3-meses">Próximos 3 meses</SelectItem>
                  <SelectItem value="ano-anterior">Ano anterior</SelectItem>
                  <SelectItem value="ano-atual">Ano atual</SelectItem>
                  <SelectItem value="proximo-ano">Próximo ano</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className="w-full justify-between h-9 bg-background"
                  >
                    <span className="text-sm">
                      {statusFilter.length === 0
                        ? "Selecionar status..."
                        : `${statusFilter.length} selecionado${statusFilter.length > 1 ? 's' : ''}`}
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0 bg-background z-50" align="start">
                  <Command className="bg-background">
                    <CommandList>
                      <CommandGroup>
                        {['Válido', 'Férias vencidas', 'Férias concluídas'].map((status) => {
                          const isSelected = statusFilter.includes(status);
                          return (
                            <CommandItem
                              key={status}
                              onSelect={() => {
                                if (isSelected) {
                                  setStatusFilter(statusFilter.filter(s => s !== status));
                                } else {
                                  setStatusFilter([...statusFilter, status]);
                                }
                              }}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center w-full">
                                {isSelected ? (
                                  <Check className="mr-2 h-4 w-4" />
                                ) : (
                                  <div className="mr-2 h-4 w-4" />
                                )}
                                <span>{status}</span>
                              </div>
                            </CommandItem>
                          );
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Campos de data personalizada */}
            {(periodoAquisitivo === 'personalizado' || dataLimiteFilter === 'personalizado' || periodoGozoFilter === 'personalizado') && (
              <div className="col-span-full">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg bg-background">
                  {periodoAquisitivo === 'personalizado' && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">Período Aquisitivo Personalizado</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Mês Início</label>
                          <Select value={customStartMonth?.toString() || ""} onValueChange={(value) => setCustomStartMonth(value ? parseInt(value) : null)}>
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Mês" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 12 }, (_, i) => (
                                <SelectItem key={i + 1} value={(i + 1).toString()}>
                                  {new Date(2024, i).toLocaleDateString('pt-BR', { month: 'long' })}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Ano Início</label>
                          <Select value={customStartYear?.toString() || ""} onValueChange={(value) => setCustomStartYear(value ? parseInt(value) : null)}>
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Ano" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 10 }, (_, i) => {
                                const year = new Date().getFullYear() - 5 + i;
                                return (
                                  <SelectItem key={year} value={year.toString()}>
                                    {year}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Mês Fim</label>
                          <Select value={customEndMonth?.toString() || ""} onValueChange={(value) => setCustomEndMonth(value ? parseInt(value) : null)}>
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Mês" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 12 }, (_, i) => (
                                <SelectItem key={i + 1} value={(i + 1).toString()}>
                                  {new Date(2024, i).toLocaleDateString('pt-BR', { month: 'long' })}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Ano Fim</label>
                          <Select value={customEndYear?.toString() || ""} onValueChange={(value) => setCustomEndYear(value ? parseInt(value) : null)}>
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Ano" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 10 }, (_, i) => {
                                const year = new Date().getFullYear() - 5 + i;
                                return (
                                  <SelectItem key={year} value={year.toString()}>
                                    {year}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}

                  {dataLimiteFilter === 'personalizado' && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">Data Limite Personalizada</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Mês Início</label>
                          <Select value={customDataLimiteStartMonth?.toString() || ""} onValueChange={(value) => setCustomDataLimiteStartMonth(value ? parseInt(value) : null)}>
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Mês" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 12 }, (_, i) => (
                                <SelectItem key={i + 1} value={(i + 1).toString()}>
                                  {new Date(2024, i).toLocaleDateString('pt-BR', { month: 'long' })}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Ano Início</label>
                          <Select value={customDataLimiteStartYear?.toString() || ""} onValueChange={(value) => setCustomDataLimiteStartYear(value ? parseInt(value) : null)}>
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Ano" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 10 }, (_, i) => {
                                const year = new Date().getFullYear() - 5 + i;
                                return (
                                  <SelectItem key={year} value={year.toString()}>
                                    {year}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Mês Fim</label>
                          <Select value={customDataLimiteEndMonth?.toString() || ""} onValueChange={(value) => setCustomDataLimiteEndMonth(value ? parseInt(value) : null)}>
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Mês" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 12 }, (_, i) => (
                                <SelectItem key={i + 1} value={(i + 1).toString()}>
                                  {new Date(2024, i).toLocaleDateString('pt-BR', { month: 'long' })}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Ano Fim</label>
                          <Select value={customDataLimiteEndYear?.toString() || ""} onValueChange={(value) => setCustomDataLimiteEndYear(value ? parseInt(value) : null)}>
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Ano" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 10 }, (_, i) => {
                                const year = new Date().getFullYear() - 5 + i;
                                return (
                                  <SelectItem key={year} value={year.toString()}>
                                    {year}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}

                  {periodoGozoFilter === 'personalizado' && (
                    <div className="space-y-4">
                      <h4 className="text-sm font-medium">Período de Gozo Personalizado</h4>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Mês Início</label>
                          <Select value={customPeriodoGozoStartMonth?.toString() || ""} onValueChange={(value) => setCustomPeriodoGozoStartMonth(value ? parseInt(value) : null)}>
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Mês" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 12 }, (_, i) => (
                                <SelectItem key={i + 1} value={(i + 1).toString()}>
                                  {new Date(2024, i).toLocaleDateString('pt-BR', { month: 'long' })}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Ano Início</label>
                          <Select value={customPeriodoGozoStartYear?.toString() || ""} onValueChange={(value) => setCustomPeriodoGozoStartYear(value ? parseInt(value) : null)}>
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Ano" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 10 }, (_, i) => {
                                const year = new Date().getFullYear() - 5 + i;
                                return (
                                  <SelectItem key={year} value={year.toString()}>
                                    {year}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Mês Fim</label>
                          <Select value={customPeriodoGozoEndMonth?.toString() || ""} onValueChange={(value) => setCustomPeriodoGozoEndMonth(value ? parseInt(value) : null)}>
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Mês" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 12 }, (_, i) => (
                                <SelectItem key={i + 1} value={(i + 1).toString()}>
                                  {new Date(2024, i).toLocaleDateString('pt-BR', { month: 'long' })}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-xs text-muted-foreground">Ano Fim</label>
                          <Select value={customPeriodoGozoEndYear?.toString() || ""} onValueChange={(value) => setCustomPeriodoGozoEndYear(value ? parseInt(value) : null)}>
                            <SelectTrigger className="h-8">
                              <SelectValue placeholder="Ano" />
                            </SelectTrigger>
                            <SelectContent>
                              {Array.from({ length: 10 }, (_, i) => {
                                const year = new Date().getFullYear() - 5 + i;
                                return (
                                  <SelectItem key={year} value={year.toString()}>
                                    {year}
                                  </SelectItem>
                                );
                              })}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Resumo */}
          <div className="text-sm text-muted-foreground">
            Exibindo {filteredData.length} de {feriasData.length} registros
          </div>

          {/* Tabela */}
          <ScrollArea className="h-[600px] w-full">
            <div className="rounded-md border">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Data de Admissão</TableHead>
                  <TableHead>Período Aquisitivo</TableHead>
                  <TableHead>Data Limite</TableHead>
                  <TableHead>Períodos de Gozo</TableHead>
                  <TableHead>Dias Adquiridos</TableHead>
                  <TableHead>Dias de Gozo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                  {isGroupView && <TableHead>Empresa</TableHead>}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell 
                      colSpan={isGroupView ? 11 : 10} 
                      className="h-24 text-center text-muted-foreground"
                    >
                      Nenhum registro encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">{item.funcionario_nome}</TableCell>
                      <TableCell>{item.cargo_atual || '-'}</TableCell>
                      <TableCell>
                        {item.data_admissao ? formatDateForDisplay(item.data_admissao) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="whitespace-nowrap">
                          {item.periodo_aquisitivo_inicio && item.periodo_aquisitivo_fim
                            ? `${formatDateForDisplay(item.periodo_aquisitivo_inicio)} - ${formatDateForDisplay(item.periodo_aquisitivo_fim)}`
                            : '-'
                          }
                        </div>
                      </TableCell>
                      <TableCell>
                        {item.data_limite ? formatDateForDisplay(item.data_limite) : '-'}
                      </TableCell>
                      <TableCell>
                        <div className="max-w-xs">
                          {item.periodos_gozo.length > 0 ? (
                            item.periodos_gozo.map((periodo, index) => (
                              <div key={index} className="text-xs whitespace-nowrap">
                                {formatDateForDisplay(periodo.data_inicio)} a {formatDateForDisplay(periodo.data_fim)}
                              </div>
                            ))
                          ) : (
                            '-'
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="whitespace-nowrap">
                          {item.dias_adquiridos} dias
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="whitespace-nowrap">
                          {item.dias_gozo} dias
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`whitespace-nowrap ${getStatusBadgeColor(item.status)}`}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          asChild
                        >
                          <Link to={`/funcionarios/${item.funcionario_id}?tab=ferias`}>
                            <Eye className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                      {isGroupView && (
                        <TableCell>{item.empresa_nome || '-'}</TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
              </Table>
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
};