import { useState, useEffect, useMemo } from 'react';
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
import { Download, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { formatDateForDisplay } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { type Empresa } from '@/hooks/useUserEmpresas';
import { useUserEmpresas } from '@/hooks/useUserEmpresas';
import { usePermissions } from '@/hooks/usePermissions';

interface Funcionario {
  id: string;
  nome_completo: string;
  cargo_atual: string | null;
  setor_atual: string | null;
  data_admissao: string | null;
  tipo_contrato: string | null;
  rg: string | null;
  cpf: string | null;
  ctps: string | null;
  serie: string | null;
  pis: string | null;
  telefone: string | null;
  email: string | null;
  data_demissao: string | null;
  empresa_id: string;
  empresa_nome?: string;
}

interface RelatoriosProps {
  currentEmpresa: Empresa | null;
  isGroupView?: boolean;
  currentGroupId?: string | null;
}

export const Relatorios = ({ currentEmpresa, isGroupView, currentGroupId }: RelatoriosProps) => {
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEmpresa, setFilterEmpresa] = useState<string>('all');
  const [filterSetor, setFilterSetor] = useState<string>('all');
  const [filterCargo, setFilterCargo] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  
  const { user } = useAuth();
  const { empresas } = useUserEmpresas();
  const { isSuperAdmin, hasPermission, isLoading: permissionsLoading } = usePermissions(currentEmpresa?.id);
  
  // Verificar se pode ver dados sensíveis
  const canViewSensitiveData = isSuperAdmin || hasPermission('func.dados_sensiveis');

  // Carregar funcionários
  const loadFuncionarios = async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Usar função segura que aplica mascaramento baseado em role
      const { data, error } = await supabase.rpc('funcionarios_safe');

      if (error) throw error;

      let filteredData = data || [];

      if (isGroupView && currentGroupId) {
        // Buscar funcionários de todas as empresas do grupo
        const empresasDoGrupo = empresas.filter(emp => emp.grupo_empresarial.id === currentGroupId);
        const empresaIds = empresasDoGrupo.map(emp => emp.id);
        
        if (empresaIds.length > 0) {
          filteredData = filteredData.filter(f => empresaIds.includes(f.empresa_id));
        }
      } else if (currentEmpresa) {
        filteredData = filteredData.filter(f => f.empresa_id === currentEmpresa.id);
      }

      // Enriquecer dados com nome da empresa e ordenar
      const funcionariosComEmpresa = filteredData
        .map(funcionario => {
          const empresa = empresas.find(emp => emp.id === funcionario.empresa_id);
          return {
            ...funcionario,
            empresa_nome: empresa?.fantasia || 'Empresa não encontrada'
          };
        })
        .sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));

      setFuncionarios(funcionariosComEmpresa);
    } catch (error) {
      console.error('Erro ao carregar funcionários:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFuncionarios();
  }, [user, currentEmpresa, isGroupView, currentGroupId, empresas]);

  // Calcular tempo de empresa
  const calculateWorkTime = (dataAdmissao: string | null): string => {
    if (!dataAdmissao) return '-';

    const admissao = new Date(dataAdmissao);
    const hoje = new Date();
    
    let anos = hoje.getFullYear() - admissao.getFullYear();
    let meses = hoje.getMonth() - admissao.getMonth();
    
    if (meses < 0) {
      anos--;
      meses += 12;
    }
    
    if (anos === 0) {
      return `${meses} ${meses !== 1 ? 'meses' : 'mês'}`;
    } else if (meses === 0) {
      return `${anos} ano${anos !== 1 ? 's' : ''}`;
    } else {
      return `${anos} ano${anos !== 1 ? 's' : ''} e ${meses} ${meses !== 1 ? 'meses' : 'mês'}`;
    }
  };

  // Funcionários filtrados
  const filteredFuncionarios = useMemo(() => {
    return funcionarios.filter((funcionario) => {
      const normalizedSearchTerm = removeAccents(searchTerm.toLowerCase());
      const matchesSearch = searchTerm === '' || 
        removeAccents(funcionario.nome_completo.toLowerCase()).includes(normalizedSearchTerm);
      
      const matchesEmpresa = filterEmpresa === 'all' || funcionario.empresa_id === filterEmpresa;
      const matchesSetor = filterSetor === 'all' || funcionario.setor_atual === filterSetor;
      const matchesCargo = filterCargo === 'all' || funcionario.cargo_atual === filterCargo;
      
      let matchesStatus = true;
      if (filterStatus === 'ativo') {
        matchesStatus = !funcionario.data_demissao;
      } else if (filterStatus === 'demitido') {
        matchesStatus = !!funcionario.data_demissao;
      }
      
      return matchesSearch && matchesEmpresa && matchesSetor && matchesCargo && matchesStatus;
    });
  }, [funcionarios, searchTerm, filterEmpresa, filterSetor, filterCargo, filterStatus]);

  // Obter listas únicas para filtros
  const uniqueEmpresas = useMemo(() => {
    const empresasUnicas = Array.from(new Set(funcionarios.map(f => f.empresa_id)))
      .map(id => funcionarios.find(f => f.empresa_id === id))
      .filter(Boolean);
    return empresasUnicas;
  }, [funcionarios]);

  const uniqueSetores = useMemo(() => {
    return Array.from(new Set(funcionarios.map(f => f.setor_atual).filter(Boolean)));
  }, [funcionarios]);

  const uniqueCargos = useMemo(() => {
    return Array.from(new Set(funcionarios.map(f => f.cargo_atual).filter(Boolean)));
  }, [funcionarios]);

  // Exportar para PDF
  const exportToPDF = () => {
    const doc = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    // Título
    doc.setFontSize(16);
    doc.text('Relatório de Gestão de Funcionários', 14, 20);
    
    // Data
    doc.setFontSize(10);
    doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 30);

    // Preparar dados para a tabela
    const tableData = filteredFuncionarios.map(funcionario => [
      funcionario.nome_completo,
      funcionario.cargo_atual || '-',
      funcionario.setor_atual || '-',
      funcionario.data_admissao ? formatDateForDisplay(funcionario.data_admissao) : '-',
      calculateWorkTime(funcionario.data_admissao),
      funcionario.tipo_contrato || '-',
      canViewSensitiveData ? (funcionario.rg || '-') : '***',
      canViewSensitiveData ? (funcionario.cpf || '-') : '***',
      canViewSensitiveData ? (funcionario.ctps || '-') : '***',
      canViewSensitiveData ? (funcionario.serie || '-') : '***',
      canViewSensitiveData ? (funcionario.pis || '-') : '***',
      canViewSensitiveData ? (funcionario.telefone || '-') : '***',
      canViewSensitiveData ? (funcionario.email || '-') : '***'
    ]);

    // Configurar tabela
    autoTable(doc, {
      head: [[
        'Nome Completo',
        'Cargo', 
        'Setor',
        'Admissão',
        'Tempo Empresa',
        'Tipo Contrato',
        'RG',
        'CPF',
        'CTPS',
        'Série',
        'PIS',
        'Telefone',
        'E-mail'
      ]],
      body: tableData,
      startY: 40,
      styles: {
        fontSize: 6,
        cellPadding: 1
      },
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255
      },
      columnStyles: {
        0: { cellWidth: 25 }, // Nome
        1: { cellWidth: 20 }, // Cargo
        2: { cellWidth: 20 }, // Setor
        3: { cellWidth: 18 }, // Admissão
        4: { cellWidth: 20 }, // Tempo
        5: { cellWidth: 18 }, // Tipo contrato
        6: { cellWidth: 18 }, // RG
        7: { cellWidth: 22 }, // CPF
        8: { cellWidth: 18 }, // CTPS
        9: { cellWidth: 12 }, // Série
        10: { cellWidth: 18 }, // PIS
        11: { cellWidth: 18 }, // Telefone
        12: { cellWidth: 25 } // Email
      }
    });

    doc.save('relatorio-funcionarios.pdf');
  };

  // Exportar para Excel
  const exportToExcel = () => {
    const workbook = XLSX.utils.book_new();
    
    const worksheetData = [
      [
        'Nome Completo',
        'Cargo', 
        'Setor',
        'Admissão',
        'Tempo de Empresa',
        'Tipo de Contrato',
        'Nº RG',
        'Nº CPF',
        'Nº CTPS',
        'Série',
        'Nº PIS',
        'Telefone',
        'E-mail',
        'Status'
      ],
      ...filteredFuncionarios.map(funcionario => [
        funcionario.nome_completo,
        funcionario.cargo_atual || '',
        funcionario.setor_atual || '',
        funcionario.data_admissao ? formatDateForDisplay(funcionario.data_admissao) : '',
        calculateWorkTime(funcionario.data_admissao),
        funcionario.tipo_contrato || '',
        canViewSensitiveData ? (funcionario.rg || '') : '***',
        canViewSensitiveData ? (funcionario.cpf || '') : '***',
        canViewSensitiveData ? (funcionario.ctps || '') : '***',
        canViewSensitiveData ? (funcionario.serie || '') : '***',
        canViewSensitiveData ? (funcionario.pis || '') : '***',
        canViewSensitiveData ? (funcionario.telefone || '') : '***',
        canViewSensitiveData ? (funcionario.email || '') : '***',
        funcionario.data_demissao ? 'Demitido' : 'Ativo'
      ])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Funcionários');
    XLSX.writeFile(workbook, 'relatorio-funcionarios.xlsx');
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
            <CardTitle>Gestão de Funcionários</CardTitle>
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
            
            {isGroupView && (
              <Select value={filterEmpresa} onValueChange={setFilterEmpresa}>
                <SelectTrigger>
                  <SelectValue placeholder="Empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as empresas</SelectItem>
                  {uniqueEmpresas.map((funcionario) => (
                    <SelectItem key={funcionario.empresa_id} value={funcionario.empresa_id}>
                      {funcionario.empresa_nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

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

            <Select value={filterCargo} onValueChange={setFilterCargo}>
              <SelectTrigger>
                <SelectValue placeholder="Cargo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os cargos</SelectItem>
                {uniqueCargos.map((cargo) => (
                  <SelectItem key={cargo} value={cargo}>
                    {cargo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="ativo">Ativos</SelectItem>
                <SelectItem value="demitido">Demitidos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Resumo */}
          <div className="mb-4 text-sm text-muted-foreground">
            Exibindo {filteredFuncionarios.length} de {funcionarios.length} funcionários
          </div>

          {/* Tabela */}
          <div className="rounded-md border overflow-x-auto">
            <Table className="min-w-max">
              <TableHeader>
                <TableRow>
                  <TableHead>Nome Completo</TableHead>
                  <TableHead>Cargo</TableHead>
                  <TableHead>Setor</TableHead>
                  <TableHead>Admissão</TableHead>
                  <TableHead>Tempo de Empresa</TableHead>
                  <TableHead>Tipo de Contrato</TableHead>
                  <TableHead>Nº RG</TableHead>
                  <TableHead>Nº CPF</TableHead>
                  <TableHead>Nº CTPS</TableHead>
                  <TableHead>Série</TableHead>
                  <TableHead>Nº PIS</TableHead>
                  <TableHead>Telefone</TableHead>
                  <TableHead>E-mail</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredFuncionarios.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={14} className="text-center py-8">
                      Nenhum funcionário encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredFuncionarios.map((funcionario) => (
                    <TableRow key={funcionario.id}>
                      <TableCell className="font-medium">{funcionario.nome_completo}</TableCell>
                      <TableCell>{funcionario.cargo_atual || '-'}</TableCell>
                      <TableCell>{funcionario.setor_atual || '-'}</TableCell>
                      <TableCell>
                        {funcionario.data_admissao ? formatDateForDisplay(funcionario.data_admissao) : '-'}
                      </TableCell>
                      <TableCell>{calculateWorkTime(funcionario.data_admissao)}</TableCell>
                      <TableCell>{funcionario.tipo_contrato || '-'}</TableCell>
                      <TableCell>{canViewSensitiveData ? (funcionario.rg || '-') : '***'}</TableCell>
                      <TableCell>{canViewSensitiveData ? (funcionario.cpf || '-') : '***'}</TableCell>
                      <TableCell>{canViewSensitiveData ? (funcionario.ctps || '-') : '***'}</TableCell>
                      <TableCell>{canViewSensitiveData ? (funcionario.serie || '-') : '***'}</TableCell>
                      <TableCell>{canViewSensitiveData ? (funcionario.pis || '-') : '***'}</TableCell>
                      <TableCell>{canViewSensitiveData ? (funcionario.telefone || '-') : '***'}</TableCell>
                      <TableCell>{canViewSensitiveData ? (funcionario.email || '-') : '***'}</TableCell>
                      <TableCell>
                        <Badge variant={funcionario.data_demissao ? "destructive" : "default"}>
                          {funcionario.data_demissao ? 'Demitido' : 'Ativo'}
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