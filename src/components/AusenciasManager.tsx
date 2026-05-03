import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, MessageSquare, Calendar, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { formatDateForInput, formatDateForDatabase, formatDateForDisplay } from '@/lib/utils';
import { useAuditLog } from '@/hooks/useAuditLog';
import { AuditLogFooter } from '@/components/AuditLogFooter';

interface Ausencia {
  id: string;
  tipo_ausencia: string;
  data_inicio: string;
  data_fim?: string;
  justificada: boolean;
  observacoes?: string;
  created_at: string;
}

interface AusenciasManagerProps {
  funcionarioId?: string;
  empresaId?: string;
  disabled?: boolean;
}

export const TIPOS_AUSENCIA = [
  'Atraso',
  'Médico do trabalho',
  'Falta injustificada',
  'Atestado médico',
  'Licença óbito',
  'Abono',
  'Declaração',
  'Trabalho eleitoral',
  'Folga eleitoral',
  'Folga',
  'Folga banco de horas',
  'Licença maternidade',
  'Licença paternidade',
  'Licença casamento',
  'Doação de sangue',
  'Audiência judicial',
  'Outros'
];

export function AusenciasManager({ funcionarioId, empresaId, disabled = false }: AusenciasManagerProps) {
  const { toast } = useToast();
  const { logChanges } = useAuditLog();
  const [ausencias, setAusencias] = useState<Ausencia[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isObsDialogOpen, setIsObsDialogOpen] = useState(false);
  const [editingAusencia, setEditingAusencia] = useState<Ausencia | null>(null);
  const [selectedObservacao, setSelectedObservacao] = useState<string>('');
  const [formData, setFormData] = useState({
    tipo_ausencia: '',
    data_inicio: '',
    data_fim: '',
    justificada: false,
    observacoes: ''
  });

  const resetForm = () => {
    setFormData({
      tipo_ausencia: '',
      data_inicio: '',
      data_fim: '',
      justificada: false,
      observacoes: ''
    });
    setEditingAusencia(null);
  };

  const loadAusencias = async () => {
    if (!funcionarioId || !empresaId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ausencias')
        .select('*')
        .eq('funcionario_id', funcionarioId)
        .eq('empresa_id', empresaId)
        .order('data_inicio', { ascending: false });

      if (error) throw error;
      setAusencias(data || []);
    } catch (error) {
      console.error('Erro ao carregar ausências:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as ausências.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (funcionarioId && empresaId) {
      loadAusencias();
    }
  }, [funcionarioId, empresaId]);

  const calcularDias = (dataInicio: string, dataFim?: string): number => {
    if (!dataInicio) return 0;

    const toParts = (s: string) => (s.includes('T') ? s.split('T')[0] : s).split('-').map(Number) as [number, number, number];
    const [y1, m1, d1] = toParts(dataInicio);
    const [y2, m2, d2] = dataFim ? toParts(dataFim) : [y1, m1, d1];

    const startUTC = Date.UTC(y1, (m1 || 1) - 1, d1 || 1);
    const endUTC = Date.UTC(y2, (m2 || 1) - 1, d2 || 1);

    const diffDays = Math.floor((endUTC - startUTC) / (1000 * 60 * 60 * 24)) + 1; // inclusivo
    return diffDays;
  };

  const handleSubmit = async () => {
    if (!funcionarioId || !empresaId) {
      toast({
        title: "Erro",
        description: "Dados do funcionário não disponíveis.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.tipo_ausencia || !formData.data_inicio) {
      toast({
        title: "Erro",
        description: "Preencha os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      const ausenciaData = {
        funcionario_id: funcionarioId,
        empresa_id: empresaId,
        tipo_ausencia: formData.tipo_ausencia,
        data_inicio: formatDateForDatabase(formData.data_inicio),
        data_fim: formData.data_fim ? formatDateForDatabase(formData.data_fim) : null,
        justificada: formData.justificada,
        observacoes: formData.observacoes || null
      };

      if (editingAusencia) {
        // Registrar auditoria antes de salvar
        await logChanges(
          empresaId,
          'ausencias',
          editingAusencia.id,
          editingAusencia,
          ausenciaData
        );

        const { error } = await supabase
          .from('ausencias')
          .update(ausenciaData)
          .eq('id', editingAusencia.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Ausência atualizada com sucesso.",
        });
      } else {
        const { error } = await supabase
          .from('ausencias')
          .insert(ausenciaData);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Ausência adicionada com sucesso.",
        });
      }

      setIsDialogOpen(false);
      resetForm();
      loadAusencias();
    } catch (error) {
      console.error('Erro ao salvar ausência:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a ausência.",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (ausencia: Ausencia) => {
    setEditingAusencia(ausencia);
    setFormData({
      tipo_ausencia: ausencia.tipo_ausencia,
      data_inicio: formatDateForInput(ausencia.data_inicio),
      data_fim: ausencia.data_fim ? formatDateForInput(ausencia.data_fim) : '',
      justificada: ausencia.justificada,
      observacoes: ausencia.observacoes || ''
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('ausencias')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Ausência excluída com sucesso.",
      });

      loadAusencias();
    } catch (error) {
      console.error('Erro ao excluir ausência:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a ausência.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString: string) => {
    return formatDateForDisplay(dateString);
  };

  const handleObservacaoClick = (observacao: string) => {
    setSelectedObservacao(observacao);
    setIsObsDialogOpen(true);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <p className="text-muted-foreground">Carregando ausências...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Ausências
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button disabled={disabled}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Ausência
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingAusencia ? 'Editar Ausência' : 'Adicionar Ausência'}
                </DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="tipo_ausencia">Tipo de Ausência *</Label>
                  <Select
                    value={formData.tipo_ausencia}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, tipo_ausencia: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {TIPOS_AUSENCIA.map((tipo) => (
                        <SelectItem key={tipo} value={tipo}>
                          {tipo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2 pt-6">
                  <Checkbox
                    id="justificada"
                    checked={formData.justificada}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, justificada: !!checked }))
                    }
                  />
                  <Label htmlFor="justificada">Justificada</Label>
                </div>
                <div>
                  <Label htmlFor="data_inicio_ausencia">Data de Início *</Label>
                  <Input
                    id="data_inicio_ausencia"
                    type="date"
                    value={formData.data_inicio}
                    onChange={(e) => setFormData(prev => ({ ...prev, data_inicio: e.target.value }))}
                  />
                </div>
                <div>
                  <Label htmlFor="data_fim_ausencia">Data de Fim</Label>
                  <Input
                    id="data_fim_ausencia"
                    type="date"
                    value={formData.data_fim}
                    onChange={(e) => setFormData(prev => ({ ...prev, data_fim: e.target.value }))}
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="observacoes_ausencia">Observações</Label>
                  <Textarea
                    id="observacoes_ausencia"
                    value={formData.observacoes}
                    onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                    placeholder="Observações sobre a ausência..."
                    rows={3}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-4">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleSubmit}>
                  {editingAusencia ? 'Salvar Alterações' : 'Adicionar Ausência'}
                </Button>
              </div>

              {editingAusencia && empresaId && (
                <AuditLogFooter
                  tabela="ausencias"
                  registroId={editingAusencia.id}
                  updatedAt={editingAusencia.created_at}
                  empresaId={empresaId}
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {ausencias.length === 0 ? (
          <div className="text-center py-8">
            <Clock className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">Nenhuma ausência cadastrada para este funcionário.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo de Ausência</TableHead>
                <TableHead>Período</TableHead>
                <TableHead>Dias</TableHead>
                <TableHead>Justificada</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {ausencias.map((ausencia) => (
                <TableRow key={ausencia.id}>
                  <TableCell className="font-medium">
                    {ausencia.tipo_ausencia}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {formatDate(ausencia.data_inicio)}
                      {ausencia.data_fim && (
                        <>
                          <span className="mx-1">até</span>
                          {formatDate(ausencia.data_fim)}
                        </>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {calcularDias(ausencia.data_inicio, ausencia.data_fim)} dias
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={ausencia.justificada ? "default" : "secondary"}>
                      {ausencia.justificada ? "Sim" : "Não"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(ausencia)}
                        disabled={disabled}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button size="sm" variant="outline" disabled={disabled}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir este registro de ausência? Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(ausencia.id)}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleObservacaoClick(ausencia.observacoes || '')}
                        disabled={!ausencia.observacoes || ausencia.observacoes.trim() === ''}
                      >
                        <MessageSquare className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Dialog para observações */}
      <Dialog open={isObsDialogOpen} onOpenChange={setIsObsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Observações</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">
              {selectedObservacao}
            </p>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setIsObsDialogOpen(false)}>
              Fechar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </Card>
  );
}