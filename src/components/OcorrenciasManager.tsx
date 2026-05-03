import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, FileText, Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDateForInput, formatDateForDatabase } from '@/lib/utils';
import { useAuth } from '@/hooks/useAuth';
import { useAuditLog } from '@/hooks/useAuditLog';
import { AuditLogFooter } from '@/components/AuditLogFooter';

interface Ocorrencia {
  id: string;
  data_ocorrencia: string;
  usuario_responsavel_id: string;
  usuario_responsavel_nome?: string;
  tipo_ocorrencia: string;
  descricao: string;
  anexo_url?: string;
  created_at: string;
}

interface OcorrenciasManagerProps {
  funcionarioId?: string;
  empresaId?: string;
  disabled?: boolean;
}

export function OcorrenciasManager({ funcionarioId, empresaId, disabled = false }: OcorrenciasManagerProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const { logChanges } = useAuditLog();
  const [ocorrencias, setOcorrencias] = useState<Ocorrencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingOcorrencia, setEditingOcorrencia] = useState<Ocorrencia | null>(null);
  const [expandedDescriptions, setExpandedDescriptions] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    data_ocorrencia: new Date().toISOString().split('T')[0],
    tipo_ocorrencia: '',
    descricao: '',
    anexo_url: ''
  });

  const resetForm = () => {
    setFormData({
      data_ocorrencia: new Date().toISOString().split('T')[0],
      tipo_ocorrencia: '',
      descricao: '',
      anexo_url: ''
    });
    setEditingOcorrencia(null);
  };

  const loadOcorrencias = async () => {
    if (!funcionarioId || !empresaId) return;

    try {
      setLoading(true);
      const { data: ocorrenciasData, error } = await supabase
        .from('ocorrencias')
        .select('*')
        .eq('funcionario_id', funcionarioId)
        .eq('empresa_id', empresaId)
        .order('data_ocorrencia', { ascending: false });

      if (error) throw error;

      // Buscar os nomes dos usuários separadamente
      const userIds = [...new Set((ocorrenciasData || []).map(o => o.usuario_responsavel_id))];
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('user_id, nome')
        .in('user_id', userIds);

      const userNamesMap = new Map(
        (profilesData || []).map(profile => [profile.user_id, profile.nome])
      );
      
      const ocorrenciasWithUserName = (ocorrenciasData || []).map(ocorrencia => ({
        ...ocorrencia,
        usuario_responsavel_nome: userNamesMap.get(ocorrencia.usuario_responsavel_id) || 'Usuário desconhecido'
      }));
      
      setOcorrencias(ocorrenciasWithUserName);
    } catch (error) {
      console.error('Erro ao carregar ocorrências:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as ocorrências.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (funcionarioId && empresaId) {
      loadOcorrencias();
    }
  }, [funcionarioId, empresaId]);

  const handleSubmit = async () => {
    if (!funcionarioId || !empresaId || !user) {
      toast({
        title: "Erro",
        description: "Dados do funcionário ou usuário não disponíveis.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.tipo_ocorrencia || !formData.descricao) {
      toast({
        title: "Erro",
        description: "Tipo de ocorrência e descrição são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const ocorrenciaData = {
        funcionario_id: funcionarioId,
        empresa_id: empresaId,
        usuario_responsavel_id: user.id,
        data_ocorrencia: formatDateForDatabase(formData.data_ocorrencia),
        tipo_ocorrencia: formData.tipo_ocorrencia,
        descricao: formData.descricao,
        anexo_url: formData.anexo_url || null,
      };

      if (editingOcorrencia) {
        // Registrar auditoria antes de salvar
        await logChanges(
          empresaId,
          'ocorrencias',
          editingOcorrencia.id,
          editingOcorrencia,
          ocorrenciaData
        );

        const { error } = await supabase
          .from('ocorrencias')
          .update(ocorrenciaData)
          .eq('id', editingOcorrencia.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Ocorrência atualizada com sucesso!",
        });
      } else {
        const { error } = await supabase
          .from('ocorrencias')
          .insert(ocorrenciaData);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Ocorrência cadastrada com sucesso!",
        });
      }

      resetForm();
      setIsDialogOpen(false);
      loadOcorrencias();
    } catch (error) {
      console.error('Erro ao salvar ocorrência:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a ocorrência.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (ocorrencia: Ocorrencia) => {
    setFormData({
      data_ocorrencia: formatDateForInput(ocorrencia.data_ocorrencia),
      tipo_ocorrencia: ocorrencia.tipo_ocorrencia,
      descricao: ocorrencia.descricao,
      anexo_url: ocorrencia.anexo_url || ''
    });
    setEditingOcorrencia(ocorrencia);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ocorrencias')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Ocorrência excluída com sucesso!",
      });

      loadOcorrencias();
    } catch (error) {
      console.error('Erro ao excluir ocorrência:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a ocorrência.",
        variant: "destructive",
      });
    }
  };

  const formatDateForDisplay = (dateString?: string): string => {
    if (!dateString) return '-';
    const dateOnly = dateString.includes('T') ? dateString.split('T')[0] : dateString;
    const [year, month, day] = dateOnly.split('-');
    return `${day}/${month}/${year}`;
  };

  const toggleDescription = (id: string) => {
    setExpandedDescriptions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const truncateText = (text: string, maxLength: number = 100) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const getTipoOcorrenciaColor = (tipo: string) => {
    switch (tipo) {
      case 'Não Conformidade':
        return 'destructive';
      case 'Feedback':
        return 'default';
      case 'Conversa':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (!funcionarioId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Ocorrências
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Salve o funcionário primeiro para gerenciar as ocorrências.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Ocorrências ({ocorrencias.length})
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={() => {
                  resetForm();
                  setIsDialogOpen(true);
                }} 
                disabled={disabled || loading}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Ocorrência
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>
                  {editingOcorrencia ? 'Editar Ocorrência' : 'Nova Ocorrência'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="data_ocorrencia">Data da Ocorrência *</Label>
                  <Input
                    id="data_ocorrencia"
                    type="date"
                    value={formData.data_ocorrencia}
                    onChange={(e) => setFormData(prev => ({ ...prev, data_ocorrencia: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="tipo_ocorrencia">Tipo de Ocorrência *</Label>
                  <Select
                    value={formData.tipo_ocorrencia}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, tipo_ocorrencia: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Não Conformidade">Não Conformidade</SelectItem>
                      <SelectItem value="Feedback">Feedback</SelectItem>
                      <SelectItem value="Conversa">Conversa</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="descricao">Descrição / Detalhes *</Label>
                  <Textarea
                    id="descricao"
                    value={formData.descricao}
                    onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
                    placeholder="Descreva a ocorrência detalhadamente..."
                    className="min-h-32"
                  />
                </div>
                <div>
                  <Label htmlFor="anexo_url">URL do Anexo (opcional)</Label>
                  <Input
                    id="anexo_url"
                    value={formData.anexo_url}
                    onChange={(e) => setFormData(prev => ({ ...prev, anexo_url: e.target.value }))}
                    placeholder="Cole a URL do arquivo anexado"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Cole aqui o link de um arquivo armazenado externamente
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={handleSubmit}
                    disabled={loading}
                    className="flex-1"
                  >
                    {loading ? 'Salvando...' : (editingOcorrencia ? 'Atualizar' : 'Salvar')}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={loading}
                  >
                    Cancelar
                  </Button>
                </div>

                {editingOcorrencia && empresaId && (
                  <AuditLogFooter
                    tabela="ocorrencias"
                    registroId={editingOcorrencia.id}
                    updatedAt={editingOcorrencia.created_at}
                    empresaId={empresaId}
                  />
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {ocorrencias.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma ocorrência cadastrada</p>
            <p className="text-sm">Clique em "Nova Ocorrência" para adicionar o primeiro registro.</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Usuário Responsável</TableHead>
                  <TableHead className="min-w-[300px]">Descrição</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ocorrencias.map((ocorrencia) => (
                  <TableRow key={ocorrencia.id}>
                    <TableCell>
                      {formatDateForDisplay(ocorrencia.data_ocorrencia)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={getTipoOcorrenciaColor(ocorrencia.tipo_ocorrencia)}>
                        {ocorrencia.tipo_ocorrencia}
                      </Badge>
                    </TableCell>
                    <TableCell>{ocorrencia.usuario_responsavel_nome}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm">
                          {expandedDescriptions.has(ocorrencia.id) 
                            ? ocorrencia.descricao 
                            : truncateText(ocorrencia.descricao)}
                        </p>
                        {ocorrencia.descricao.length > 100 && (
                          <Button
                            variant="link"
                            size="sm"
                            className="h-auto p-0 text-xs"
                            onClick={() => toggleDescription(ocorrencia.id)}
                          >
                            {expandedDescriptions.has(ocorrencia.id) ? 'Ver menos' : 'Ver mais'}
                          </Button>
                        )}
                        {ocorrencia.anexo_url && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Paperclip className="h-3 w-3" />
                            <a 
                              href={ocorrencia.anexo_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="hover:underline"
                            >
                              Ver anexo
                            </a>
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEdit(ocorrencia)}
                          disabled={disabled}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={disabled}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Deseja realmente excluir esta ocorrência? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={() => handleDelete(ocorrencia.id)}>
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
