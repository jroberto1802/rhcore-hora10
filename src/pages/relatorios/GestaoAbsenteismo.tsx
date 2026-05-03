import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FileText, X, CalendarDays, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { formatDateForDisplay } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { type Empresa } from '@/hooks/useUserEmpresas';
import { TIPOS_AUSENCIA } from '@/components/AusenciasManager';

interface Ausencia {
  id: string;
  funcionario_id: string;
  funcionario_nome: string;
  funcionario_demitido: boolean;
  tipo_ausencia: string;
  data_inicio: string;
  data_fim: string | null;
  justificada: boolean;
  atestado_medico: boolean;
  observacoes: string | null;
  dias_ausencia: number;
}

interface GestaoAbsenteismoProps {
  currentEmpresa: Empresa | null;
  isGroupView?: boolean;
  currentGroupId?: string | null;
}

export const GestaoAbsenteismo = ({ 
  currentEmpresa, 
  isGroupView, 
  currentGroupId 
}: GestaoAbsenteismoProps) => {
  const [ausencias, setAusencias] = useState<Ausencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [nomeFuncionario, setNomeFuncionario] = useState('');
  const [tipoAusencia, setTipoAusencia] = useState('all');
  const [periodoFilter, setPeriodoFilter] = useState('mes-atual');
  const [customStartMonth, setCustomStartMonth] = useState<number | null>(null);
  const [customStartYear, setCustomStartYear] = useState<number | null>(null);
  const [customEndMonth, setCustomEndMonth] = useState<number | null>(null);
  const [customEndYear, setCustomEndYear] = useState<number | null>(null);
  const [justificadaFilter, setJustificadaFilter] = useState('all');
  const [statusFuncionarioFilter, setStatusFuncionarioFilter] = useState('todos');
  
  const { user } = useAuth();
  const navigate = useNavigate();

  const calculateDaysAbsence = (dataInicio: string, dataFim: string | null): number => {
    const inicio = new Date(dataInicio);
    const fim = dataFim ? new Date(dataFim) : new Date();
    const diffTime = Math.abs(fim.getTime() - inicio.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 para incluir o dia inicial
    return diffDays;
  };

  const loadAusencias = async () => {
    if (!user || !currentEmpresa) return;

    try {
      setLoading(true);
      
      const { data: ausenciasData, error: ausError } = await supabase
        .from('ausencias')
        .select(`
          id,
          funcionario_id,
          tipo_ausencia,
          data_inicio,
          data_fim,
          justificada,
          atestado_medico,
          observacoes
        `)
        .eq('empresa_id', currentEmpresa.id)
        .order('data_inicio', { ascending: false });

      if (ausError) throw ausError;

      if (ausenciasData && ausenciasData.length > 0) {
        const funcionarioIds = [...new Set(ausenciasData.map(a => a.funcionario_id))];
        
        const { data: funcionariosData } = await supabase
          .rpc('funcionarios_safe')
          .in('id', funcionarioIds);

        const funcionariosMap = new Map(funcionariosData?.map(f => [f.id, { nome: f.nome_completo, demitido: !!f.data_demissao }]) || []);

        const processedAusencias = ausenciasData.map(aus => {
          const funcData = funcionariosMap.get(aus.funcionario_id);
          return {
            ...aus,
            funcionario_nome: funcData?.nome || 'Não encontrado',
            funcionario_demitido: funcData?.demitido || false,
            dias_ausencia: calculateDaysAbsence(aus.data_inicio, aus.data_fim)
          };
        });

        setAusencias(processedAusencias);
      } else {
        setAusencias([]);
      }
    } catch (error) {
      console.error('Erro ao carregar ausências:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAusencias();
  }, [user, currentEmpresa]);

  const getDateRangeFromPeriodo = () => {
    const hoje = new Date();
    let inicio: Date | undefined;
    let fim: Date | undefined;

    switch (periodoFilter) {
      case 'mes-atual':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
        fim = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
        break;
      case 'mes-anterior':
        inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
        fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
        break;
      case 'personalizado':
        inicio = (customStartMonth !== null && customStartYear !== null) 
          ? new Date(customStartYear, customStartMonth - 1, 1) 
          : undefined;
        fim = (customEndMonth !== null && customEndYear !== null) 
          ? new Date(customEndYear, customEndMonth, 0) 
          : undefined;
        break;
      default:
        return null;
    }

    return { inicio, fim };
  };

  const filteredAusencias = useMemo(() => {
    return ausencias.filter(aus => {
      const matchesNome = !nomeFuncionario || 
        aus.funcionario_nome.toLowerCase().includes(nomeFuncionario.toLowerCase());
      
      const matchesTipo = tipoAusencia === 'all' || aus.tipo_ausencia === tipoAusencia;
      const matchesJustificada = justificadaFilter === 'all' || 
        (justificadaFilter === 'sim' && aus.justificada) ||
        (justificadaFilter === 'nao' && !aus.justificada);
      
      const matchesStatus = statusFuncionarioFilter === 'todos' ||
        (statusFuncionarioFilter === 'ativo' && !aus.funcionario_demitido) ||
        (statusFuncionarioFilter === 'desligado' && aus.funcionario_demitido);
      
      let matchesPeriodo = true;
      const dateRange = getDateRangeFromPeriodo();
      if (dateRange && dateRange.inicio && dateRange.fim) {
        const dataInicio = new Date(aus.data_inicio);
        matchesPeriodo = dataInicio >= dateRange.inicio && dataInicio <= dateRange.fim;
      }
      
      return matchesNome && matchesTipo && matchesJustificada && matchesStatus && matchesPeriodo;
    });
  }, [ausencias, nomeFuncionario, tipoAusencia, justificadaFilter, statusFuncionarioFilter, periodoFilter, customStartMonth, customStartYear, customEndMonth, customEndYear]);

  const clearFilters = () => {
    setNomeFuncionario('');
    setTipoAusencia('all');
    setPeriodoFilter('mes-atual');
    setCustomStartMonth(null);
    setCustomStartYear(null);
    setCustomEndMonth(null);
    setCustomEndYear(null);
    setJustificadaFilter('all');
    setStatusFuncionarioFilter('todos');
  };

  const totalDiasAusencia = useMemo(() => {
    return filteredAusencias.reduce((sum, aus) => sum + aus.dias_ausencia, 0);
  }, [filteredAusencias]);

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('Relatório de Gestão de Absenteísmo', 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);

    const tableData = filteredAusencias.map(aus => [
      aus.funcionario_nome,
      aus.tipo_ausencia,
      formatDateForDisplay(aus.data_inicio),
      aus.data_fim ? formatDateForDisplay(aus.data_fim) : 'Em andamento',
      aus.dias_ausencia.toString(),
      aus.justificada ? 'Sim' : 'Não',
      aus.observacoes || '-'
    ]);

    autoTable(doc, {
      head: [['Funcionário', 'Tipo', 'Data Início', 'Data Fim', 'Dias', 'Justificada', 'Observações']],
      body: tableData,
      startY: 40,
      styles: { fontSize: 8 }
    });

    doc.save('gestao-absenteismo.pdf');
  };

  const exportToExcel = () => {
    const worksheetData = filteredAusencias.map(aus => ({
      'Funcionário': aus.funcionario_nome,
      'Tipo de Ausência': aus.tipo_ausencia,
      'Data Início': formatDateForDisplay(aus.data_inicio),
      'Data Fim': aus.data_fim ? formatDateForDisplay(aus.data_fim) : 'Em andamento',
      'Dias de Ausência': aus.dias_ausencia,
      'Justificada': aus.justificada ? 'Sim' : 'Não',
      'Observações': aus.observacoes || ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Absenteísmo');
    XLSX.writeFile(workbook, 'gestao-absenteismo.xlsx');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <CalendarDays className="h-5 w-5" />
              Gestão de Absenteísmo
            </CardTitle>
            <div className="flex gap-2">
              <Button onClick={exportToPDF} variant="outline" size="sm">
                <FileText className="h-4 w-4 mr-2" />
                Exportar PDF
              </Button>
              <Button onClick={exportToExcel} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            <div className="space-y-1.5">
              <Label htmlFor="nomeFuncionario" className="text-xs font-medium">
                Nome do Funcionário
              </Label>
              <Input
                id="nomeFuncionario"
                placeholder="Buscar..."
                value={nomeFuncionario}
                onChange={(e) => setNomeFuncionario(e.target.value)}
                className="h-9"
              />
            </div>
            
            <div className="space-y-1.5">
              <Label htmlFor="tipoAusencia" className="text-xs font-medium">
                Tipo de Ausência
              </Label>
              <Select value={tipoAusencia} onValueChange={setTipoAusencia}>
                <SelectTrigger id="tipoAusencia" className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {TIPOS_AUSENCIA.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>
                      {tipo}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="periodo" className="text-xs font-medium">
                Período
              </Label>
              <Select value={periodoFilter} onValueChange={setPeriodoFilter}>
                <SelectTrigger id="periodo" className="h-9">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mes-atual">Mês Atual</SelectItem>
                  <SelectItem value="mes-anterior">Mês Anterior</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="justificada" className="text-xs font-medium">
                Justificada
              </Label>
              <Select value={justificadaFilter} onValueChange={setJustificadaFilter}>
                <SelectTrigger id="justificada" className="h-9">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="sim">Sim</SelectItem>
                  <SelectItem value="nao">Não</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="statusFuncionario" className="text-xs font-medium">
                Status Funcionário
              </Label>
              <Select value={statusFuncionarioFilter} onValueChange={setStatusFuncionarioFilter}>
                <SelectTrigger id="statusFuncionario" className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="ativo">Ativo</SelectItem>
                  <SelectItem value="desligado">Desligado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Campos de Período Personalizado */}
          {periodoFilter === 'personalizado' && (
            <div className="col-span-full mb-6">
              <div className="grid grid-cols-1 md:grid-cols-1 gap-4 p-4 border rounded-lg bg-background">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Período Personalizado</h4>
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
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-muted-foreground">
              Exibindo {filteredAusencias.length} de {ausencias.length} ausências
              <span className="ml-4 font-semibold">
                Total de dias: {totalDiasAusencia}
              </span>
            </div>
            <Button onClick={clearFilters} variant="outline" size="sm">
              <X className="h-4 w-4 mr-2" />
              Limpar filtros
            </Button>
          </div>

          {/* Tabela */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Tipo de Ausência</TableHead>
                  <TableHead>Data Início</TableHead>
                  <TableHead>Data Fim</TableHead>
                  <TableHead>Dias</TableHead>
                  <TableHead>Justificada</TableHead>
                  <TableHead>Observações</TableHead>
                  <TableHead className="w-[100px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAusencias.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Nenhuma ausência encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAusencias.map((aus) => (
                    <TableRow key={aus.id}>
                      <TableCell className="font-medium">{aus.funcionario_nome}</TableCell>
                      <TableCell>{aus.tipo_ausencia}</TableCell>
                      <TableCell>{formatDateForDisplay(aus.data_inicio)}</TableCell>
                      <TableCell>
                        {aus.data_fim ? formatDateForDisplay(aus.data_fim) : (
                          <Badge variant="outline">Em andamento</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{aus.dias_ausencia}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={aus.justificada ? 'default' : 'destructive'}>
                          {aus.justificada ? 'Sim' : 'Não'}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {aus.observacoes || '-'}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/funcionarios/${aus.funcionario_id}?tab=ausencias`)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
