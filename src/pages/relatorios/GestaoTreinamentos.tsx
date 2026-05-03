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
import { Download, FileText, Eye, Check, ChevronsUpDown } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { formatDateForDisplay } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { type Empresa } from '@/hooks/useUserEmpresas';
import { useUserEmpresas } from '@/hooks/useUserEmpresas';
import { Link } from 'react-router-dom';

interface TreinamentoData {
  id: string;
  funcionario_id: string;
  funcionario_nome: string;
  cargo_atual: string | null;
  nome_treinamento: string;
  instrutor: string | null;
  norma: string | null;
  data_realizacao: string | null;
  data_validade: string | null;
  carga_horaria: number | null;
  observacoes: string | null;
  empresa_id: string;
  empresa_nome?: string;
  status: 'válido' | 'vencendo' | 'vencido' | 'renovado';
}

interface GestaoTreinamentosProps {
  currentEmpresa: Empresa | null;
  isGroupView?: boolean;
  currentGroupId?: string | null;
}

export const GestaoTreinamentos = ({ currentEmpresa, isGroupView, currentGroupId }: GestaoTreinamentosProps) => {
  const [treinamentosData, setTreinamentosData] = useState<TreinamentoData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchColaborador, setSearchColaborador] = useState('');
  const [searchTreinamento, setSearchTreinamento] = useState('');
  const [instrutorFilter, setInstrutorFilter] = useState<string>('all');
  
  const [dataRealizacaoFilter, setDataRealizacaoFilter] = useState<string>('all');
  const [empresaFilter, setEmpresaFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [validadeFilter, setValidadeFilter] = useState<string>('all');
  const [validadeStartDate, setValidadeStartDate] = useState<string>('');
  const [validadeEndDate, setValidadeEndDate] = useState<string>('');
  const [customStartMonth, setCustomStartMonth] = useState<number | null>(null);
  const [customStartYear, setCustomStartYear] = useState<number | null>(null);
  const [customEndMonth, setCustomEndMonth] = useState<number | null>(null);
  const [customEndYear, setCustomEndYear] = useState<number | null>(null);
  const { user } = useAuth();
  const { empresas, loading: empresasLoading } = useUserEmpresas();

  const getDateRangeForPeriod = (period: string, startMonth?: number | null, startYear?: number | null, endMonth?: number | null, endYear?: number | null) => {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    switch (period) {
      case 'mes-atual':
        return {
          start: new Date(currentYear, currentMonth, 1),
          end: new Date(currentYear, currentMonth + 1, 0)
        };
      case 'ano-atual':
        return {
          start: new Date(currentYear, 0, 1),
          end: new Date(currentYear, 11, 31)
        };
      case 'ano-anterior':
        return {
          start: new Date(currentYear - 1, 0, 1),
          end: new Date(currentYear - 1, 11, 31)
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
          start: undefined,
          end: undefined
        };
    }
  };

  const fetchTreinamentosData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      const empresaIds = empresas.map(emp => emp.id);

      if (empresaIds.length === 0) {
        setTreinamentosData([]);
        setLoading(false);
        return;
      }

      // Buscar todos os treinamentos das empresas (nova tabela unificada)
      let query = supabase
        .from('treinamentos_funcionario')
        .select(`
          id,
          funcionario_id,
          nome_treinamento,
          instrutor,
          norma,
          data_realizacao,
          data_validade,
          carga_horaria,
          observacoes,
          empresa_id
        `)
        .in('empresa_id', empresaIds);

      const { data, error } = await query;

      if (error) {
        console.error('Erro ao buscar dados de treinamentos:', error);
        return;
      }

      if (data && data.length > 0) {
        const empresaMap = new Map(empresas.map(emp => [emp.id, emp.fantasia]));
        
        // Buscar dados dos funcionários ATIVOS separadamente usando funcionarios_safe()
        const funcionarioIds = data.map(t => t.funcionario_id);
        const { data: allFuncionarios, error: funcError } = await supabase
          .rpc('funcionarios_safe');

        if (funcError) {
          console.error('Erro ao buscar funcionários:', funcError);
        }

        // Filtrar apenas os funcionários que precisamos e que estão ativos
        const funcionariosData = (allFuncionarios || [])
          .filter((f: any) => 
            funcionarioIds.includes(f.id) && 
            f.data_demissao === null // Apenas funcionários ativos
          );

        if (!funcionariosData || funcionariosData.length === 0) {
          setTreinamentosData([]);
          return;
        }

        const funcionariosMap = new Map(funcionariosData.map(f => [f.id, f]));

        // Filtrar treinamentos apenas de funcionários ativos
        const treinamentosAtivos = data.filter(treinamento => funcionariosMap.has(treinamento.funcionario_id));
        
        const processedData = treinamentosAtivos.map(treinamento => {
          const funcionario = funcionariosMap.get(treinamento.funcionario_id);

          // Calcular status baseado em data_validade
          let status: 'válido' | 'vencendo' | 'vencido' | 'renovado' = 'válido';
          if (treinamento.data_validade) {
            const dataValidade = new Date(treinamento.data_validade);
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            const diffTime = dataValidade.getTime() - hoje.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays < 0) {
              status = 'vencido';
            } else if (diffDays <= 30) {
              status = 'vencendo';
            }
          }

          return {
            id: treinamento.id,
            funcionario_id: treinamento.funcionario_id,
            funcionario_nome: funcionario?.nome_completo || '',
            cargo_atual: funcionario?.cargo_atual || null,
            nome_treinamento: treinamento.nome_treinamento,
            instrutor: treinamento.instrutor,
            norma: treinamento.norma,
            data_realizacao: treinamento.data_realizacao,
            data_validade: treinamento.data_validade,
            carga_horaria: treinamento.carga_horaria,
            observacoes: treinamento.observacoes,
            empresa_id: treinamento.empresa_id,
            empresa_nome: empresaMap.get(treinamento.empresa_id),
            status
          };
        });

        setTreinamentosData(processedData);
      } else {
        setTreinamentosData([]);
      }
    } catch (error) {
      console.error('Erro ao carregar dados de treinamentos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    if (empresasLoading) return;
    fetchTreinamentosData();
  }, [user, empresasLoading, empresas, isGroupView, currentGroupId]);

  const uniqueInstrutores = useMemo(() => {
    return Array.from(new Set(treinamentosData.map(t => t.instrutor).filter(Boolean)));
  }, [treinamentosData]);




  const uniqueEmpresas = useMemo(() => {
    return Array.from(new Set(treinamentosData.map(t => t.empresa_nome).filter(Boolean)));
  }, [treinamentosData]);

  const filteredData = useMemo(() => {
    return treinamentosData.filter(item => {
      const matchesColaborador = !searchColaborador || 
        item.funcionario_nome.toLowerCase().includes(searchColaborador.toLowerCase());
      
      const matchesTreinamento = !searchTreinamento || 
        item.nome_treinamento.toLowerCase().includes(searchTreinamento.toLowerCase());
      
      const matchesInstrutor = instrutorFilter === 'all' || item.instrutor === instrutorFilter;
      
      
      const matchesEmpresa = empresaFilter === 'all' || item.empresa_nome === empresaFilter;
      
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(item.status);
      
      // Filtro por data de realização
      let matchesDataRealizacao = true;
      if (dataRealizacaoFilter !== 'all') {
        const dateRange = getDateRangeForPeriod(dataRealizacaoFilter, customStartMonth, customStartYear, customEndMonth, customEndYear);
        if (dateRange.start && dateRange.end && item.data_realizacao) {
          const dataRealizacao = new Date(item.data_realizacao);
          matchesDataRealizacao = dataRealizacao >= dateRange.start && dataRealizacao <= dateRange.end;
        }
      }

      // Filtro por validade
      let matchesValidade = true;
      if (validadeFilter !== 'all' && item.data_validade) {
        const dataValidade = new Date(item.data_validade);
        const now = new Date();
        const currentYear = now.getFullYear();
        const currentMonth = now.getMonth();

        if (validadeFilter === 'mes-atual') {
          const start = new Date(currentYear, currentMonth, 1);
          const end = new Date(currentYear, currentMonth + 1, 0);
          matchesValidade = dataValidade >= start && dataValidade <= end;
        } else if (validadeFilter === 'proximos-3-meses') {
          const start = new Date(now);
          start.setHours(0, 0, 0, 0);
          const end = new Date(now);
          end.setMonth(end.getMonth() + 3);
          matchesValidade = dataValidade >= start && dataValidade <= end;
        } else if (validadeFilter === 'ano-atual') {
          const start = new Date(currentYear, 0, 1);
          const end = new Date(currentYear, 11, 31);
          matchesValidade = dataValidade >= start && dataValidade <= end;
        } else if (validadeFilter === 'personalizado') {
          if (validadeStartDate) {
            matchesValidade = dataValidade >= new Date(validadeStartDate);
          }
          if (validadeEndDate && matchesValidade) {
            matchesValidade = dataValidade <= new Date(validadeEndDate);
          }
        }
      } else if (validadeFilter !== 'all' && !item.data_validade) {
        matchesValidade = false;
      }
      
      return matchesColaborador && matchesTreinamento && matchesInstrutor && 
             matchesEmpresa && matchesDataRealizacao && matchesStatus && matchesValidade;
    });
   }, [treinamentosData, searchColaborador, searchTreinamento, instrutorFilter, empresaFilter,
       dataRealizacaoFilter, statusFilter, validadeFilter, validadeStartDate, validadeEndDate, customStartMonth, customStartYear, customEndMonth, customEndYear]);

  const exportToPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });
    
    doc.setFontSize(16);
    doc.text('Relatório de Gestão de Treinamentos', 20, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 20, 30);

    const tableData = filteredData.map(item => [
      item.funcionario_nome,
      item.cargo_atual || '',
      item.nome_treinamento,
      item.instrutor || '',
      item.norma || '',
      item.data_realizacao ? formatDateForDisplay(item.data_realizacao) : '',
      item.data_validade ? formatDateForDisplay(item.data_validade) : '',
      item.carga_horaria ? `${item.carga_horaria}h` : '',
      item.status.charAt(0).toUpperCase() + item.status.slice(1),
      ...(isGroupView ? [item.empresa_nome || ''] : [])
    ]);

    autoTable(doc, {
      head: [[
        'Funcionário', 
        'Cargo', 
        'Treinamento', 
        'Instrutor', 
        'Norma', 
        'Data Realização', 
        'Data Validade', 
        'Carga Horária', 
        'Status',
        ...(isGroupView ? ['Empresa'] : [])
      ]],
      body: tableData,
      startY: 40,
      styles: { fontSize: 7 },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255
      },
      columnStyles: {
        0: { cellWidth: 28 },
        1: { cellWidth: 22 },
        2: { cellWidth: 35 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 20 },
        6: { cellWidth: 20 },
        7: { cellWidth: 15 },
        8: { cellWidth: 20 },
        ...(isGroupView ? { 9: { cellWidth: 25 } } : {})
      }
    });

    doc.save('gestao-treinamentos.pdf');
  };

  const exportToExcel = () => {
    const worksheetData = filteredData.map(item => ({
      'Funcionário': item.funcionario_nome,
      'Cargo': item.cargo_atual || '',
      'Treinamento': item.nome_treinamento,
      'Instrutor': item.instrutor || '',
      'Norma': item.norma || '',
      'Data Realização': item.data_realizacao ? formatDateForDisplay(item.data_realizacao) : '',
      'Data Validade': item.data_validade ? formatDateForDisplay(item.data_validade) : '',
      'Carga Horária': item.carga_horaria ? `${item.carga_horaria}h` : '',
      'Status': item.status.charAt(0).toUpperCase() + item.status.slice(1),
      'Observações': item.observacoes || '',
      ...(isGroupView && { 'Empresa': item.empresa_nome || '' })
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Gestão de Treinamentos');
    XLSX.writeFile(workbook, 'gestao-treinamentos.xlsx');
  };

  const clearFilters = () => {
    setSearchColaborador('');
    setSearchTreinamento('');
    setInstrutorFilter('all');
    setDataRealizacaoFilter('all');
    setEmpresaFilter('all');
    setStatusFilter([]);
    setValidadeFilter('all');
    setValidadeStartDate('');
    setValidadeEndDate('');
    setCustomStartMonth(null);
    setCustomStartYear(null);
    setCustomEndMonth(null);
    setCustomEndYear(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  const months = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Gestão de Treinamentos
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
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Funcionário</label>
              <Input
                placeholder="Nome do Funcionário"
                value={searchColaborador}
                onChange={(e) => setSearchColaborador(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Treinamento</label>
              <Input
                placeholder="Nome do Treinamento"
                value={searchTreinamento}
                onChange={(e) => setSearchTreinamento(e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Instrutor</label>
              <Select value={instrutorFilter} onValueChange={setInstrutorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Instrutores</SelectItem>
                  {uniqueInstrutores.map((instrutor) => (
                    <SelectItem key={instrutor} value={instrutor}>
                      {instrutor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>



            <div>
              <label className="text-sm font-medium mb-2 block">Data de Realização</label>
              <Select value={dataRealizacaoFilter} onValueChange={setDataRealizacaoFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Datas</SelectItem>
                  <SelectItem value="mes-atual">Mês Atual</SelectItem>
                  <SelectItem value="ano-atual">Ano Atual</SelectItem>
                  <SelectItem value="ano-anterior">Ano Anterior</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Validade</label>
              <Select value={validadeFilter} onValueChange={setValidadeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="mes-atual">Mês atual</SelectItem>
                  <SelectItem value="proximos-3-meses">Próximos 03 meses</SelectItem>
                  <SelectItem value="ano-atual">Ano atual</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" role="combobox" className="h-9 w-full justify-between">
                    {statusFilter.length === 0 
                      ? "Todos" 
                      : statusFilter.length === 1 
                        ? statusFilter[0].charAt(0).toUpperCase() + statusFilter[0].slice(1)
                        : `${statusFilter.length} selecionados`}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandList>
                      <CommandGroup>
                        {['válido', 'vencendo', 'vencido', 'renovado'].map((status) => (
                          <CommandItem 
                            key={status} 
                            onSelect={() => {
                              setStatusFilter(prev => 
                                prev.includes(status) 
                                  ? prev.filter(s => s !== status) 
                                  : [...prev, status]
                              );
                            }}
                          >
                            <Check className={cn("mr-2 h-4 w-4", statusFilter.includes(status) ? "opacity-100" : "opacity-0")} />
                            {status.charAt(0).toUpperCase() + status.slice(1)}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {isGroupView && (
              <div>
                <label className="text-sm font-medium mb-2 block">Empresa</label>
                <Select value={empresaFilter} onValueChange={setEmpresaFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todas" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Empresas</SelectItem>
                    {uniqueEmpresas.map((empresa) => (
                      <SelectItem key={empresa} value={empresa}>
                        {empresa}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {validadeFilter === 'personalizado' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg bg-muted/50">
              <div>
                <label className="text-sm font-medium mb-2 block">Data Início (Validade)</label>
                <Input
                  type="date"
                  value={validadeStartDate}
                  onChange={(e) => setValidadeStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Data Fim (Validade)</label>
                <Input
                  type="date"
                  value={validadeEndDate}
                  onChange={(e) => setValidadeEndDate(e.target.value)}
                />
              </div>
            </div>
          )}


          {dataRealizacaoFilter === 'personalizado' && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-muted/50">
              <div>
                <label className="text-sm font-medium mb-2 block">Mês Início</label>
                <Select
                  value={customStartMonth?.toString() || ''}
                  onValueChange={(value) => setCustomStartMonth(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Ano Início</label>
                <Select
                  value={customStartYear?.toString() || ''}
                  onValueChange={(value) => setCustomStartYear(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Mês Fim</label>
                <Select
                  value={customEndMonth?.toString() || ''}
                  onValueChange={(value) => setCustomEndMonth(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o mês" />
                  </SelectTrigger>
                  <SelectContent>
                    {months.map((month) => (
                      <SelectItem key={month.value} value={month.value.toString()}>
                        {month.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Ano Fim</label>
                <Select
                  value={customEndYear?.toString() || ''}
                  onValueChange={(value) => setCustomEndYear(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o ano" />
                  </SelectTrigger>
                  <SelectContent>
                    {years.map((year) => (
                      <SelectItem key={year} value={year.toString()}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={clearFilters} variant="outline">
              Limpar Filtros
            </Button>
          </div>
        </div>

        {/* Resumo */}
        <div className="mb-4 text-sm text-muted-foreground">
          Exibindo {filteredData.length} de {treinamentosData.length} treinamentos
        </div>

        {/* Tabela */}
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Funcionário</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Treinamento</TableHead>
                <TableHead>Instrutor</TableHead>
                <TableHead>Norma</TableHead>
                <TableHead>Data Realização</TableHead>
                <TableHead>Data Validade</TableHead>
                <TableHead>Carga Horária</TableHead>
                <TableHead>Status</TableHead>
                {isGroupView && <TableHead>Empresa</TableHead>}
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={isGroupView ? 11 : 10} className="text-center py-8">
                    Nenhum treinamento encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.funcionario_nome}</TableCell>
                    <TableCell>{item.cargo_atual || '-'}</TableCell>
                    <TableCell>{item.nome_treinamento}</TableCell>
                    <TableCell>{item.instrutor || '-'}</TableCell>
                    <TableCell>{item.norma || '-'}</TableCell>
                    <TableCell>
                      {item.data_realizacao ? formatDateForDisplay(item.data_realizacao) : '-'}
                    </TableCell>
                    <TableCell>
                      {item.data_validade ? formatDateForDisplay(item.data_validade) : '-'}
                    </TableCell>
                    <TableCell>{item.carga_horaria ? `${item.carga_horaria}h` : '-'}</TableCell>
                    <TableCell>
                      <Badge 
                        variant={
                          item.status === 'válido' ? 'default' : 
                          item.status === 'vencido' ? 'destructive' : 
                          'outline'
                        }
                        className={cn(
                          item.status === 'renovado' && 'bg-green-500 text-white hover:bg-green-600',
                          item.status === 'vencendo' && 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800'
                        )}
                      >
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                      </Badge>
                    </TableCell>
                    {isGroupView && <TableCell>{item.empresa_nome || '-'}</TableCell>}
                    <TableCell className="text-center">
                      <Link to={`/funcionarios/${item.funcionario_id}?tab=treinamentos`}>
                        <Button variant="ghost" size="sm">
                          <Eye className="h-4 w-4" />
                        </Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};
