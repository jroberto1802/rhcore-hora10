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
import { Download, FileText, X, Check, ChevronsUpDown, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandGroup, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { formatDateForDisplay } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { type Empresa } from '@/hooks/useUserEmpresas';
import { Skeleton } from '@/components/ui/skeleton';
import { addMonths, startOfMonth, endOfMonth, startOfYear, endOfYear, isWithinInterval, parseISO } from 'date-fns';

interface ASOITEM {
  id: string;
  funcionario_id: string;
  funcionario_nome: string;
  tipo_aso: string;
  clinica: string | null;
  data_emissao: string;
  data_validade: string | null;
  resultado: string | null;
  qtd_exames: number;
  status: string;
}

interface GestaoExamesProps {
  currentEmpresa: Empresa | null;
  isGroupView?: boolean;
  currentGroupId?: string | null;
}

const TIPOS_ASO = [
  'Admissional',
  'Periódico',
  'Mudança de Riscos Ocupacionais',
  'Retorno ao Trabalho',
  'Demissional'
];

const STATUS_OPTIONS = ['Válido', 'Vencendo', 'Vencido', 'Renovado'];

export const GestaoExames = ({ 
  currentEmpresa, 
  isGroupView, 
  currentGroupId 
}: GestaoExamesProps) => {
  const [asos, setAsos] = useState<ASOITEM[]>([]);
  const [loading, setLoading] = useState(true);
  const [nomeFuncionario, setNomeFuncionario] = useState('');
  const [tipoAso, setTipoAso] = useState('all');
  const [clinicaFilter, setClinicaFilter] = useState('all');
  const [emissaoFilter, setEmissaoFilter] = useState('all');
  const [customEmissaoStartMonth, setCustomEmissaoStartMonth] = useState<number | null>(null);
  const [customEmissaoStartYear, setCustomEmissaoStartYear] = useState<number | null>(null);
  const [customEmissaoEndMonth, setCustomEmissaoEndMonth] = useState<number | null>(null);
  const [customEmissaoEndYear, setCustomEmissaoEndYear] = useState<number | null>(null);
  const [validadePeriodo, setValidadePeriodo] = useState('all');
  const [validadeInicio, setValidadeInicio] = useState('');
  const [validadeFim, setValidadeFim] = useState('');
  const [resultadoFilter, setResultadoFilter] = useState('all');
  const [statusFilters, setStatusFilters] = useState<string[]>([]);
  
  const { user } = useAuth();
  const navigate = useNavigate();

  const calculateStatus = (dataValidade: string | null, status: string | null): string => {
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

  const loadAsos = async () => {
    if (!user || !currentEmpresa) return;

    try {
      setLoading(true);
      
      const { data: asosData, error: asosError } = await supabase
        .from('asos')
        .select(`
          id,
          funcionario_id,
          tipo_aso,
          clinica,
          data_emissao,
          data_validade,
          resultado,
          status,
          empresa_id,
          exames_aso (id)
        `)
        .eq('empresa_id', currentEmpresa.id)
        .order('data_emissao', { ascending: false });

      if (asosError) throw asosError;

      if (asosData && asosData.length > 0) {
        const funcionarioIds = [...new Set(asosData.map(a => a.funcionario_id))];
        
        const { data: funcionariosData } = await supabase.rpc('funcionarios_safe');

        const activeFuncionariosMap = new Map(
          funcionariosData?.filter((f: any) => !f.data_demissao && funcionarioIds.includes(f.id))
            .map((f: any) => [f.id, f.nome_completo]) || []
        );

        const processedAsos: ASOITEM[] = asosData
          .filter(aso => activeFuncionariosMap.has(aso.funcionario_id))
          .map(aso => ({
            id: aso.id,
            funcionario_id: aso.funcionario_id,
            funcionario_nome: activeFuncionariosMap.get(aso.funcionario_id) || 'Não encontrado',
            tipo_aso: aso.tipo_aso,
            clinica: aso.clinica,
            data_emissao: aso.data_emissao,
            data_validade: aso.data_validade,
            resultado: aso.resultado,
            qtd_exames: aso.exames_aso?.length || 0,
            status: calculateStatus(aso.data_validade, aso.status)
          }));

        setAsos(processedAsos);
      } else {
        setAsos([]);
      }
    } catch (error) {
      console.error('Erro ao carregar ASOs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAsos();
  }, [user, currentEmpresa]);

  const uniqueClinicas = useMemo(() => {
    return Array.from(new Set(asos.map(a => a.clinica).filter(Boolean)));
  }, [asos]);

  const getEmissaoDateRange = () => {
    const today = new Date();
    const currentYear = today.getFullYear();
    
    switch (emissaoFilter) {
      case 'mes_atual':
        return { start: startOfMonth(today), end: endOfMonth(today) };
      case 'ano_atual':
        return { start: startOfYear(today), end: endOfYear(today) };
      case 'ano_anterior':
        return { start: new Date(currentYear - 1, 0, 1), end: new Date(currentYear - 1, 11, 31) };
      case 'personalizado':
        if (customEmissaoStartMonth !== null && customEmissaoStartYear !== null && 
            customEmissaoEndMonth !== null && customEmissaoEndYear !== null) {
          return {
            start: new Date(customEmissaoStartYear, customEmissaoStartMonth - 1, 1),
            end: new Date(customEmissaoEndYear, customEmissaoEndMonth, 0)
          };
        }
        return null;
      default:
        return null;
    }
  };

  const getValidadeDateRange = () => {
    const today = new Date();
    
    switch (validadePeriodo) {
      case 'mes_atual':
        return { start: startOfMonth(today), end: endOfMonth(today) };
      case 'proximos_3_meses':
        return { start: today, end: endOfMonth(addMonths(today, 3)) };
      case 'ano_atual':
        return { start: startOfYear(today), end: endOfYear(today) };
      case 'personalizado':
        if (validadeInicio && validadeFim) {
          return { start: parseISO(validadeInicio), end: parseISO(validadeFim) };
        }
        return null;
      default:
        return null;
    }
  };

  const filteredAsos = useMemo(() => {
    return asos.filter(aso => {
      const matchesNome = !nomeFuncionario || 
        aso.funcionario_nome.toLowerCase().includes(nomeFuncionario.toLowerCase());
      
      const matchesTipo = tipoAso === 'all' || aso.tipo_aso === tipoAso;
      const matchesClinica = clinicaFilter === 'all' || aso.clinica === clinicaFilter;
      const matchesResultado = resultadoFilter === 'all' || aso.resultado === resultadoFilter;
      const matchesStatus = statusFilters.length === 0 || statusFilters.includes(aso.status);
      
      let matchesEmissao = true;
      const emissaoRange = getEmissaoDateRange();
      if (emissaoRange) {
        try {
          const emissaoDate = parseISO(aso.data_emissao);
          matchesEmissao = isWithinInterval(emissaoDate, emissaoRange);
        } catch {
          matchesEmissao = false;
        }
      }

      let matchesValidade = true;
      const validadeRange = getValidadeDateRange();
      if (validadeRange && aso.data_validade) {
        try {
          const validadeDate = parseISO(aso.data_validade);
          matchesValidade = isWithinInterval(validadeDate, validadeRange);
        } catch {
          matchesValidade = false;
        }
      }
      
      return matchesNome && matchesTipo && matchesClinica && matchesEmissao && 
             matchesValidade && matchesResultado && matchesStatus;
    });
  }, [asos, nomeFuncionario, tipoAso, clinicaFilter, emissaoFilter, 
      customEmissaoStartMonth, customEmissaoStartYear, customEmissaoEndMonth, customEmissaoEndYear,
      validadePeriodo, validadeInicio, validadeFim, resultadoFilter, statusFilters]);

  const clearFilters = () => {
    setNomeFuncionario('');
    setTipoAso('all');
    setClinicaFilter('all');
    setEmissaoFilter('all');
    setCustomEmissaoStartMonth(null);
    setCustomEmissaoStartYear(null);
    setCustomEmissaoEndMonth(null);
    setCustomEmissaoEndYear(null);
    setValidadePeriodo('all');
    setValidadeInicio('');
    setValidadeFim('');
    setResultadoFilter('all');
    setStatusFilters([]);
  };

  const handleStatusToggle = (status: string) => {
    setStatusFilters(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const getResultadoBadge = (resultado: string | null) => {
    if (!resultado || resultado === 'Renovado') return <span className="text-muted-foreground">-</span>;
    
    switch (resultado) {
      case 'Apto':
        return (
          <Badge className="bg-primary text-primary-foreground hover:bg-primary/90">
            Apto
          </Badge>
        );
      case 'Inapto':
        return (
          <Badge variant="destructive">
            Inapto
          </Badge>
        );
      case 'Apto com Restrições':
        return (
          <Badge className="bg-orange-500 text-white hover:bg-orange-600 dark:bg-orange-600 dark:hover:bg-orange-700">
            Apto com Restrições
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            {resultado}
          </Badge>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Renovado':
        return (
          <Badge className="bg-green-100 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-400 dark:border-green-800">
            Renovado
          </Badge>
        );
      case 'Válido':
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-950 dark:text-blue-400 dark:border-blue-800">
            Válido
          </Badge>
        );
      case 'Vencendo':
        return (
          <Badge className="bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800">
            Vencendo
          </Badge>
        );
      case 'Vencido':
        return <Badge variant="destructive">Vencido</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('Relatório de Gestão de Exames (ASOs)', 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);

    const tableData = filteredAsos.map(aso => [
      aso.funcionario_nome,
      aso.tipo_aso,
      aso.clinica || '-',
      formatDateForDisplay(aso.data_emissao),
      aso.data_validade ? formatDateForDisplay(aso.data_validade) : '-',
      aso.resultado || '-',
      aso.qtd_exames.toString(),
      aso.status
    ]);

    autoTable(doc, {
      head: [['Funcionário', 'Tipo ASO', 'Clínica', 'Data Emissão', 'Validade', 'Resultado', 'Exames', 'Status']],
      body: tableData,
      startY: 40,
      styles: { fontSize: 7 }
    });

    doc.save('gestao-exames-aso.pdf');
  };

  const exportToExcel = () => {
    const worksheetData = filteredAsos.map(aso => ({
      'Funcionário': aso.funcionario_nome,
      'Tipo ASO': aso.tipo_aso,
      'Clínica': aso.clinica || '',
      'Data Emissão': formatDateForDisplay(aso.data_emissao),
      'Validade': aso.data_validade ? formatDateForDisplay(aso.data_validade) : '',
      'Resultado': aso.resultado || '',
      'Qtd Exames': aso.qtd_exames,
      'Status': aso.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'ASOs');
    XLSX.writeFile(workbook, 'gestao-exames-aso.xlsx');
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <Skeleton className="h-6 w-48" />
              <div className="flex gap-2">
                <Skeleton className="h-9 w-32" />
                <Skeleton className="h-9 w-32" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="h-9 w-full" />
                ))}
              </div>
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Gestão de Exames
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
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
              <Label htmlFor="tipoAso" className="text-xs font-medium">
                Tipo de ASO
              </Label>
              <Select value={tipoAso} onValueChange={setTipoAso}>
                <SelectTrigger id="tipoAso" className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {TIPOS_ASO.map((tipo) => (
                    <SelectItem key={tipo} value={tipo}>{tipo}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="clinica" className="text-xs font-medium">
                Clínica
              </Label>
              <Select value={clinicaFilter} onValueChange={setClinicaFilter}>
                <SelectTrigger id="clinica" className="h-9">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  {uniqueClinicas.map((clinica) => (
                    <SelectItem key={clinica} value={clinica!}>{clinica}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emissaoFilter" className="text-xs font-medium">
                Data de Emissão
              </Label>
              <Select value={emissaoFilter} onValueChange={setEmissaoFilter}>
                <SelectTrigger id="emissaoFilter" className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="mes_atual">Mês Atual</SelectItem>
                  <SelectItem value="ano_atual">Ano Atual</SelectItem>
                  <SelectItem value="ano_anterior">Ano Anterior</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="validadePeriodo" className="text-xs font-medium">
                Validade
              </Label>
              <Select value={validadePeriodo} onValueChange={setValidadePeriodo}>
                <SelectTrigger id="validadePeriodo" className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="mes_atual">Mês Atual</SelectItem>
                  <SelectItem value="proximos_3_meses">Próximos 03 Meses</SelectItem>
                  <SelectItem value="ano_atual">Ano Atual</SelectItem>
                  <SelectItem value="personalizado">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="resultado" className="text-xs font-medium">
                Resultado
              </Label>
              <Select value={resultadoFilter} onValueChange={setResultadoFilter}>
                <SelectTrigger id="resultado" className="h-9">
                  <SelectValue placeholder="Todos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="Apto">Apto</SelectItem>
                  <SelectItem value="Inapto">Inapto</SelectItem>
                  <SelectItem value="Apto com Restrições">Apto com Restrições</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Status</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "h-9 w-full justify-between font-normal",
                      statusFilters.length === 0 && "text-muted-foreground"
                    )}
                  >
                    {statusFilters.length === 0 ? "Todos" : statusFilters.length === 1 ? statusFilters[0] : `${statusFilters.length} selecionados`}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0" align="start">
                  <Command>
                    <CommandList>
                      <CommandGroup>
                        {STATUS_OPTIONS.map((status) => (
                          <CommandItem key={status} onSelect={() => handleStatusToggle(status)}>
                            <Check className={cn("mr-2 h-4 w-4", statusFilters.includes(status) ? "opacity-100" : "opacity-0")} />
                            {status}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Filtro personalizado de Data de Emissão */}
          {emissaoFilter === 'personalizado' && (
            <div className="col-span-full mb-4">
              <div className="p-4 border rounded-lg bg-background">
                <div className="space-y-4">
                  <h4 className="text-sm font-medium">Data de Emissão Personalizada</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Mês Início</label>
                      <Select value={customEmissaoStartMonth?.toString() || ""} onValueChange={(value) => setCustomEmissaoStartMonth(value ? parseInt(value) : null)}>
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
                      <Select value={customEmissaoStartYear?.toString() || ""} onValueChange={(value) => setCustomEmissaoStartYear(value ? parseInt(value) : null)}>
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Ano" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 10 }, (_, i) => {
                            const year = new Date().getFullYear() - 5 + i;
                            return <SelectItem key={year} value={year.toString()}>{year}</SelectItem>;
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-muted-foreground">Mês Fim</label>
                      <Select value={customEmissaoEndMonth?.toString() || ""} onValueChange={(value) => setCustomEmissaoEndMonth(value ? parseInt(value) : null)}>
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
                      <Select value={customEmissaoEndYear?.toString() || ""} onValueChange={(value) => setCustomEmissaoEndYear(value ? parseInt(value) : null)}>
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Ano" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 10 }, (_, i) => {
                            const year = new Date().getFullYear() - 5 + i;
                            return <SelectItem key={year} value={year.toString()}>{year}</SelectItem>;
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Filtro personalizado de Validade */}
          {validadePeriodo === 'personalizado' && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="space-y-1.5">
                <Label htmlFor="validadeInicio" className="text-xs font-medium">Validade Início</Label>
                <Input id="validadeInicio" type="date" value={validadeInicio} onChange={(e) => setValidadeInicio(e.target.value)} className="h-9" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="validadeFim" className="text-xs font-medium">Validade Fim</Label>
                <Input id="validadeFim" type="date" value={validadeFim} onChange={(e) => setValidadeFim(e.target.value)} className="h-9" />
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-muted-foreground">
              Exibindo {filteredAsos.length} de {asos.length} ASOs
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
                  <TableHead className="w-[50px]">#</TableHead>
                  <TableHead>Funcionário</TableHead>
                  <TableHead>Tipo ASO</TableHead>
                  <TableHead>Clínica</TableHead>
                  <TableHead>Data Emissão</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead>Exames</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredAsos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-30" />
                      <p className="text-muted-foreground">Nenhum ASO encontrado.</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAsos.map((aso, index) => (
                    <TableRow key={aso.id}>
                      <TableCell className="text-muted-foreground text-xs">{index + 1}</TableCell>
                      <TableCell className="font-medium">{aso.funcionario_nome}</TableCell>
                      <TableCell>{aso.tipo_aso}</TableCell>
                      <TableCell>{aso.clinica || '-'}</TableCell>
                      <TableCell>{formatDateForDisplay(aso.data_emissao)}</TableCell>
                      <TableCell>
                        {aso.data_validade ? formatDateForDisplay(aso.data_validade) : '-'}
                      </TableCell>
                      <TableCell>{getResultadoBadge(aso.resultado)}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">{aso.qtd_exames} exame(s)</Badge>
                      </TableCell>
                      <TableCell>{getStatusBadge(aso.status)}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/funcionarios/${aso.funcionario_id}?tab=exames`)}
                          title="Ver detalhes do colaborador"
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
