import { useState, useEffect, useMemo } from 'react';
import { formatDateForDisplay } from '@/lib/utils';
import { Plus, Eye, Edit, Trash2, Download, FileText, ChevronDown, ChevronUp, Search, Filter, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DocumentUpload } from './DocumentUpload';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface Documento {
  id: string;
  nome_documento: string;
  tipo: string;
  data_vigencia_inicio: string | null;
  data_vigencia_fim: string | null;
  documento_url: string | null;
  observacao: string | null;
  situacao: string;
  status_valido: boolean;
}

interface DocumentosManagerProps {
  entityId: string;
  entityType: 'terceirizado' | 'colaborador';
  empresaId: string;
  disabled?: boolean;
}

export function DocumentosManager({ entityId, entityType, empresaId, disabled = false }: DocumentosManagerProps) {
  const { toast } = useToast();
  const [documentos, setDocumentos] = useState<Documento[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [observacaoDialogOpen, setObservacaoDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [lancamentoDialogOpen, setLancamentoDialogOpen] = useState(false);
  const [editingDocumento, setEditingDocumento] = useState<Documento | null>(null);
  const [selectedObservacao, setSelectedObservacao] = useState('');
  const [documentoToDelete, setDocumentoToDelete] = useState<string | null>(null);
  
  const [lancamentoData, setLancamentoData] = useState({
    categoria: '',
    data_vigencia_inicio: '',
    data_vigencia_fim: '',
  });

  const [scopeDialogOpen, setScopeDialogOpen] = useState(false);
  const [pendingLancamento, setPendingLancamento] = useState<any>(null);

  // Collapsible states (closed by default)
  const [geralOpen, setGeralOpen] = useState(false);
  const [anualOpen, setAnualOpen] = useState(false);
  const [mensalOpen, setMensalOpen] = useState(false);

  // Centralized filters (automatic application)
  const [nomeFilter, setNomeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [situacaoFilter, setSituacaoFilter] = useState('');
  const [mesFilter, setMesFilter] = useState('');
  const [anoFilter, setAnoFilter] = useState('');
  const [vigenciaInicioFilter, setVigenciaInicioFilter] = useState('');
  const [vigenciaFimFilter, setVigenciaFimFilter] = useState('');

  const [formData, setFormData] = useState({
    nome_documento: '',
    tipo: 'Mensal',
    data_vigencia_inicio: '',
    data_vigencia_fim: '',
    documento_url: '',
    observacao: '',
    situacao: 'Não Enviado',
    status_valido: false,
  });

  const tableName = entityType === 'terceirizado' 
    ? 'documentos_terceirizados' 
    : 'documentos_colaboradores_terceirizados';
  
  const idField = entityType === 'terceirizado' ? 'terceirizado_id' : 'colaborador_id';

  useEffect(() => {
    loadDocumentos();
  }, [entityId, entityType]);

  const loadDocumentos = async () => {
    try {
      setLoading(true);
      const query = supabase
        .from(tableName as any)
        .select('*')
        .eq(idField, entityId)
        .order('data_vigencia_fim', { ascending: true, nullsFirst: false });

      const { data, error } = await query;

      if (error) throw error;
      setDocumentos((data as any) || []);
    } catch (error) {
      console.error('Erro ao carregar documentos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os documentos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!formData.nome_documento) {
      toast({
        title: "Erro",
        description: "O nome do documento é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Auto-set status_valido to true for Monthly documents when situacao becomes "Recebido"
      let statusValido = formData.status_valido;
      if (formData.tipo === 'Mensal' && formData.situacao === 'Recebido') {
        statusValido = true;
      }

      const payload: any = {
        [idField]: entityId,
        empresa_id: empresaId,
        nome_documento: formData.nome_documento,
        tipo: formData.tipo,
        data_vigencia_inicio: formData.data_vigencia_inicio || null,
        data_vigencia_fim: formData.data_vigencia_fim || null,
        documento_url: formData.documento_url || null,
        observacao: formData.observacao || null,
        situacao: formData.situacao,
        status_valido: statusValido,
      };

      if (editingDocumento) {
        const { error } = await supabase
          .from(tableName)
          .update(payload)
          .eq('id', editingDocumento.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Documento atualizado com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from(tableName)
          .insert([payload]);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Documento adicionado com sucesso.",
        });
      }

      setDialogOpen(false);
      resetForm();
      loadDocumentos();
    } catch (error) {
      console.error('Erro ao salvar documento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o documento.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!documentoToDelete) return;

    try {
      // First, get the document to check if it has an attachment
      const documento = documentos.find(doc => doc.id === documentoToDelete);
      
      // If document has an attachment, delete it from storage
      if (documento?.documento_url) {
        await handleDeleteAttachment(documento.documento_url);
      }

      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', documentoToDelete);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Documento excluído com sucesso.",
      });

      setDeleteDialogOpen(false);
      setDocumentoToDelete(null);
      loadDocumentos();
    } catch (error) {
      console.error('Erro ao excluir documento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o documento.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAttachment = async (documentUrl: string) => {
    try {
      // Extract file path from public URL
      const urlParts = documentUrl.split('/documentos/');
      if (urlParts.length < 2) return;
      
      const filePath = urlParts[1];
      
      const { error } = await supabase.storage
        .from('documentos')
        .remove([filePath]);

      if (error) {
        console.error('Erro ao excluir anexo do storage:', error);
      }
    } catch (error) {
      console.error('Erro ao processar exclusão do anexo:', error);
    }
  };

  const handleRemoveAttachment = async () => {
    if (!formData.documento_url) return;

    try {
      await handleDeleteAttachment(formData.documento_url);
      
      setFormData({ ...formData, documento_url: '' });
      
      toast({
        title: "Sucesso",
        description: "Anexo removido com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao remover anexo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível remover o anexo.",
        variant: "destructive",
      });
    }
  };

  const handleLancarDocumentosPadrao = async () => {
    if (!lancamentoData.categoria) {
      toast({
        title: "Erro",
        description: "Por favor, selecione uma categoria.",
        variant: "destructive",
      });
      return;
    }

    // Validar datas para Anual e Mensal
    if (lancamentoData.categoria !== 'Geral') {
      if (!lancamentoData.data_vigencia_inicio || !lancamentoData.data_vigencia_fim) {
        toast({
          title: "Erro",
          description: "Por favor, informe as datas de vigência para documentos Anuais ou Mensais.",
          variant: "destructive",
        });
        return;
      }
    }

    // Se for colaborador terceirizado, perguntar o escopo
    if (entityType === 'colaborador') {
      setPendingLancamento(lancamentoData);
      setLancamentoDialogOpen(false);
      setScopeDialogOpen(true);
      return;
    }

    // Se for terceirizado, processar direto
    await processarLancamento(entityId, lancamentoData);
  };

  const processarLancamento = async (targetEntityId: string, data: typeof lancamentoData, skipReload = false) => {
    try {
      // Buscar grupo empresarial da empresa atual
      const { data: empresaAtual } = await supabase
        .from('empresas')
        .select('grupo_empresarial_id')
        .eq('id', empresaId)
        .single();

      if (!empresaAtual) {
        toast({
          title: "Erro",
          description: "Empresa não encontrada.",
          variant: "destructive",
        });
        return false;
      }

      // Buscar todas as empresas do mesmo grupo empresarial
      const { data: empresasGrupo, error: empresasError } = await supabase
        .from('empresas')
        .select('id')
        .eq('grupo_empresarial_id', empresaAtual.grupo_empresarial_id);

      if (empresasError) throw empresasError;

      const empresaIds = (empresasGrupo || []).map((e: any) => e.id);

      // Se não encontrar nenhuma empresa no grupo, usa apenas a empresa atual como fallback
      if (empresaIds.length === 0) {
        empresaIds.push(empresaId);
      }

      // Buscar documentos padrão de qualquer empresa do mesmo grupo empresarial
      const { data: documentosPadrao, error: fetchError } = await supabase
        .from('documentos_padrao')
        .select('*')
        .in('empresa_id', empresaIds)
        .eq('tipo_aplicacao', entityType)
        .eq('categoria', data.categoria as any);

      if (fetchError) throw fetchError;

      if (!documentosPadrao || documentosPadrao.length === 0) {
        toast({
          title: "Aviso",
          description: "Não há documentos padrão cadastrados para esta categoria.",
          variant: "default",
        });
        return false;
      }

      // Criar documentos em lote
      const novosDocumentos = documentosPadrao.map(padrao => {
        const baseDoc: any = {
          empresa_id: empresaId,
          nome_documento: padrao.nome_documento,
          tipo: data.categoria === 'Geral' ? 'Indeterminado' : data.categoria,
          data_vigencia_inicio: data.categoria === 'Geral' ? null : (data.data_vigencia_inicio || null),
          data_vigencia_fim: data.categoria === 'Geral' ? null : (data.data_vigencia_fim || null),
          documento_url: null,
          observacao: padrao.observacao,
          situacao: 'Não Enviado'
        };
        baseDoc[idField] = targetEntityId;
        return baseDoc;
      });

      const { error: insertError } = await supabase
        .from(tableName)
        .insert(novosDocumentos);

      if (insertError) throw insertError;

      if (!skipReload) {
        setLancamentoDialogOpen(false);
        setLancamentoData({
          categoria: '',
          data_vigencia_inicio: '',
          data_vigencia_fim: '',
        });
        loadDocumentos();
      }

      return true;
    } catch (error) {
      console.error('Erro ao lançar documentos padrão:', error);
      toast({
        title: "Erro",
        description: "Não foi possível lançar os documentos padrão.",
        variant: "destructive",
      });
      return false;
    }
  };

  const handleScopeSelection = async (applyToAll: boolean) => {
    setScopeDialogOpen(false);
    
    if (!pendingLancamento) return;

    try {
      if (applyToAll) {
        // Buscar o terceirizado_id do colaborador atual
        const { data: colaboradorData, error: colaboradorError } = await supabase
          .from('colaboradores_terceirizados')
          .select('terceirizado_id')
          .eq('id', entityId)
          .single();

        if (colaboradorError) throw colaboradorError;

        // Buscar todos os colaboradores ativos deste terceirizado
        const { data: colaboradores, error: colaboradoresError } = await supabase
          .from('colaboradores_terceirizados')
          .select('id')
          .eq('terceirizado_id', colaboradorData.terceirizado_id)
          .eq('status', 'ativo');

        if (colaboradoresError) throw colaboradoresError;

        let successCount = 0;
        // Processar para cada colaborador sem recarregar entre cada um
        for (const colaborador of colaboradores || []) {
          const success = await processarLancamento(colaborador.id, pendingLancamento, true);
          if (success) successCount++;
        }

        // Recarregar apenas uma vez no final
        await loadDocumentos();

        toast({
          title: "Sucesso",
          description: `Documentos lançados para ${successCount} colaborador(es) ativo(s).`,
        });
      } else {
        // Processar apenas para o colaborador atual
        await processarLancamento(entityId, pendingLancamento, false);
      }

      setPendingLancamento(null);
      setLancamentoData({
        categoria: '',
        data_vigencia_inicio: '',
        data_vigencia_fim: '',
      });
    } catch (error) {
      console.error('Erro ao processar lançamento:', error);
      toast({
        title: "Erro",
        description: "Não foi possível lançar os documentos padrão.",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({
    nome_documento: '',
    tipo: 'Mensal',
    data_vigencia_inicio: '',
    data_vigencia_fim: '',
    documento_url: '',
    observacao: '',
    situacao: 'Não Enviado',
    status_valido: false,
    });
    setEditingDocumento(null);
  };

  const openEditDialog = (documento: Documento) => {
    setEditingDocumento(documento);
    setFormData({
      nome_documento: documento.nome_documento,
      tipo: documento.tipo,
      data_vigencia_inicio: documento.data_vigencia_inicio || '',
      data_vigencia_fim: documento.data_vigencia_fim || '',
      documento_url: documento.documento_url || '',
      observacao: documento.observacao || '',
      situacao: documento.situacao,
      status_valido: documento.status_valido || false,
    });
    setDialogOpen(true);
  };

  const openAddDialog = () => {
    resetForm();
    setDialogOpen(true);
  };

  const getStatusBadge = (dataFim: string | null, statusValido: boolean) => {
    // If status_valido is true, always show as Válido
    if (statusValido) {
      return <Badge className="bg-green-500 hover:bg-green-600">Válido</Badge>;
    }
    
    if (!dataFim) return <Badge variant="outline">Indeterminado</Badge>;
    
    // Compare strings in YYYY-MM-DD to avoid timezone issues
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    
    if (dataFim >= todayStr) {
      return <Badge className="bg-green-500 hover:bg-green-600">Válido</Badge>;
    } else {
      return <Badge variant="destructive">Vencido</Badge>;
    }
  };
  
  const getDocumentoStatus = (dataFim: string | null, statusValido: boolean): string => {
    // If status_valido is true, always return Válido
    if (statusValido) return 'Válido';
    
    if (!dataFim) return 'Indeterminado';
    
    // Compare strings in YYYY-MM-DD to avoid timezone issues
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    return dataFim >= todayStr ? 'Válido' : 'Vencido';
  };

  // Filter documents by type with automatic centralized filters
  const documentosGeral = useMemo(() => {
    let filtered = documentos.filter(doc => 
      doc.tipo === 'Outros' || doc.tipo === 'Indeterminado' || 
      (doc.tipo !== 'Anual' && doc.tipo !== 'Mensal')
    );

    if (nomeFilter) {
      filtered = filtered.filter(doc => 
        doc.nome_documento.toLowerCase().includes(nomeFilter.toLowerCase())
      );
    }
    if (statusFilter) {
      filtered = filtered.filter(doc => 
        getDocumentoStatus(doc.data_vigencia_fim, doc.status_valido) === statusFilter
      );
    }
    if (situacaoFilter) {
      filtered = filtered.filter(doc => doc.situacao === situacaoFilter);
    }
    if (vigenciaInicioFilter) {
      filtered = filtered.filter(doc => 
        doc.data_vigencia_inicio && doc.data_vigencia_inicio >= vigenciaInicioFilter
      );
    }
    if (vigenciaFimFilter) {
      filtered = filtered.filter(doc => 
        doc.data_vigencia_fim && doc.data_vigencia_fim <= vigenciaFimFilter
      );
    }

    return filtered;
  }, [documentos, nomeFilter, statusFilter, situacaoFilter, vigenciaInicioFilter, vigenciaFimFilter]);

  const documentosAnual = useMemo(() => {
    let filtered = documentos.filter(doc => doc.tipo === 'Anual');

    if (nomeFilter) {
      filtered = filtered.filter(doc => 
        doc.nome_documento.toLowerCase().includes(nomeFilter.toLowerCase())
      );
    }
    if (statusFilter) {
      filtered = filtered.filter(doc => 
        getDocumentoStatus(doc.data_vigencia_fim, doc.status_valido) === statusFilter
      );
    }
    if (situacaoFilter) {
      filtered = filtered.filter(doc => doc.situacao === situacaoFilter);
    }
    if (vigenciaInicioFilter) {
      filtered = filtered.filter(doc => 
        doc.data_vigencia_inicio && doc.data_vigencia_inicio >= vigenciaInicioFilter
      );
    }
    if (vigenciaFimFilter) {
      filtered = filtered.filter(doc => 
        doc.data_vigencia_fim && doc.data_vigencia_fim <= vigenciaFimFilter
      );
    }

    return filtered;
  }, [documentos, nomeFilter, statusFilter, situacaoFilter, vigenciaInicioFilter, vigenciaFimFilter]);

  const documentosMensal = useMemo(() => {
    let filtered = documentos.filter(doc => doc.tipo === 'Mensal');

    if (nomeFilter) {
      filtered = filtered.filter(doc => 
        doc.nome_documento.toLowerCase().includes(nomeFilter.toLowerCase())
      );
    }
    if (statusFilter) {
      filtered = filtered.filter(doc => 
        getDocumentoStatus(doc.data_vigencia_fim, doc.status_valido) === statusFilter
      );
    }
    if (situacaoFilter) {
      filtered = filtered.filter(doc => doc.situacao === situacaoFilter);
    }
    if (vigenciaInicioFilter) {
      filtered = filtered.filter(doc => 
        doc.data_vigencia_inicio && doc.data_vigencia_inicio >= vigenciaInicioFilter
      );
    }
    if (vigenciaFimFilter) {
      filtered = filtered.filter(doc => 
        doc.data_vigencia_fim && doc.data_vigencia_fim <= vigenciaFimFilter
      );
    }
    if (mesFilter || anoFilter) {
      filtered = filtered.filter(doc => {
        if (!doc.data_vigencia_inicio && !doc.data_vigencia_fim) return false;
        
        const dataRef = doc.data_vigencia_fim || doc.data_vigencia_inicio;
        if (!dataRef) return false;
        
        const data = new Date(dataRef);
        const mes = String(data.getMonth() + 1).padStart(2, '0');
        const ano = String(data.getFullYear());

        const mesMatch = !mesFilter || mes === mesFilter;
        const anoMatch = !anoFilter || ano === anoFilter;

        return mesMatch && anoMatch;
      });
    }

    return filtered;
  }, [documentos, nomeFilter, statusFilter, situacaoFilter, mesFilter, anoFilter, vigenciaInicioFilter, vigenciaFimFilter]);

  const renderDocumentTable = (docs: Documento[]) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Documento</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Vigência</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Situação</TableHead>
          <TableHead>Anexo</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {docs.length === 0 ? (
          <TableRow>
            <TableCell colSpan={7} className="text-center text-muted-foreground">
              Nenhum documento nesta categoria
            </TableCell>
          </TableRow>
        ) : (
          docs.map((doc) => (
            <TableRow key={doc.id}>
              <TableCell className="font-medium">{doc.nome_documento}</TableCell>
              <TableCell>{doc.tipo}</TableCell>
              <TableCell>
                {doc.data_vigencia_inicio && doc.data_vigencia_fim
                  ? `${formatDateForDisplay(doc.data_vigencia_inicio)} - ${formatDateForDisplay(doc.data_vigencia_fim)}`
                  : '-'}
              </TableCell>
              <TableCell>{getStatusBadge(doc.data_vigencia_fim, doc.status_valido)}</TableCell>
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
              <TableCell>
                {doc.documento_url ? (
                  <a
                    href={doc.documento_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-primary hover:underline"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </a>
                ) : (
                  <FileText className="h-4 w-4 text-muted-foreground opacity-50" />
                )}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  {doc.observacao && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setSelectedObservacao(doc.observacao || '');
                        setObservacaoDialogOpen(true);
                      }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  )}
                  {!disabled && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEditDialog(doc)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setDocumentoToDelete(doc.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );

  if (loading) {
    return <div className="p-4">Carregando documentos...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold">Controle Documental</h3>
        {!disabled && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setLancamentoDialogOpen(true)}>
              <Sparkles className="h-4 w-4 mr-2" />
              Lançar Documentos Padrão
            </Button>
            <Button onClick={openAddDialog}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Documento
            </Button>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Buscar por nome do documento..."
                value={nomeFilter}
                onChange={(e) => setNomeFilter(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Select value={mesFilter} onValueChange={setMesFilter}>
              <SelectTrigger className="w-[140px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Mês" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">Todos</SelectItem>
                <SelectItem value="01">Janeiro</SelectItem>
                <SelectItem value="02">Fevereiro</SelectItem>
                <SelectItem value="03">Março</SelectItem>
                <SelectItem value="04">Abril</SelectItem>
                <SelectItem value="05">Maio</SelectItem>
                <SelectItem value="06">Junho</SelectItem>
                <SelectItem value="07">Julho</SelectItem>
                <SelectItem value="08">Agosto</SelectItem>
                <SelectItem value="09">Setembro</SelectItem>
                <SelectItem value="10">Outubro</SelectItem>
                <SelectItem value="11">Novembro</SelectItem>
                <SelectItem value="12">Dezembro</SelectItem>
              </SelectContent>
            </Select>
            <Input
              type="number"
              placeholder="Ano"
              value={anoFilter}
              onChange={(e) => setAnoFilter(e.target.value)}
              className="w-[100px]"
            />
            <Input
              type="date"
              placeholder="Vigência Início"
              value={vigenciaInicioFilter}
              onChange={(e) => setVigenciaInicioFilter(e.target.value)}
              className="w-[160px]"
            />
            <Input
              type="date"
              placeholder="Vigência Fim"
              value={vigenciaFimFilter}
              onChange={(e) => setVigenciaFimFilter(e.target.value)}
              className="w-[160px]"
            />
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">Todos</SelectItem>
                <SelectItem value="Válido">Válido</SelectItem>
                <SelectItem value="Vencido">Vencido</SelectItem>
                <SelectItem value="Indeterminado">Indeterminado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={situacaoFilter} onValueChange={setSituacaoFilter}>
              <SelectTrigger className="w-[150px]">
                <Filter className="h-4 w-4 mr-2" />
                <SelectValue placeholder="Situação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value=" ">Todos</SelectItem>
                <SelectItem value="Não Enviado">Não Enviado</SelectItem>
                <SelectItem value="Solicitado">Solicitado</SelectItem>
                <SelectItem value="Recebido">Recebido</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Seção 1: Documentação Geral */}
      <Collapsible open={geralOpen} onOpenChange={setGeralOpen}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Documentação Geral ({documentosGeral.length})</CardTitle>
                {geralOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {renderDocumentTable(documentosGeral)}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Seção 2: Documentos Anuais */}
      <Collapsible open={anualOpen} onOpenChange={setAnualOpen}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Documentos Anuais ({documentosAnual.length})</CardTitle>
                {anualOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {renderDocumentTable(documentosAnual)}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Seção 3: Documentos Mensais */}
      <Collapsible open={mensalOpen} onOpenChange={setMensalOpen}>
        <Card>
          <CollapsibleTrigger className="w-full">
            <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Documentos Mensais ({documentosMensal.length})</CardTitle>
                {mensalOpen ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
              </div>
            </CardHeader>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <CardContent>
              {renderDocumentTable(documentosMensal)}
            </CardContent>
          </CollapsibleContent>
        </Card>
      </Collapsible>

      {/* Dialog para adicionar/editar documento */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingDocumento ? 'Editar Documento' : 'Adicionar Documento'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div>
              <Label htmlFor="nome_documento">Nome do Documento *</Label>
              <Input
                id="nome_documento"
                value={formData.nome_documento}
                onChange={(e) => setFormData({ ...formData, nome_documento: e.target.value })}
                placeholder="Ex: Contrato Social"
              />
            </div>

            <div>
              <Label htmlFor="tipo">Tipo</Label>
              <Select
                value={formData.tipo}
                onValueChange={(value) => setFormData({ ...formData, tipo: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mensal">Mensal</SelectItem>
                  <SelectItem value="Anual">Anual</SelectItem>
                  <SelectItem value="Indeterminado">Indeterminado</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="situacao">Situação</Label>
                  <Select
                    value={formData.situacao}
                    onValueChange={(value) =>
                      setFormData({ ...formData, situacao: value })
                    }
                  >
                    <SelectTrigger id="situacao">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Não Enviado">Não Enviado</SelectItem>
                      <SelectItem value="Solicitado">Solicitado</SelectItem>
                      <SelectItem value="Recebido">Recebido</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="status_valido"
                    checked={formData.status_valido}
                    onChange={(e) => setFormData({ ...formData, status_valido: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <Label htmlFor="status_valido" className="text-sm font-normal cursor-pointer">
                    Forçar status como "Válido" (ignora vigência)
                  </Label>
                </div>

                <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="data_inicio">Data de Início</Label>
                <Input
                  id="data_inicio"
                  type="date"
                  value={formData.data_vigencia_inicio}
                  onChange={(e) =>
                    setFormData({ ...formData, data_vigencia_inicio: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="data_fim">Data de Fim</Label>
                <Input
                  id="data_fim"
                  type="date"
                  value={formData.data_vigencia_fim}
                  onChange={(e) =>
                    setFormData({ ...formData, data_vigencia_fim: e.target.value })
                  }
                />
              </div>
            </div>

            <div>
              <Label>Documento Anexado</Label>
              <Input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                disabled={disabled}
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  const MAX_MB = 5; // manter alinhado com outros uploads
                  if (file.size > MAX_MB * 1024 * 1024) {
                    toast({
                      title: "Erro",
                      description: `O arquivo deve ter no máximo ${MAX_MB}MB`,
                      variant: "destructive",
                    });
                    // limpa o input para permitir re-seleção do mesmo arquivo
                    e.currentTarget.value = '';
                    return;
                  }

                  // Delete old attachment if exists
                  if (formData.documento_url) {
                    await handleDeleteAttachment(formData.documento_url);
                  }

                  const safeName = file.name.replace(/\s+/g, '_');
                  const folder = `${empresaId}/${entityType}/${entityId}`;
                  const fileName = `${Date.now()}-${safeName}`;
                  const filePath = `${folder}/${fileName}`;

                  const { error: uploadError } = await supabase.storage
                    .from('documentos')
                    .upload(filePath, file, { upsert: true, contentType: file.type, cacheControl: '3600' });

                  if (uploadError) {
                    toast({
                      title: "Erro ao enviar",
                      description: uploadError.message || 'Erro ao fazer upload do arquivo',
                      variant: "destructive",
                    });
                    e.currentTarget.value = '';
                    return;
                  }

                  const { data: { publicUrl } } = supabase.storage
                    .from('documentos')
                    .getPublicUrl(filePath);

                  setFormData({ ...formData, documento_url: publicUrl });
                  toast({ title: 'Documento anexado', description: safeName });
                  // limpa o input para permitir re-seleção do mesmo arquivo
                  e.currentTarget.value = '';
                }}
              />
              {formData.documento_url && (
                <div className="flex items-center gap-2 mt-2">
                  <a href={formData.documento_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline flex-1">
                    Ver documento atual
                  </a>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleRemoveAttachment}
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="observacao">Observação</Label>
              <Textarea
                id="observacao"
                value={formData.observacao}
                onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                rows={4}
                placeholder="Observações sobre o documento..."
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para Lançar Documentos Padrão */}
      <Dialog open={lancamentoDialogOpen} onOpenChange={setLancamentoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Lançar Documentos Padrão</DialogTitle>
            <DialogDescription>
              Selecione a categoria e defina as datas de vigência quando aplicável.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="categoria">Categoria *</Label>
              <Select
                value={lancamentoData.categoria}
                onValueChange={(value) => setLancamentoData({ ...lancamentoData, categoria: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Geral">Geral</SelectItem>
                  <SelectItem value="Anual">Anual</SelectItem>
                  <SelectItem value="Mensal">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {lancamentoData.categoria && lancamentoData.categoria !== 'Geral' && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="vigencia_inicio">Data de Início da Vigência *</Label>
                  <Input
                    id="vigencia_inicio"
                    type="date"
                    value={lancamentoData.data_vigencia_inicio}
                    onChange={(e) =>
                      setLancamentoData({ ...lancamentoData, data_vigencia_inicio: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="vigencia_fim">Data de Fim da Vigência *</Label>
                  <Input
                    id="vigencia_fim"
                    type="date"
                    value={lancamentoData.data_vigencia_fim}
                    onChange={(e) =>
                      setLancamentoData({ ...lancamentoData, data_vigencia_fim: e.target.value })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setLancamentoDialogOpen(false);
              setLancamentoData({
                categoria: '',
                data_vigencia_inicio: '',
                data_vigencia_fim: '',
              });
            }}>
              Cancelar
            </Button>
            <Button onClick={handleLancarDocumentosPadrao}>Confirmar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog para visualizar observação */}
      <Dialog open={observacaoDialogOpen} onOpenChange={setObservacaoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Observação</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm whitespace-pre-wrap">{selectedObservacao}</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este documento? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDocumentoToDelete(null)}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Dialog para escolher escopo de aplicação (colaborador) */}
      <Dialog open={scopeDialogOpen} onOpenChange={setScopeDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aplicar Documentos Padrão</DialogTitle>
          </DialogHeader>
          <DialogDescription>
            Deseja gerar documentos para todos os funcionários ativos desta terceirizada ou apenas para o funcionário atual?
          </DialogDescription>
          <DialogFooter className="flex gap-2">
            <Button 
              variant="outline" 
              onClick={() => {
                setScopeDialogOpen(false);
                setPendingLancamento(null);
              }}
            >
              Cancelar
            </Button>
            <Button 
              variant="outline" 
              onClick={() => handleScopeSelection(false)}
            >
              👤 Somente este funcionário
            </Button>
            <Button onClick={() => handleScopeSelection(true)}>
              ✅ Todos os funcionários ativos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
