import { useState, useEffect, useRef } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { type Empresa } from '@/hooks/useUserEmpresas';
import { useAuditLog } from '@/hooks/useAuditLog';

const NIVEIS_CARGO = [
  'Júnior',
  'Pleno',
  'Sênior',
  'Especialista',
  'Coordenador',
  'Gerente',
  'Diretor',
  'Nível I',
  'Nível II',
  'Nível III'
] as const;

interface Cargo {
  id: string;
  nome_completo_cargo: string;
  nome: string;
  tipo_cargo: string;
  salario: number;
  nivel: string;
}

interface CargosManagerProps {
  currentEmpresa: Empresa | null;
  onCargoUpdated: () => void;
}

export function CargosManager({ currentEmpresa, onCargoUpdated }: CargosManagerProps) {
  const { toast } = useToast();
  const { logChanges } = useAuditLog();
  const [open, setOpen] = useState(false);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingCargo, setEditingCargo] = useState<Cargo | null>(null);
  const originalDataRef = useRef<Record<string, any>>({});
  const [formData, setFormData] = useState({
    nome_completo_cargo: '',
    nome: '',
    tipo_cargo: '',
    salario: '',
    nivel: ''
  });

  useEffect(() => {
    if (open && currentEmpresa) {
      loadCargos();
    }
  }, [open, currentEmpresa]);

  const loadCargos = async () => {
    if (!currentEmpresa) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cargos')
        .select('*')
        .eq('empresa_id', currentEmpresa.id)
        .order('nome_completo_cargo');

      if (error) throw error;
      setCargos(data || []);
    } catch (error) {
      console.error('Erro ao carregar cargos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os cargos.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentEmpresa) return;

    if (!formData.nome_completo_cargo || !formData.nome || !formData.salario) {
      toast({
        title: "Erro",
        description: "Preencha todos os campos obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      const cargoData = {
        ...formData,
        empresa_id: currentEmpresa.id,
        salario: parseFloat(formData.salario),
      };

      if (editingCargo) {
        const { error } = await supabase
          .from('cargos')
          .update(cargoData)
          .eq('id', editingCargo.id);

        if (error) throw error;
        
        // Registrar alterações no audit log
        await logChanges(
          currentEmpresa.id,
          'cargos',
          editingCargo.id,
          originalDataRef.current,
          formData
        );
        
        toast({
          title: "Sucesso",
          description: "Cargo atualizado com sucesso!",
        });
      } else {
        const { error } = await supabase
          .from('cargos')
          .insert(cargoData);

        if (error) throw error;
        
        toast({
          title: "Sucesso",
          description: "Cargo cadastrado com sucesso!",
        });
      }

      resetForm();
      loadCargos();
      onCargoUpdated();
    } catch (error) {
      console.error('Erro ao salvar cargo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o cargo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (cargo: Cargo) => {
    setEditingCargo(cargo);
    const cargoFormData = {
      nome_completo_cargo: cargo.nome_completo_cargo,
      nome: cargo.nome,
      tipo_cargo: cargo.tipo_cargo,
      salario: cargo.salario.toString(),
      nivel: cargo.nivel
    };
    setFormData(cargoFormData);
    originalDataRef.current = cargoFormData;
  };

  const handleDelete = async (cargoId: string) => {
    if (!confirm('Tem certeza que deseja excluir este cargo?')) return;

    try {
      setLoading(true);
      const { error } = await supabase
        .from('cargos')
        .delete()
        .eq('id', cargoId);

      if (error) throw error;
      
      toast({
        title: "Sucesso",
        description: "Cargo excluído com sucesso!",
      });
      
      loadCargos();
      onCargoUpdated();
    } catch (error) {
      console.error('Erro ao excluir cargo:', error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o cargo.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingCargo(null);
    setFormData({
      nome_completo_cargo: '',
      nome: '',
      tipo_cargo: '',
      salario: '',
      nivel: ''
    });
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Gerenciar Cargos
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gerenciar Cargos</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Formulário de Cadastro/Edição */}
          <Card>
            <CardHeader>
              <CardTitle>{editingCargo ? 'Editar Cargo' : 'Novo Cargo'}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="nome_completo_cargo">Nome Completo do Cargo *</Label>
                  <Input
                    id="nome_completo_cargo"
                    value={formData.nome_completo_cargo}
                    onChange={(e) => handleInputChange('nome_completo_cargo', e.target.value)}
                    placeholder="Ex: Analista de Sistemas Sênior"
                  />
                </div>
                <div>
                  <Label htmlFor="nome">Nome Abreviado *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => handleInputChange('nome', e.target.value)}
                    placeholder="Ex: Analista"
                  />
                </div>
                <div>
                  <Label htmlFor="tipo_cargo">Tipo de Cargo</Label>
                  <Input
                    id="tipo_cargo"
                    value={formData.tipo_cargo}
                    onChange={(e) => handleInputChange('tipo_cargo', e.target.value)}
                    placeholder="Ex: Efetivo, Comissionado"
                  />
                </div>
                <div>
                  <Label htmlFor="salario">Salário *</Label>
                  <Input
                    id="salario"
                    type="number"
                    step="0.01"
                    value={formData.salario}
                    onChange={(e) => handleInputChange('salario', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="nivel">Nível</Label>
                  <Select value={formData.nivel} onValueChange={(value) => handleInputChange('nivel', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o nível" />
                    </SelectTrigger>
                    <SelectContent>
                      {NIVEIS_CARGO.map((nivel) => (
                        <SelectItem key={nivel} value={nivel}>{nivel}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Salvando...' : editingCargo ? 'Atualizar' : 'Cadastrar'}
                  </Button>
                  {editingCargo && (
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Lista de Cargos */}
          <Card>
            <CardHeader>
              <CardTitle>Cargos Cadastrados</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-muted-foreground">Carregando...</p>
              ) : cargos.length === 0 ? (
                <p className="text-muted-foreground">Nenhum cargo cadastrado.</p>
              ) : (
                <div className="space-y-3">
                  {cargos.map((cargo) => (
                    <div key={cargo.id} className="border rounded-lg p-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium">{cargo.nome_completo_cargo}</h4>
                          <p className="text-sm text-muted-foreground">
                            {cargo.tipo_cargo} • {cargo.nivel}
                          </p>
                          <p className="text-sm font-medium">
                            R$ {cargo.salario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(cargo)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(cargo.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}