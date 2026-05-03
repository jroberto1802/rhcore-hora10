import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Calendar, Clock, FileText, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuditLog } from '@/hooks/useAuditLog';
import { AuditLogFooter } from '@/components/AuditLogFooter';

interface PeriodoGozo {
  id?: string;
  data_inicio: string;
  data_fim: string;
}

interface Ferias {
  id: string;
  previsao: boolean;
  ferias_concluidas: boolean;
  data_limite: string;
  periodo_aquisitivo_inicio: string;
  periodo_aquisitivo_fim: string;
  valor_ferias: number;
  observacoes?: string;
  created_at: string;
  periodos_gozo?: PeriodoGozo[];
}

interface FeriasManagerProps {
  funcionarioId?: string;
  empresaId?: string;
  disabled?: boolean;
}

export function FeriasManager({ funcionarioId, empresaId, disabled = false }: FeriasManagerProps) {
  const { toast } = useToast();
  const { logChanges, logSingleChange } = useAuditLog();
  const [ferias, setFerias] = useState<Ferias[]>([]);
  const [loading, setLoading] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isPeriodoDialogOpen, setIsPeriodoDialogOpen] = useState(false);
  const [isObservacaoDialogOpen, setIsObservacaoDialogOpen] = useState(false);
  const [isEditingObservacao, setIsEditingObservacao] = useState(false);
  const [editingFerias, setEditingFerias] = useState<Ferias | null>(null);
  const [currentFeriasId, setCurrentFeriasId] = useState<string>('');
  const [periodosGozo, setPeriodosGozo] = useState<PeriodoGozo[]>([]);
  const [formData, setFormData] = useState({
    previsao: false,
    ferias_concluidas: false,
    periodo_aquisitivo_inicio: '',
    periodo_aquisitivo_fim: '',
    valor_ferias: 0,
    observacoes: ''
  });
  const [periodoFormData, setPeriodoFormData] = useState({
    data_inicio: '',
    data_fim: ''
  });
  const [observacaoFormData, setObservacaoFormData] = useState('');

  const resetForm = () => {
    setFormData({
      previsao: false,
      ferias_concluidas: false,
      periodo_aquisitivo_inicio: '',
      periodo_aquisitivo_fim: '',
      valor_ferias: 0,
      observacoes: ''
    });
    setPeriodosGozo([]);
    setEditingFerias(null);
  };

  const resetPeriodoForm = () => {
    setPeriodoFormData({
      data_inicio: '',
      data_fim: ''
    });
  };

  const loadFerias = async () => {
    if (!funcionarioId || !empresaId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('ferias')
        .select('*')
        .eq('funcionario_id', funcionarioId)
        .eq('empresa_id', empresaId)
        .order('periodo_aquisitivo_inicio', { ascending: false });

      if (error) throw error;

      // Carregar períodos de gozo para cada férias
      const feriasComPeriodos = await Promise.all(
        (data || []).map(async (feria) => {
          const { data: periodos } = await supabase
            .from('periodos_gozo_ferias')
            .select('*')
            .eq('ferias_id', feria.id)
            .order('data_inicio');

          return {
            ...feria,
            periodos_gozo: periodos || []
          };
        })
      );

      setFerias(feriasComPeriodos);
    } catch (error) {
      console.error('Erro ao carregar férias:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar as férias.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (funcionarioId && empresaId) {
      loadFerias();
    }
  }, [funcionarioId, empresaId]);

  const handleSubmit = async () => {
    if (!funcionarioId || !empresaId) {
      toast({
        title: "Erro",
        description: "Dados do funcionário não disponíveis.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.periodo_aquisitivo_inicio || !formData.periodo_aquisitivo_fim) {
      toast({
        title: "Erro",
        description: "Período aquisitivo é obrigatório.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);

      const feriasData = {
        funcionario_id: funcionarioId,
        empresa_id: empresaId,
        previsao: formData.previsao,
        ferias_concluidas: formData.ferias_concluidas,
        data_limite: calcularDataLimite(formData.periodo_aquisitivo_fim),
        periodo_aquisitivo_inicio: formData.periodo_aquisitivo_inicio,
        periodo_aquisitivo_fim: formData.periodo_aquisitivo_fim,
        valor_ferias: formData.valor_ferias,
        observacoes: formData.observacoes || null,
      };

      let feriasId: string;

      if (editingFerias) {
        // Registrar auditoria antes de salvar
        await logChanges(
          empresaId,
          'ferias',
          editingFerias.id,
          editingFerias,
          feriasData
        );

        const { error } = await supabase
          .from('ferias')
          .update(feriasData)
          .eq('id', editingFerias.id);

        if (error) throw error;
        feriasId = editingFerias.id;

        toast({
          title: "Sucesso",
          description: "Férias atualizadas com sucesso!",
        });
      } else {
        const { data: newFerias, error } = await supabase
          .from('ferias')
          .insert(feriasData)
          .select('id')
          .single();

        if (error) throw error;
        feriasId = newFerias.id;

        toast({
          title: "Sucesso",
          description: "Férias cadastradas com sucesso!",
        });
      }

      // Salvar períodos de gozo
      // Se estiver editando, remover períodos antigos primeiro
      if (editingFerias) {
        await supabase
          .from('periodos_gozo_ferias')
          .delete()
          .eq('ferias_id', feriasId);
      }

      // Inserir novos períodos apenas se houver algum
      if (periodosGozo.length > 0) {
        const periodosData = periodosGozo.map(periodo => ({
          ferias_id: feriasId,
          data_inicio: periodo.data_inicio,
          data_fim: periodo.data_fim
        }));

        const { error: periodosError } = await supabase
          .from('periodos_gozo_ferias')
          .insert(periodosData);

        if (periodosError) throw periodosError;
      }

      resetForm();
      setIsDialogOpen(false);
      loadFerias();
    } catch (error) {
      console.error('Erro ao salvar férias:', error);
      const message = (error instanceof Error)
        ? error.message
        : typeof error === 'string'
          ? error
          : 'Não foi possível salvar as férias.';
      toast({
        title: "Erro",
        description: message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (feria: Ferias) => {
    setFormData({
      previsao: feria.previsao,
      ferias_concluidas: feria.ferias_concluidas,
      periodo_aquisitivo_inicio: feria.periodo_aquisitivo_inicio,
      periodo_aquisitivo_fim: feria.periodo_aquisitivo_fim,
      valor_ferias: feria.valor_ferias,
      observacoes: feria.observacoes || ''
    });
    setPeriodosGozo(feria.periodos_gozo || []);
    setEditingFerias(feria);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    try {
      // Deletar períodos de gozo primeiro
      await supabase
        .from('periodos_gozo_ferias')
        .delete()
        .eq('ferias_id', id);

      // Deletar férias
      const { error } = await supabase
        .from('ferias')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Férias excluídas com sucesso!",
      });

      loadFerias();
    } catch (error) {
      console.error('Erro ao excluir férias:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir as férias.",
        variant: "destructive",
      });
    }
  };

  // Função para calcular dias adquiridos baseado no período aquisitivo
  const calcularDiasAdquiridos = (periodoInicio: string): number => {
    const inicio = new Date(periodoInicio);
    const hoje = new Date();
    
    // Calcular meses completos desde o início do período aquisitivo
    const diffTime = hoje.getTime() - inicio.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    const mesesCompletos = Math.floor(diffDays / 30);
    
    // Limitar a 12 meses (1 ano)
    const mesesLimitados = Math.min(mesesCompletos, 12);
    
    // 2.5 dias por mês com arredondamento para cima, limitado a 30 dias
    return Math.min(Math.ceil(mesesLimitados * 2.5), 30);
  };

  const calcularDataLimite = (periodoAquisitivoFim: string): string => {
    const dataFim = new Date(periodoAquisitivoFim);
    dataFim.setDate(dataFim.getDate() + 336); // 336 dias
    return dataFim.toISOString().split('T')[0];
  };

  const calcularTotalDias = (periodos: PeriodoGozo[]): number => {
    return periodos.reduce((total, periodo) => {
      const inicio = new Date(periodo.data_inicio);
      const fim = new Date(periodo.data_fim);
      const dias = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 3600 * 24)) + 1;
      return total + dias;
    }, 0);
  };

  const isFeriasVencida = (periodoAquisitivoFim: string): boolean => {
    return new Date(periodoAquisitivoFim) < new Date();
  };

  const isFeriasConcluida = (feria: Ferias): boolean => {
    // Se a flag estiver marcada, retorna true
    if (feria.ferias_concluidas) return true;
    
    const periodos = feria.periodos_gozo || [];
    const totalDias = calcularTotalDias(periodos);
    const diasAdquiridos = calcularDiasAdquiridos(feria.periodo_aquisitivo_inicio);
    
    if (!periodos || periodos.length === 0 || diasAdquiridos === 0) return false;
    
    // Encontrar a data de fim mais recente dos períodos de gozo
    const ultimaDataFim = periodos.reduce((latest, periodo) => {
      const dataFim = new Date(periodo.data_fim);
      return dataFim > latest ? dataFim : latest;
    }, new Date(0));
    
    // Verificar se a data atual é maior que a última data de fim E a soma dos dias é >= dias adquiridos
    return new Date() > ultimaDataFim && totalDias >= diasAdquiridos;
  };

  const adicionarPeriodo = async () => {
    if (!periodoFormData.data_inicio || !periodoFormData.data_fim) {
      toast({
        title: "Erro",
        description: "Data de início e fim são obrigatórias.",
        variant: "destructive",
      });
      return;
    }

    if (new Date(periodoFormData.data_inicio) > new Date(periodoFormData.data_fim)) {
      toast({
        title: "Erro",
        description: "Data de início deve ser anterior à data de fim.",
        variant: "destructive",
      });
      return;
    }

    // Validação: apenas impedir datas ANTERIORES ao início aquisitivo; permitir ultrapassar a data limite
    if (formData.periodo_aquisitivo_inicio) {
      const inicioAquisitivo = new Date(formData.periodo_aquisitivo_inicio);
      const inicio = new Date(periodoFormData.data_inicio);

      if (inicio < inicioAquisitivo) {
        toast({
          title: "Erro",
          description: "Período de gozo não pode ser anterior ao início do período aquisitivo.",
          variant: "destructive",
        });
        return;
      }
    }

    const novoPeriodo = `${periodoFormData.data_inicio} a ${periodoFormData.data_fim}`;
    
    // Registrar auditoria se estiver editando férias existente
    if (editingFerias && empresaId) {
      await logSingleChange(
        empresaId,
        'ferias',
        editingFerias.id,
        'periodo_gozo_adicionado',
        null,
        novoPeriodo
      );
    }

    setPeriodosGozo([...periodosGozo, { ...periodoFormData }]);
    resetPeriodoForm();
    setIsPeriodoDialogOpen(false);
  };

  const removerPeriodo = async (index: number) => {
    const periodoRemovido = periodosGozo[index];
    const periodoStr = `${periodoRemovido.data_inicio} a ${periodoRemovido.data_fim}`;
    
    // Registrar auditoria se estiver editando férias existente
    if (editingFerias && empresaId) {
      await logSingleChange(
        empresaId,
        'ferias',
        editingFerias.id,
        'periodo_gozo_removido',
        periodoStr,
        null
      );
    }

    setPeriodosGozo(periodosGozo.filter((_, i) => i !== index));
  };

  const handleObservacaoSubmit = async () => {
    try {
      const { error } = await supabase
        .from('ferias')
        .update({ observacoes: observacaoFormData })
        .eq('id', currentFeriasId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Observação atualizada com sucesso!",
      });

      setIsObservacaoDialogOpen(false);
      setIsEditingObservacao(false);
      setObservacaoFormData('');
      setCurrentFeriasId('');
      loadFerias();
    } catch (error) {
      console.error('Erro ao atualizar observação:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar a observação.",
        variant: "destructive",
      });
    }
  };

  const formatDate = (dateString?: string): string => {
    if (!dateString) return '-';
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  };

  if (!funcionarioId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Férias
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            Salve o funcionário primeiro para gerenciar as férias.
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
            <Calendar className="h-5 w-5" />
            Férias
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
                Adicionar Férias
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingFerias ? 'Editar Férias' : 'Adicionar Férias'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="previsao"
                      checked={formData.previsao}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ ...prev, previsao: !!checked }))
                      }
                    />
                    <Label htmlFor="previsao">Previsão</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="ferias_concluidas"
                      checked={formData.ferias_concluidas}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ ...prev, ferias_concluidas: !!checked }))
                      }
                    />
                    <Label htmlFor="ferias_concluidas">Férias Concluídas</Label>
                  </div>
                  <div>
                    <Label htmlFor="valor_ferias">Valor das Férias</Label>
                    <Input
                      id="valor_ferias"
                      type="number"
                      step="0.01"
                      value={formData.valor_ferias}
                      onChange={(e) => setFormData(prev => ({ ...prev, valor_ferias: Number(e.target.value) }))}
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <Label htmlFor="periodo_aquisitivo_inicio">Período Aquisitivo Início *</Label>
                    <Input
                      id="periodo_aquisitivo_inicio"
                      type="date"
                      value={formData.periodo_aquisitivo_inicio}
                      onChange={(e) => setFormData(prev => ({ ...prev, periodo_aquisitivo_inicio: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="periodo_aquisitivo_fim">Período Aquisitivo Fim *</Label>
                    <Input
                      id="periodo_aquisitivo_fim"
                      type="date"
                      value={formData.periodo_aquisitivo_fim}
                      onChange={(e) => setFormData(prev => ({ ...prev, periodo_aquisitivo_fim: e.target.value }))}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label>Períodos de Gozo</Label>
                    <Dialog open={isPeriodoDialogOpen} onOpenChange={setIsPeriodoDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm">
                          <Plus className="h-4 w-4 mr-2" />
                          Adicionar Período
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Adicionar Período de Gozo</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="data_inicio">Data de Início</Label>
                            <Input
                              id="data_inicio"
                              type="date"
                              value={periodoFormData.data_inicio}
                              onChange={(e) => setPeriodoFormData(prev => ({ ...prev, data_inicio: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="data_fim">Data de Fim</Label>
                            <Input
                              id="data_fim"
                              type="date"
                              value={periodoFormData.data_fim}
                              onChange={(e) => setPeriodoFormData(prev => ({ ...prev, data_fim: e.target.value }))}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button onClick={adicionarPeriodo} className="flex-1">
                              Adicionar
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => setIsPeriodoDialogOpen(false)}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {periodosGozo.length > 0 && (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Data Início</TableHead>
                            <TableHead>Data Fim</TableHead>
                            <TableHead>Dias</TableHead>
                            <TableHead>Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {periodosGozo.map((periodo, index) => {
                            const dias = Math.ceil((new Date(periodo.data_fim).getTime() - new Date(periodo.data_inicio).getTime()) / (1000 * 3600 * 24)) + 1;
                            return (
                              <TableRow key={index}>
                                <TableCell>{formatDate(periodo.data_inicio)}</TableCell>
                                <TableCell>{formatDate(periodo.data_fim)}</TableCell>
                                <TableCell>{dias}</TableCell>
                                <TableCell>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removerPeriodo(index)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>

                <div>
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    value={formData.observacoes}
                    onChange={(e) => setFormData(prev => ({ ...prev, observacoes: e.target.value }))}
                    placeholder="Observações sobre as férias..."
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSubmit} disabled={loading}>
                    {loading ? 'Salvando...' : (editingFerias ? 'Atualizar' : 'Salvar')}
                  </Button>
                </div>

                {editingFerias && empresaId && (
                  <AuditLogFooter
                    tabela="ferias"
                    registroId={editingFerias.id}
                    updatedAt={editingFerias.created_at}
                    empresaId={empresaId}
                  />
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {ferias.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Nenhuma férias cadastrada</p>
            <p className="text-sm">Clique em "Adicionar Férias" para cadastrar as primeiras férias.</p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-1/4">Período Aquisitivo</TableHead>
                  <TableHead>Data Limite</TableHead>
                  <TableHead className="w-1/4">Períodos de Gozo</TableHead>
                  <TableHead>Dias Adquiridos</TableHead>
                  <TableHead>Dias de Gozo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ferias.map((feria) => {
                  const diasAdquiridos = calcularDiasAdquiridos(feria.periodo_aquisitivo_inicio);
                  const totalDias = calcularTotalDias(feria.periodos_gozo || []);
                  const isVencida = isFeriasVencida(feria.periodo_aquisitivo_fim);
                  const isConcluida = isFeriasConcluida(feria);
                  
                  return (
                    <TableRow key={feria.id}>
                      <TableCell>
                        <div className="text-sm">
                          {formatDate(feria.periodo_aquisitivo_inicio)} até {formatDate(feria.periodo_aquisitivo_fim)}
                        </div>
                      </TableCell>
                      <TableCell>{formatDate(calcularDataLimite(feria.periodo_aquisitivo_fim))}</TableCell>
                      <TableCell>
                        {feria.periodos_gozo && feria.periodos_gozo.length > 0 ? (
                          <div className="space-y-1">
                            {feria.periodos_gozo.map((periodo, index) => (
                              <div key={index} className="text-sm">
                                {formatDate(periodo.data_inicio)} até {formatDate(periodo.data_fim)}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <Badge variant="outline">
                            {diasAdquiridos} dias
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2 whitespace-nowrap">
                          <Badge variant={totalDias < diasAdquiridos ? "destructive" : "default"}>
                            {totalDias} dias
                          </Badge>
                        </div>
                      </TableCell>
                       <TableCell>
                         <div className="flex items-center whitespace-nowrap">
                           {isConcluida ? (
                             <Badge className="bg-green-500 text-white hover:bg-green-600 whitespace-nowrap">
                               ✓ Férias concluídas
                             </Badge>
                           ) : isVencida ? (
                             <Badge className="bg-red-500 text-white hover:bg-red-600 whitespace-nowrap">
                               <Clock className="h-3 w-3 mr-1" />
                               Férias vencidas
                             </Badge>
                           ) : feria.previsao ? (
                             <Badge variant="secondary" className="whitespace-nowrap">Previsão</Badge>
                           ) : (
                             <Badge className="bg-blue-500 text-white hover:bg-blue-600 whitespace-nowrap">Válido</Badge>
                           )}
                         </div>
                       </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEdit(feria)}
                            disabled={disabled}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          {feria.observacoes && (
                            <Dialog 
                              open={isObservacaoDialogOpen && currentFeriasId === feria.id} 
                              onOpenChange={(open) => {
                                setIsObservacaoDialogOpen(open);
                                if (!open) {
                                  setIsEditingObservacao(false);
                                  setCurrentFeriasId('');
                                }
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => {
                                    setCurrentFeriasId(feria.id);
                                    setObservacaoFormData(feria.observacoes || '');
                                    setIsEditingObservacao(false);
                                    setIsObservacaoDialogOpen(true);
                                  }}
                                  title="Ver observações"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Observações</DialogTitle>
                                </DialogHeader>
                                <div className="space-y-4">
                                  {isEditingObservacao ? (
                                    <>
                                      <Textarea
                                        value={observacaoFormData}
                                        onChange={(e) => setObservacaoFormData(e.target.value)}
                                        rows={4}
                                        placeholder="Digite as observações..."
                                      />
                                      <div className="flex gap-2">
                                        <Button onClick={handleObservacaoSubmit} className="flex-1">
                                          Salvar
                                        </Button>
                                        <Button
                                          variant="outline"
                                          onClick={() => {
                                            setIsObservacaoDialogOpen(false);
                                            setIsEditingObservacao(false);
                                          }}
                                        >
                                          Cancelar
                                        </Button>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="p-4 bg-muted rounded-md min-h-[100px]">
                                        <p className="text-sm whitespace-pre-wrap">{observacaoFormData}</p>
                                      </div>
                                      <div className="flex gap-2">
                                        <Button 
                                          onClick={() => setIsEditingObservacao(true)}
                                          className="flex-1"
                                          disabled={disabled}
                                        >
                                          <Edit className="h-4 w-4 mr-2" />
                                          Editar
                                        </Button>
                                        <Button
                                          variant="outline"
                                          onClick={() => setIsObservacaoDialogOpen(false)}
                                        >
                                          Fechar
                                        </Button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>
                          )}
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
                                  Tem certeza que deseja excluir estas férias? Esta ação não pode ser desfeita.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(feria.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}