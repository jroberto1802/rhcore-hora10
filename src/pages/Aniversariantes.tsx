import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { FileDown, Calendar, Gift } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { type Empresa } from '@/hooks/useUserEmpresas';
import { toast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format, differenceInYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface Funcionario {
  id: string;
  nome_completo: string;
  data_nascimento: string | null;
  empresa_id: string;
  setor_atual: string | null;
  cargo_atual: string | null;
  data_demissao: string | null;
  empresa_fantasia?: string;
}

interface AniversariantesProps {
  currentEmpresa: Empresa | null;
  isGroupView?: boolean;
  currentGroupId?: string | null;
}

const meses = [
  { value: '1', label: 'Janeiro' },
  { value: '2', label: 'Fevereiro' },
  { value: '3', label: 'Março' },
  { value: '4', label: 'Abril' },
  { value: '5', label: 'Maio' },
  { value: '6', label: 'Junho' },
  { value: '7', label: 'Julho' },
  { value: '8', label: 'Agosto' },
  { value: '9', label: 'Setembro' },
  { value: '10', label: 'Outubro' },
  { value: '11', label: 'Novembro' },
  { value: '12', label: 'Dezembro' },
];

export function Aniversariantes({ currentEmpresa, isGroupView, currentGroupId }: AniversariantesProps) {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [empresas, setEmpresas] = useState<{id: string, fantasia: string}[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmpresas, setSelectedEmpresas] = useState<string[]>([]);
  const [selectedSetor, setSelectedSetor] = useState<string>('');
  const [selectedMes, setSelectedMes] = useState<string>('');
  const [sortBy, setSortBy] = useState<'nome' | 'mes' | 'idade'>('nome');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const { user } = useAuth();

  useEffect(() => {
    if (!user) return;
    
    const fetchFuncionarios = async () => {
      try {
        setLoading(true);
        
        let empresaIds: string[] = [];
        let empresasData: {id: string, fantasia: string}[] = [];

        if (isGroupView && currentGroupId) {
          // Buscar empresas do grupo
          const { data: empresasGrupo } = await supabase
            .from('empresas')
            .select('id, fantasia')
            .eq('grupo_empresarial_id', currentGroupId);
          
          if (empresasGrupo && empresasGrupo.length > 0) {
            empresaIds = empresasGrupo.map(e => e.id);
            empresasData = empresasGrupo;
          }
        } else if (currentEmpresa) {
          empresaIds = [currentEmpresa.id];
          empresasData = [{ id: currentEmpresa.id, fantasia: currentEmpresa.fantasia }];
        } else {
          // Buscar empresas do usuário
          const { data: userEmpresas } = await supabase
            .from('usuarios_empresas')
            .select('empresa_id')
            .eq('user_id', user.id);
          
          if (userEmpresas && userEmpresas.length > 0) {
            empresaIds = userEmpresas.map(ue => ue.empresa_id);
            
            // Buscar detalhes das empresas
            const { data: empresasDetalhes } = await supabase
              .from('empresas')
              .select('id, fantasia')
              .in('id', empresaIds);
            
            empresasData = empresasDetalhes || [];
          }
        }

        setEmpresas(empresasData);

        if (empresaIds.length === 0) {
          setFuncionarios([]);
          return;
        }

        // Use funcionarios_safe() RPC to respect role-based access to sensitive data
        const { data: allData, error } = await supabase
          .rpc('funcionarios_safe');

        if (error) {
          throw error;
        }

        // Filter data to match previous query logic
        const data = (allData || [])
          .filter((f: any) => 
            f.data_demissao === null && // Apenas funcionários ativos
            f.data_nascimento !== null && // Apenas com data de nascimento
            empresaIds.includes(f.empresa_id)
          );

        // Criar mapa de empresas para lookup rápido
        const empresaMap = new Map(empresasData.map(e => [e.id, e.fantasia]));

        const funcionariosComEmpresa = (data || []).map(funcionario => ({
          ...funcionario,
          empresa_fantasia: empresaMap.get(funcionario.empresa_id) || ''
        }));

        setFuncionarios(funcionariosComEmpresa);
      } catch (err) {
        console.error('Erro ao buscar funcionários:', err);
        toast({
          title: "Erro",
          description: "Erro ao carregar dados dos aniversariantes",
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchFuncionarios();
  }, [user, currentEmpresa, isGroupView, currentGroupId]);

  const calculateAge = (dataNascimento: string): number => {
    return differenceInYears(new Date(), new Date(dataNascimento + 'T00:00:00'));
  };

  const getMonthFromDate = (dataNascimento: string): number => {
    return new Date(dataNascimento + 'T00:00:00').getMonth() + 1;
  };

  const getDayMonthFromDate = (dataNascimento: string): string => {
    const date = new Date(dataNascimento + 'T00:00:00');
    const day = date.getDate().toString().padStart(2, '0');
    const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 
                       'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const month = monthNames[date.getMonth()];
    return `${day}/${month}`;
  };

  const filteredFuncionarios = useMemo(() => {
    let filtered = funcionarios.filter(funcionario => {
      const matchesSearch = funcionario.nome_completo
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      
      const matchesEmpresa = selectedEmpresas.length === 0 || 
        selectedEmpresas.includes(funcionario.empresa_id);
      
      const matchesSetor = selectedSetor === 'todos' || !selectedSetor || 
        funcionario.setor_atual === selectedSetor;
      
      const matchesMes = selectedMes === 'todos' || !selectedMes || 
        getMonthFromDate(funcionario.data_nascimento!).toString() === selectedMes;

      return matchesSearch && matchesEmpresa && matchesSetor && matchesMes;
    });

    // Ordenação
    filtered.sort((a, b) => {
      let comparison = 0;
      
      if (sortBy === 'nome') {
        comparison = a.nome_completo.localeCompare(b.nome_completo);
      } else if (sortBy === 'mes') {
        const mesA = getMonthFromDate(a.data_nascimento!);
        const mesB = getMonthFromDate(b.data_nascimento!);
        comparison = mesA - mesB;
      } else if (sortBy === 'idade') {
        const idadeA = calculateAge(a.data_nascimento!);
        const idadeB = calculateAge(b.data_nascimento!);
        comparison = idadeA - idadeB;
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }, [funcionarios, searchTerm, selectedEmpresas, selectedSetor, selectedMes, sortBy, sortOrder]);

  const uniqueEmpresas = useMemo(() => {
    return empresas;
  }, [empresas]);

  const uniqueSetores = useMemo(() => {
    return Array.from(new Set(funcionarios.map(f => f.setor_atual).filter(Boolean)));
  }, [funcionarios]);

  const handleSort = (column: 'nome' | 'mes' | 'idade') => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const exportToPDF = () => {
    const doc = new jsPDF();
    
    // Título
    doc.setFontSize(18);
    doc.text('Relatório de Aniversariantes', 20, 20);
    
    // Data de geração
    doc.setFontSize(10);
    doc.text(`Gerado em: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`, 20, 30);
    
    // Resumo
    doc.text(`Total de aniversariantes: ${filteredFuncionarios.length}`, 20, 40);
    
    // Tabela
    const tableData = filteredFuncionarios.map(funcionario => [
      funcionario.nome_completo,
      funcionario.data_nascimento ? format(new Date(funcionario.data_nascimento + 'T00:00:00'), 'dd/MM/yyyy') : '-',
      funcionario.data_nascimento ? calculateAge(funcionario.data_nascimento).toString() : '-',
      funcionario.empresa_fantasia || '-',
      funcionario.setor_atual || '-',
      funcionario.cargo_atual || '-',
      funcionario.data_nascimento ? getDayMonthFromDate(funcionario.data_nascimento) : '-'
    ]);

    (doc as any).autoTable({
      head: [['Nome Completo', 'Data Nascimento', 'Idade', 'Empresa', 'Setor', 'Cargo', 'Dia/Mês Aniversário']],
      body: tableData,
      startY: 50,
      styles: { fontSize: 8 },
      headStyles: { fillColor: [59, 130, 246] },
    });

    doc.save('aniversariantes.pdf');
  };

  const exportToExcel = () => {
    const excelData = filteredFuncionarios.map(funcionario => ({
      'Nome Completo': funcionario.nome_completo,
      'Data de Nascimento': funcionario.data_nascimento ? format(new Date(funcionario.data_nascimento + 'T00:00:00'), 'dd/MM/yyyy') : '',
      'Idade Atual': funcionario.data_nascimento ? calculateAge(funcionario.data_nascimento) : '',
      'Empresa': funcionario.empresa_fantasia || '',
      'Setor': funcionario.setor_atual || '',
      'Cargo': funcionario.cargo_atual || '',
      'Dia/Mês Aniversário': funcionario.data_nascimento ? getDayMonthFromDate(funcionario.data_nascimento) : ''
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Aniversariantes');
    XLSX.writeFile(wb, 'aniversariantes.xlsx');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Carregando aniversariantes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Gift className="h-5 w-5 text-primary" />
              <CardTitle className="text-xl">Relatório de Aniversariantes</CardTitle>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={exportToPDF}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <FileDown className="h-4 w-4" />
                PDF
              </Button>
              <Button
                onClick={exportToExcel}
                variant="outline"
                size="sm"
                className="flex items-center gap-2"
              >
                <FileDown className="h-4 w-4" />
                Excel
              </Button>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-6">
          {/* Filtros */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Nome do Funcionário</label>
              <Input
                placeholder="Buscar por nome..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Setor</label>
              <Select value={selectedSetor} onValueChange={setSelectedSetor}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os setores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os setores</SelectItem>
                  {uniqueSetores.map((setor) => (
                    <SelectItem key={setor} value={setor}>
                      {setor}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Mês de Aniversário</label>
              <Select value={selectedMes} onValueChange={setSelectedMes}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os meses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os meses</SelectItem>
                  {meses.map((mes) => (
                    <SelectItem key={mes.value} value={mes.value}>
                      {mes.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Ordenar por</label>
              <Select value={sortBy} onValueChange={(value: 'nome' | 'mes' | 'idade') => setSortBy(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="nome">Nome</SelectItem>
                  <SelectItem value="mes">Mês de Aniversário</SelectItem>
                  <SelectItem value="idade">Idade</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Resumo */}
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              Exibindo <strong>{filteredFuncionarios.length}</strong> de <strong>{funcionarios.length}</strong> aniversariantes
            </span>
          </div>

          {/* Tabela */}
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('nome')}
                  >
                    Nome Completo
                    {sortBy === 'nome' && (
                      <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </TableHead>
                  <TableHead>Data de Nascimento</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('idade')}
                  >
                    Idade Atual
                    {sortBy === 'idade' && (
                      <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleSort('mes')}
                  >
                    Dia/Mês de Aniversário
                    {sortBy === 'mes' && (
                      <span className="ml-1">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFuncionarios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Calendar className="h-8 w-8 text-muted-foreground" />
                        <p className="text-muted-foreground">Nenhum aniversariante encontrado</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFuncionarios.map((funcionario) => (
                    <TableRow key={funcionario.id}>
                      <TableCell className="font-medium">
                        {funcionario.nome_completo}
                      </TableCell>
                      <TableCell>
                        {funcionario.data_nascimento 
                          ? format(new Date(funcionario.data_nascimento + 'T00:00:00'), 'dd/MM/yyyy')
                          : '-'
                        }
                      </TableCell>
                      <TableCell>
                        {funcionario.data_nascimento 
                          ? `${calculateAge(funcionario.data_nascimento)} anos`
                          : '-'
                        }
                      </TableCell>
                      <TableCell>{funcionario.empresa_fantasia || '-'}</TableCell>
                      <TableCell>
                        {funcionario.setor_atual ? (
                          <Badge variant="secondary">{funcionario.setor_atual}</Badge>
                        ) : '-'}
                      </TableCell>
                      <TableCell>{funcionario.cargo_atual || '-'}</TableCell>
                      <TableCell>
                        {funcionario.data_nascimento && (
                          <Badge variant="outline">
                            {getDayMonthFromDate(funcionario.data_nascimento)}
                          </Badge>
                        )}
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
}