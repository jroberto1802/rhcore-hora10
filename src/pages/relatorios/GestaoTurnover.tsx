import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import removeAccents from 'remove-accents';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Download, FileText, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDateForDisplay } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { type Empresa } from '@/hooks/useUserEmpresas';
import { useUserEmpresas } from '@/hooks/useUserEmpresas';

interface TurnoverRecord {
  id: string;
  nome_completo: string;
  cargo_atual: string | null;
  setor_atual: string | null;
  data_admissao: string | null;
  data_demissao: string | null;
  empresa_id: string;
  empresa_nome?: string;
  tipo_turnover: 'Admissão' | 'Demissão';
  motivo_demissao?: string | null;
  data_evento: string;
}

interface Demissao {
  id: string;
  funcionario_id: string;
  data_demissao: string;
  motivo_desligamento: string;
}

interface GestaoTurnoverProps {
  currentEmpresa: Empresa | null;
  isGroupView?: boolean;
  currentGroupId?: string | null;
}

export const GestaoTurnover = ({ currentEmpresa, isGroupView, currentGroupId }: GestaoTurnoverProps) => {
  const navigate = useNavigate();
  const [turnoverData, setTurnoverData] = useState<TurnoverRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSetor, setFilterSetor] = useState<string>('all');
  const [filterCargo, setFilterCargo] = useState<string>('all');
  const [filterTipo, setFilterTipo] = useState<string>('all');
  const [filterPeriodo, setFilterPeriodo] = useState<string>('all');
  const [dataInicio, setDataInicio] = useState<string>('');
  const [dataFim, setDataFim] = useState<string>('');
  
  const { user } = useAuth();
  const { empresas } = useUserEmpresas();

  // Carregar dados de turnover
  const loadTurnoverData = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Buscar funcionários
      const { data: funcionariosData, error: funcError } = await supabase.rpc('funcionarios_safe');
      if (funcError) throw funcError;

      // Buscar demissões com motivos
      const { data: demissoesData, error: demError } = await supabase
        .from('demissoes')
        .select('id, funcionario_id, data_demissao, motivo_desligamento');
      if (demError) throw demError;

      let filteredFuncionarios = funcionariosData || [];

      // Filtrar por empresa/grupo
      if (isGroupView && currentGroupId) {
        const empresasDoGrupo = empresas.filter(emp => emp.grupo_empresarial.id === currentGroupId);
        const empresaIds = empresasDoGrupo.map(emp => emp.id);
        if (empresaIds.length > 0) {
          filteredFuncionarios = filteredFuncionarios.filter(f => empresaIds.includes(f.empresa_id));
        }
      } else if (currentEmpresa) {
        filteredFuncionarios = filteredFuncionarios.filter(f => f.empresa_id === currentEmpresa.id);
      }

      // Criar mapa de demissões por funcionário
      const demissoesMap = new Map<string, Demissao>();
      (demissoesData || []).forEach((d: Demissao) => {
        demissoesMap.set(d.funcionario_id, d);
      });

      // Criar registros de turnover
      const turnoverRecords: TurnoverRecord[] = [];

      filteredFuncionarios.forEach(funcionario => {
        const empresa = empresas.find(emp => emp.id === funcionario.empresa_id);
        const empresaNome = empresa?.fantasia || 'Empresa não encontrada';

        // Adicionar admissão se tiver data_admissao
        if (funcionario.data_admissao) {
          turnoverRecords.push({
            id: `${funcionario.id}-admissao`,
            nome_completo: funcionario.nome_completo,
            cargo_atual: funcionario.cargo_atual,
            setor_atual: funcionario.setor_atual,
            data_admissao: funcionario.data_admissao,
            data_demissao: funcionario.data_demissao,
            empresa_id: funcionario.empresa_id,
            empresa_nome: empresaNome,
            tipo_turnover: 'Admissão',
            motivo_demissao: null,
            data_evento: funcionario.data_admissao,
          });
        }

        // Adicionar demissão se tiver data_demissao
        if (funcionario.data_demissao) {
          const demissaoInfo = demissoesMap.get(funcionario.id);
          turnoverRecords.push({
            id: `${funcionario.id}-demissao`,
            nome_completo: funcionario.nome_completo,
            cargo_atual: funcionario.cargo_atual,
            setor_atual: funcionario.setor_atual,
            data_admissao: funcionario.data_admissao,
            data_demissao: funcionario.data_demissao,
            empresa_id: funcionario.empresa_id,
            empresa_nome: empresaNome,
            tipo_turnover: 'Demissão',
            motivo_demissao: demissaoInfo?.motivo_desligamento || null,
            data_evento: funcionario.data_demissao,
          });
        }
      });

      // Ordenar por data do evento (mais recente primeiro)
      turnoverRecords.sort((a, b) => new Date(b.data_evento).getTime() - new Date(a.data_evento).getTime());

      setTurnoverData(turnoverRecords);
    } catch (error) {
      console.error('Erro ao carregar dados de turnover:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTurnoverData();
  }, [user, currentEmpresa, isGroupView, currentGroupId, empresas]);

  // Filtrar dados
  const filteredData = useMemo(() => {
    return turnoverData.filter((record) => {
      const normalizedSearchTerm = removeAccents(searchTerm.toLowerCase());
      const matchesSearch = searchTerm === '' || 
        removeAccents(record.nome_completo.toLowerCase()).includes(normalizedSearchTerm);
      
      const matchesSetor = filterSetor === 'all' || record.setor_atual === filterSetor;
      const matchesCargo = filterCargo === 'all' || record.cargo_atual === filterCargo;
      const matchesTipo = filterTipo === 'all' || record.tipo_turnover === filterTipo;

      // Filtro de período
      let matchesPeriodo = true;
      const dataEvento = new Date(record.data_evento);
      const hoje = new Date();
      
      if (filterPeriodo === 'custom' && dataInicio && dataFim) {
        const inicio = new Date(dataInicio);
        const fim = new Date(dataFim);
        matchesPeriodo = dataEvento >= inicio && dataEvento <= fim;
      } else if (filterPeriodo === 'mes_atual') {
        matchesPeriodo = dataEvento.getMonth() === hoje.getMonth() && 
                         dataEvento.getFullYear() === hoje.getFullYear();
      } else if (filterPeriodo === 'ultimos_3_meses') {
        const tresMesesAtras = new Date(hoje);
        tresMesesAtras.setMonth(tresMesesAtras.getMonth() - 3);
        matchesPeriodo = dataEvento >= tresMesesAtras;
      } else if (filterPeriodo === 'ultimos_6_meses') {
        const seisMesesAtras = new Date(hoje);
        seisMesesAtras.setMonth(seisMesesAtras.getMonth() - 6);
        matchesPeriodo = dataEvento >= seisMesesAtras;
      } else if (filterPeriodo === 'ultimo_ano') {
        const umAnoAtras = new Date(hoje);
        umAnoAtras.setFullYear(umAnoAtras.getFullYear() - 1);
        matchesPeriodo = dataEvento >= umAnoAtras;
      }
      
      return matchesSearch && matchesSetor && matchesCargo && matchesTipo && matchesPeriodo;
    });
  }, [turnoverData, searchTerm, filterSetor, filterCargo, filterTipo, filterPeriodo, dataInicio, dataFim]);

  // Listas únicas para filtros
  const uniqueSetores = useMemo(() => {
    return Array.from(new Set(turnoverData.map(r => r.setor_atual).filter(Boolean))) as string[];
  }, [turnoverData]);

  const uniqueCargos = useMemo(() => {
    return Array.from(new Set(turnoverData.map(r => r.cargo_atual).filter(Boolean))) as string[];
  }, [turnoverData]);

  // Navegar para detalhes do funcionário
  const handleViewFuncionario = (id: string) => {
    // Remover sufixo -admissao ou -demissao
    const funcionarioId = id.replace('-admissao', '').replace('-demissao', '');
    navigate(`/funcionarios/${funcionarioId}`);
  };

  // Exportar para PDF
  const exportToPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    doc.setFontSize(16);
    doc.text('Relatório de Gestão de Turnover', 14, 20);
    
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);

    const tableData = filteredData.map(record => [
      record.nome_completo,
      record.cargo_atual || '-',
      record.setor_atual || '-',
      record.tipo_turnover,
      record.data_admissao ? formatDateForDisplay(record.data_admissao) : '-',
      record.data_demissao ? formatDateForDisplay(record.data_demissao) : '-',
      record.tipo_turnover === 'Demissão' ? (record.motivo_demissao || '-') : '-'
    ]);

    autoTable(doc, {
      head: [[
        'Nome',
        'Função', 
        'Setor',
        'Tipo de Turnover',
        'Data de Admissão',
        'Data de Desligamento',
        'Motivo da Demissão'
      ]],
      body: tableData,
      startY: 40,
      styles: {
        fontSize: 7,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 35 },
        2: { cellWidth: 30 },
        3: { cellWidth: 25 },
        4: { cellWidth: 25 },
        5: { cellWidth: 25 },
        6: { cellWidth: 50 }
      }
    });

    doc.save('relatorio-turnover.pdf');
  };

  // Exportar para Excel
  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    const worksheetData = [
      [
        'Nome',
        'Função', 
        'Setor',
        'Tipo de Turnover',
        'Data de Admissão',
        'Data de Desligamento',
        'Motivo da Demissão'
      ],
      ...filteredData.map(record => [
        record.nome_completo,
        record.cargo_atual || '',
        record.setor_atual || '',
        record.tipo_turnover,
        record.data_admissao ? formatDateForDisplay(record.data_admissao) : '',
        record.data_demissao ? formatDateForDisplay(record.data_demissao) : '',
        record.tipo_turnover === 'Demissão' ? (record.motivo_demissao || '') : ''
      ])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Turnover');
    XLSX.writeFile(workbook, 'relatorio-turnover.xlsx');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Relatórios</h1>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Gestão de Turnover</CardTitle>
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
            <div className="lg:col-span-2">
              <Input
                placeholder="Buscar por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>

            <Select value={filterCargo} onValueChange={setFilterCargo}>
              <SelectTrigger>
                <SelectValue placeholder="Função" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as funções</SelectItem>
                {uniqueCargos.map((cargo) => (
                  <SelectItem key={cargo} value={cargo}>
                    {cargo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterSetor} onValueChange={setFilterSetor}>
              <SelectTrigger>
                <SelectValue placeholder="Setor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os setores</SelectItem>
                {uniqueSetores.map((setor) => (
                  <SelectItem key={setor} value={setor}>
                    {setor}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo de Turnover" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="Admissão">Admissão</SelectItem>
                <SelectItem value="Demissão">Demissão</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterPeriodo} onValueChange={setFilterPeriodo}>
              <SelectTrigger>
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os períodos</SelectItem>
                <SelectItem value="mes_atual">Mês Atual</SelectItem>
                <SelectItem value="ultimos_3_meses">Últimos 3 Meses</SelectItem>
                <SelectItem value="ultimos_6_meses">Últimos 6 Meses</SelectItem>
                <SelectItem value="ultimo_ano">Último Ano</SelectItem>
                <SelectItem value="custom">Período Personalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Filtro de período personalizado */}
          {filterPeriodo === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Data Início</label>
                <Input
                  type="date"
                  value={dataInicio}
                  onChange={(e) => setDataInicio(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Data Fim</label>
                <Input
                  type="date"
                  value={dataFim}
                  onChange={(e) => setDataFim(e.target.value)}
                />
              </div>
            </div>
          )}

          {/* Resumo */}
          <div className="mb-4 text-sm text-muted-foreground">
            Exibindo {filteredData.length} de {turnoverData.length} registros
          </div>

          {/* Tabela */}
          <div className="rounded-md border overflow-x-auto max-h-[600px] overflow-y-auto">
            <Table className="min-w-max">
              <TableHeader className="sticky top-0 bg-background z-10">
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Tipo de Turnover</TableHead>
                  <TableHead>Data de Admissão</TableHead>
                  <TableHead>Data de Desligamento</TableHead>
                  <TableHead>Motivo da Demissão</TableHead>
                  <TableHead className="text-center">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Nenhum registro encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredData.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.nome_completo}</TableCell>
                      <TableCell>{record.cargo_atual || '-'}</TableCell>
                      <TableCell>{record.setor_atual || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={record.tipo_turnover === 'Admissão' ? 'default' : 'destructive'}>
                          {record.tipo_turnover}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {record.data_admissao ? formatDateForDisplay(record.data_admissao) : '-'}
                      </TableCell>
                      <TableCell>
                        {record.data_demissao ? formatDateForDisplay(record.data_demissao) : '-'}
                      </TableCell>
                      <TableCell>
                        {record.tipo_turnover === 'Demissão' ? (record.motivo_demissao || '-') : '-'}
                      </TableCell>
                      <TableCell className="text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewFuncionario(record.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Visualizar
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
