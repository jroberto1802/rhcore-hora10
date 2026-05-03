import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowUp, ArrowDown, ArrowUpDown, Download, FileText, X, Check } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDateForDisplay } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { type Empresa } from '@/hooks/useUserEmpresas';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';

interface DocumentoColaborador {
  id: string;
  colaborador_id: string;
  colaborador_nome: string;
  terceirizado_nome: string;
  nome_documento: string;
  tipo: string;
  data_vigencia_inicio: string | null;
  data_vigencia_fim: string | null;
  status: string;
  situacao: string;
  responsavel_nome: string;
  created_at: string;
}

interface GestaoDocumentalPessoasProps {
  currentEmpresa: Empresa | null;
  isGroupView?: boolean;
  currentGroupId?: string | null;
}

type SortKey = 'colaborador_nome' | 'terceirizado_nome' | 'nome_documento' | 'tipo' | 'data_vigencia_inicio' | 'data_vigencia_fim' | 'status' | 'situacao';
type SortDir = 'asc' | 'desc';

const MultiSelectFilter = ({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
}) => {
  const [open, setOpen] = useState(false);

  const toggleOption = (option: string) => {
    if (selected.includes(option)) {
      onChange(selected.filter(s => s !== option));
    } else {
      onChange([...selected, option]);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full h-9 justify-between font-normal"
        >
          <span className="truncate">
            {selected.length === 0
              ? `Todos`
              : selected.length === 1
              ? selected[0]
              : `${selected.length} selecionados`}
          </span>
          {selected.length > 0 && (
            <X
              className="ml-2 h-3 w-3 shrink-0 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                onChange([]);
              }}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[220px] p-0" align="start">
        <Command>
          <CommandInput placeholder={`Buscar ${label.toLowerCase()}...`} />
          <CommandList>
            <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => toggleOption(option)}
                >
                  <div className={cn(
                    "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                    selected.includes(option)
                      ? "bg-primary text-primary-foreground"
                      : "opacity-50"
                  )}>
                    {selected.includes(option) && <Check className="h-3 w-3" />}
                  </div>
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};

export const GestaoDocumentalPessoas = ({ 
  currentEmpresa, 
  isGroupView, 
  currentGroupId 
}: GestaoDocumentalPessoasProps) => {
  const [documentos, setDocumentos] = useState<DocumentoColaborador[]>([]);
  const [loading, setLoading] = useState(true);
  const [nomeColaborador, setNomeColaborador] = useState('');
  const [terceirizadaFilter, setTerceirizadaFilter] = useState<string[]>([]);
  const [nomeDocumentoFilter, setNomeDocumentoFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [situacaoFilter, setSituacaoFilter] = useState<string[]>([]);
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');
  const [sortKey, setSortKey] = useState<SortKey | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  
  const { user } = useAuth();

  const loadDocumentos = async () => {
    if (!user || !currentEmpresa) return;

    try {
      setLoading(true);
      
      const { data: documentosData, error: docError } = await supabase
        .from('documentos_colaboradores_terceirizados')
        .select(`
          id,
          colaborador_id,
          nome_documento,
          tipo,
          data_vigencia_inicio,
          data_vigencia_fim,
          situacao,
          status_valido,
          created_at
        `)
        .eq('empresa_id', currentEmpresa.id)
        .order('data_vigencia_fim', { ascending: true, nullsFirst: false });

      if (docError) throw docError;

      if (documentosData && documentosData.length > 0) {
        const colaboradorIds = [...new Set(documentosData.map(d => d.colaborador_id))];
        
        const { data: colaboradoresData } = await supabase
          .from('colaboradores_terceirizados')
          .select('id, nome_completo, terceirizado_id')
          .in('id', colaboradorIds);

        if (colaboradoresData && colaboradoresData.length > 0) {
          const terceirizadoIds = [...new Set(colaboradoresData.map(c => c.terceirizado_id))];
          
          const { data: terceirizadosData } = await supabase
            .from('terceirizados')
            .select('id, nome_fantasia')
            .in('id', terceirizadoIds);

          const terceirizadosMap = new Map(terceirizadosData?.map(t => [t.id, t.nome_fantasia]) || []);
          const colaboradoresMap = new Map(
            colaboradoresData.map(c => [
              c.id, 
              {
                nome: c.nome_completo,
                terceirizado: terceirizadosMap.get(c.terceirizado_id) || 'Não encontrado'
              }
            ])
          );

          const processedDocs = documentosData.map(doc => {
            const colaborador = colaboradoresMap.get(doc.colaborador_id);
            return {
              ...doc,
              colaborador_nome: colaborador?.nome || 'Não encontrado',
              terceirizado_nome: colaborador?.terceirizado || 'Não encontrado',
              status: doc.status_valido ? 'Válido' : 'Vencido',
              responsavel_nome: 'Sistema'
            };
          });

          setDocumentos(processedDocs);
        } else {
          setDocumentos([]);
        }
      } else {
        setDocumentos([]);
      }
    } catch (error) {
      console.error('Erro ao carregar documentos:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDocumentos();
  }, [user, currentEmpresa]);

  const uniqueTerceirizadas = useMemo(() => {
    return Array.from(new Set(documentos.map(d => d.terceirizado_nome))).sort();
  }, [documentos]);

  const uniqueStatusOptions = ['Válido', 'Vencido'];
  const uniqueSituacaoOptions = ['Não Enviado', 'Solicitado', 'Recebido'];

  const filteredDocumentos = useMemo(() => {
    return documentos.filter(doc => {
      const matchesNome = !nomeColaborador || 
        doc.colaborador_nome.toLowerCase().includes(nomeColaborador.toLowerCase());
      
      const matchesTerceirizada = terceirizadaFilter.length === 0 || terceirizadaFilter.includes(doc.terceirizado_nome);
      const matchesNomeDocumento = !nomeDocumentoFilter || doc.nome_documento.toLowerCase().includes(nomeDocumentoFilter.toLowerCase());
      const matchesStatus = statusFilter.length === 0 || statusFilter.includes(doc.status);
      const matchesSituacao = situacaoFilter.length === 0 || situacaoFilter.includes(doc.situacao);
      
      let matchesPeriodo = true;
      if (periodoInicio && doc.data_vigencia_inicio) {
        matchesPeriodo = matchesPeriodo && new Date(doc.data_vigencia_inicio) >= new Date(periodoInicio);
      }
      if (periodoFim && doc.data_vigencia_fim) {
        matchesPeriodo = matchesPeriodo && new Date(doc.data_vigencia_fim) <= new Date(periodoFim);
      }
      
      return matchesNome && matchesTerceirizada && matchesNomeDocumento && matchesStatus && matchesSituacao && matchesPeriodo;
    });
  }, [documentos, nomeColaborador, terceirizadaFilter, nomeDocumentoFilter, statusFilter, situacaoFilter, periodoInicio, periodoFim]);

  const sortedDocumentos = useMemo(() => {
    if (!sortKey) return filteredDocumentos;
    return [...filteredDocumentos].sort((a, b) => {
      const valA = a[sortKey] ?? '';
      const valB = b[sortKey] ?? '';
      const cmp = String(valA).localeCompare(String(valB), 'pt-BR', { sensitivity: 'base' });
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filteredDocumentos, sortKey, sortDir]);

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ columnKey }: { columnKey: SortKey }) => {
    if (sortKey !== columnKey) return <ArrowUpDown className="h-3 w-3 ml-1 opacity-40" />;
    return sortDir === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1 text-primary" /> 
      : <ArrowDown className="h-3 w-3 ml-1 text-primary" />;
  };

  const clearFilters = () => {
    setNomeColaborador('');
    setTerceirizadaFilter([]);
    setNomeDocumentoFilter('');
    setStatusFilter([]);
    setSituacaoFilter([]);
    setPeriodoInicio('');
    setPeriodoFim('');
  };

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text('Relatório de Gestão Documental das Pessoas', 14, 20);
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);

    const tableData = sortedDocumentos.map(doc => [
      doc.colaborador_nome,
      doc.terceirizado_nome,
      doc.nome_documento,
      doc.tipo,
      doc.data_vigencia_inicio ? formatDateForDisplay(doc.data_vigencia_inicio) : '-',
      doc.data_vigencia_fim ? formatDateForDisplay(doc.data_vigencia_fim) : '-',
      doc.status,
      doc.situacao
    ]);

    autoTable(doc, {
      head: [['Colaborador', 'Terceirizada', 'Documento', 'Tipo', 'Vigência Início', 'Vigência Fim', 'Status', 'Situação']],
      body: tableData,
      startY: 40,
      styles: { fontSize: 7 }
    });

    doc.save('gestao-documental-pessoas.pdf');
  };

  const exportToExcel = () => {
    const worksheetData = sortedDocumentos.map(doc => ({
      'Colaborador': doc.colaborador_nome,
      'Terceirizada': doc.terceirizado_nome,
      'Documento': doc.nome_documento,
      'Tipo': doc.tipo,
      'Vigência Início': doc.data_vigencia_inicio ? formatDateForDisplay(doc.data_vigencia_inicio) : '',
      'Vigência Fim': doc.data_vigencia_fim ? formatDateForDisplay(doc.data_vigencia_fim) : '',
      'Status': doc.status,
      'Situação': doc.situacao
    }));

    const worksheet = XLSX.utils.json_to_sheet(worksheetData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Documentos Pessoas');
    XLSX.writeFile(workbook, 'gestao-documental-pessoas.xlsx');
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
              <FileText className="h-5 w-5" />
              Gestão Documental das Pessoas
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
          {/* Filtros em linha única */}
          <div className="flex flex-wrap items-end gap-3 mb-6">
            <div className="space-y-1.5 min-w-[160px] flex-1">
              <Label htmlFor="nomeColaborador" className="text-xs font-medium">
                Colaborador
              </Label>
              <Input
                id="nomeColaborador"
                placeholder="Buscar..."
                value={nomeColaborador}
                onChange={(e) => setNomeColaborador(e.target.value)}
                className="h-9"
              />
            </div>
            
            <div className="space-y-1.5 min-w-[160px] flex-1">
              <Label className="text-xs font-medium">
                Terceirizada
              </Label>
              <MultiSelectFilter
                label="Terceirizada"
                options={uniqueTerceirizadas}
                selected={terceirizadaFilter}
                onChange={setTerceirizadaFilter}
              />
            </div>

            <div className="space-y-1.5 min-w-[200px] flex-1">
              <Label htmlFor="nomeDocumento" className="text-xs font-medium">
                Documento
              </Label>
              <Input
                id="nomeDocumento"
                placeholder="Buscar documento..."
                value={nomeDocumentoFilter}
                onChange={(e) => setNomeDocumentoFilter(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5 min-w-[120px] flex-1">
              <Label className="text-xs font-medium">
                Status
              </Label>
              <MultiSelectFilter
                label="Status"
                options={uniqueStatusOptions}
                selected={statusFilter}
                onChange={setStatusFilter}
              />
            </div>

            <div className="space-y-1.5 min-w-[130px] flex-1">
              <Label className="text-xs font-medium">
                Situação
              </Label>
              <MultiSelectFilter
                label="Situação"
                options={uniqueSituacaoOptions}
                selected={situacaoFilter}
                onChange={setSituacaoFilter}
              />
            </div>

            <div className="space-y-1.5 min-w-[140px] flex-1">
              <Label htmlFor="periodoInicio" className="text-xs font-medium">
                Vigência Início
              </Label>
              <Input
                id="periodoInicio"
                type="date"
                value={periodoInicio}
                onChange={(e) => setPeriodoInicio(e.target.value)}
                className="h-9"
              />
            </div>

            <div className="space-y-1.5 min-w-[140px] flex-1">
              <Label htmlFor="periodoFim" className="text-xs font-medium">
                Vigência Fim
              </Label>
              <Input
                id="periodoFim"
                type="date"
                value={periodoFim}
                onChange={(e) => setPeriodoFim(e.target.value)}
                className="h-9"
              />
            </div>
          </div>

          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-muted-foreground">
              Exibindo {sortedDocumentos.length} de {documentos.length} documentos
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
                  {([
                    ['colaborador_nome', 'Colaborador'],
                    ['terceirizado_nome', 'Terceirizada'],
                    ['nome_documento', 'Documento'],
                    ['tipo', 'Tipo'],
                    ['data_vigencia_inicio', 'Vigência Início'],
                    ['data_vigencia_fim', 'Vigência Fim'],
                    ['status', 'Status'],
                    ['situacao', 'Situação'],
                  ] as [SortKey, string][]).map(([key, label]) => (
                    <TableHead
                      key={key}
                      className="cursor-pointer select-none hover:bg-muted/50 transition-colors"
                      onClick={() => handleSort(key)}
                    >
                      <div className="flex items-center">
                        {label}
                        <SortIcon columnKey={key} />
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedDocumentos.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Nenhum documento encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  sortedDocumentos.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.colaborador_nome}</TableCell>
                      <TableCell>{doc.terceirizado_nome}</TableCell>
                      <TableCell>{doc.nome_documento}</TableCell>
                      <TableCell>{doc.tipo}</TableCell>
                      <TableCell>
                        {doc.data_vigencia_inicio ? formatDateForDisplay(doc.data_vigencia_inicio) : '-'}
                      </TableCell>
                      <TableCell>
                        {doc.data_vigencia_fim ? formatDateForDisplay(doc.data_vigencia_fim) : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={doc.status === 'Válido' ? 'default' : 'destructive'}>
                          {doc.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={
                            doc.situacao === 'Não Enviado' 
                              ? 'destructive' 
                              : doc.situacao === 'Solicitado'
                              ? 'outline'
                              : 'default'
                          }
                          className={
                            doc.situacao === 'Solicitado'
                              ? 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-950 dark:text-orange-400 dark:border-orange-800'
                              : ''
                          }
                        >
                          {doc.situacao}
                        </Badge>
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
