import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface DocumentoPadrao {
  id: string;
  nome_documento: string;
  tipo: string;
  categoria: 'Geral' | 'Anual' | 'Mensal';
  tipo_aplicacao: 'terceirizado' | 'colaborador';
  observacao: string | null;
}

interface DocumentosPadraoManagerProps {
  empresaId: string;
}

export function DocumentosPadraoManager({ empresaId }: DocumentosPadraoManagerProps) {
  const { toast } = useToast();
  const [documentos, setDocumentos] = useState<DocumentoPadrao[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDocumento, setEditingDocumento] = useState<DocumentoPadrao | null>(null);
  const [formData, setFormData] = useState({
    nome_documento: '',
    tipo: '',
    categoria: 'Geral' as 'Geral' | 'Anual' | 'Mensal',
    tipo_aplicacao: 'terceirizado' as 'terceirizado' | 'colaborador',
    observacao: ''
  });

  useEffect(() => {
    loadDocumentos();
  }, [empresaId]);

  const loadDocumentos = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('documentos_padrao')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('tipo_aplicacao', { ascending: true })
        .order('categoria', { ascending: true })
        .order('nome_documento', { ascending: true });

      if (error) throw error;
      setDocumentos(data || []);
    } catch (error) {
      console.error('Erro ao carregar documentos padrão:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os documentos padrão.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.nome_documento || !formData.tipo) {
        toast({
          title: "Erro",
          description: "Preencha todos os campos obrigatórios.",
          variant: "destructive",
        });
        return;
      }

      if (editingDocumento) {
        const { error } = await supabase
          .from('documentos_padrao')
          .update({
            nome_documento: formData.nome_documento,
            tipo: formData.tipo,
            categoria: formData.categoria,
            tipo_aplicacao: formData.tipo_aplicacao,
            observacao: formData.observacao || null
          })
          .eq('id', editingDocumento.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Documento padrão atualizado com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from('documentos_padrao')
          .insert({
            empresa_id: empresaId,
            nome_documento: formData.nome_documento,
            tipo: formData.tipo,
            categoria: formData.categoria,
            tipo_aplicacao: formData.tipo_aplicacao,
            observacao: formData.observacao || null
          });

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Documento padrão criado com sucesso.",
        });
      }

      loadDocumentos();
      handleCloseDialog();
    } catch (error) {
      console.error('Erro ao salvar documento padrão:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o documento padrão.",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('documentos_padrao')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Documento padrão excluído com sucesso.",
      });
      loadDocumentos();
    } catch (error) {
      console.error('Erro ao excluir documento padrão:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o documento padrão.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (documento: DocumentoPadrao) => {
    setEditingDocumento(documento);
    setFormData({
      nome_documento: documento.nome_documento,
      tipo: documento.tipo,
      categoria: documento.categoria,
      tipo_aplicacao: documento.tipo_aplicacao,
      observacao: documento.observacao || ''
    });
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingDocumento(null);
    setFormData({
      nome_documento: '',
      tipo: '',
      categoria: 'Geral',
      tipo_aplicacao: 'terceirizado',
      observacao: ''
    });
  };

  const getTipoAplicacaoBadge = (tipo: string) => {
    return tipo === 'terceirizado' ? 'Terceirizada' : 'Colaborador';
  };

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Documentos Padrão</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleCloseDialog()}>
              <Plus className="h-4 w-4 mr-2" />
              Novo Documento Padrão
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingDocumento ? 'Editar' : 'Novo'} Documento Padrão
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
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
                <Label htmlFor="tipo">Tipo *</Label>
                <Input
                  id="tipo"
                  value={formData.tipo}
                  onChange={(e) => setFormData({ ...formData, tipo: e.target.value })}
                  placeholder="Ex: Contrato, Certidão, etc."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="categoria">Categoria</Label>
                  <Select
                    value={formData.categoria}
                    onValueChange={(value: 'Geral' | 'Anual' | 'Mensal') =>
                      setFormData({ ...formData, categoria: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Geral">Geral</SelectItem>
                      <SelectItem value="Anual">Anual</SelectItem>
                      <SelectItem value="Mensal">Mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="tipo_aplicacao">Aplica-se a</Label>
                  <Select
                    value={formData.tipo_aplicacao}
                    onValueChange={(value: 'terceirizado' | 'colaborador') =>
                      setFormData({ ...formData, tipo_aplicacao: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="terceirizado">Terceirizada</SelectItem>
                      <SelectItem value="colaborador">Colaborador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="observacao">Observação</Label>
                <Textarea
                  id="observacao"
                  value={formData.observacao}
                  onChange={(e) => setFormData({ ...formData, observacao: e.target.value })}
                  placeholder="Observações opcionais"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={handleCloseDialog}>
                  Cancelar
                </Button>
                <Button onClick={handleSave}>
                  Salvar
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome do Documento</TableHead>
            <TableHead>Tipo</TableHead>
            <TableHead>Categoria</TableHead>
            <TableHead>Aplica-se a</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {documentos.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                Nenhum documento padrão cadastrado.
              </TableCell>
            </TableRow>
          ) : (
            documentos.map((doc) => (
              <TableRow key={doc.id}>
                <TableCell className="font-medium">{doc.nome_documento}</TableCell>
                <TableCell>{doc.tipo}</TableCell>
                <TableCell>{doc.categoria}</TableCell>
                <TableCell>{getTipoAplicacaoBadge(doc.tipo_aplicacao)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(doc)}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir o documento padrão "{doc.nome_documento}"?
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(doc.id)}>
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}
