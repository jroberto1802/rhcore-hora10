import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { type Empresa } from '@/hooks/useUserEmpresas';
import { DocumentUpload } from '@/components/DocumentUpload';
import { ImageUpload } from '@/components/ImageUpload';
import { ASOsManager } from '@/components/ASOsManager';
import { TreinamentosFuncionarioManager } from '@/components/TreinamentosFuncionarioManager';
import { AusenciasManager } from '@/components/AusenciasManager';
import { OcorrenciasManager } from '@/components/OcorrenciasManager';
import { formatDateForInput, formatDateForDatabase } from '@/lib/utils';
import InputMask from 'react-input-mask';
import { useAuditLog } from '@/hooks/useAuditLog';

interface Cargo {
  id: string;
  nome_completo_cargo: string;
  nome: string;
  tipo_cargo: string;
  salario: number;
  nivel: string;
}

interface FuncionarioEdicaoProps {
  currentEmpresa: Empresa | null;
  isGroupView?: boolean;
  currentGroupId?: string | null;
}

export function FuncionarioEdicao({ currentEmpresa, isGroupView, currentGroupId }: FuncionarioEdicaoProps) {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logChanges } = useAuditLog();
  const [loading, setLoading] = useState(false);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [selectedCargoId, setSelectedCargoId] = useState<string>('');
  const [cepLoading, setCepLoading] = useState(false);
  const [empresasGrupo, setEmpresasGrupo] = useState<{ id: string; fantasia: string }[]>([]);
  const [funcionarioEmpresaId, setFuncionarioEmpresaId] = useState<string>('');
  const originalDataRef = useRef<Record<string, any>>({});
  const empresaIdForPerms = funcionarioEmpresaId || currentEmpresa?.id;
  const { hasPermission, isLoading: permissionsLoading, isSuperAdmin } = usePermissions(empresaIdForPerms);
  const canViewTab = (tab: string) => {
    if (permissionsLoading || isSuperAdmin) return true;
    const map: Record<string, string> = {
      pessoais: 'func.aba.dados_pessoais',
      endereco: 'func.aba.endereco',
      contratuais: 'func.aba.contratuais',
      documentos: 'func.aba.documentacao',
      exames: 'func.aba.exames',
      treinamentos: 'func.aba.treinamentos',
      ausencias: 'func.aba.ausencias',
      ocorrencias: 'func.aba.ocorrencias',
      bancarios: 'func.aba.financeiro',
    };
    return map[tab] ? hasPermission(map[tab]) : true;
  };
  const allowedTabs = ['pessoais','endereco','contratuais','documentos','exames','treinamentos','ausencias','ocorrencias','bancarios'].filter(canViewTab);
  const [activeTab, setActiveTab] = useState<string>('pessoais');
  
  const [formData, setFormData] = useState({
    // Dados pessoais
    codigo: '',
    nome_completo: '',
    nome_abreviado: '',
    genero: '',
    data_nascimento: '',
    telefone: '',
    email: '',
    foto_url: null as string | null,
    
    // Endereço
    endereco: '',
    numero_endereco: '',
    bairro: '',
    cidade: '',
    uf: '',
    cep: '',
    
    // Outros dados
    telefone_emergencia: '',
    nome_contato_emergencia: '',
    tipo_sanguineo: '',
    pcd: false,
    fardamento: '',
    
    // Dados pessoais extras
    email_corporativo: '',
    
    // Contratuais
    cargo_atual: '',
    tipo_cargo: '',
    tipo_contrato: '',
    salario_atual: '',
    data_admissao: '',
    data_demissao: '',
    setor_atual: '',
    area_atuacao: '',
    recebe_vale_transporte: false,
    recebe_vale_alimentacao: false,
    
    // Documentos
    rg: '',
    cpf: '',
    ctps: '',
    serie: '',
    pis: '',
    
    // Dados bancários
    banco: '',
    agencia: '',
    numero_conta: '',
    tipo_conta: '',
    chave_pix: '',
  });

  useEffect(() => {
    if (id) {
      loadFuncionario();
    }
  }, [id]);

  useEffect(() => {
    if (permissionsLoading) return;
    if (allowedTabs.length === 0) return;
    if (!allowedTabs.includes(activeTab)) {
      setActiveTab(allowedTabs[0]);
    }
  }, [permissionsLoading, allowedTabs.join('|')]);

  useEffect(() => {
    if (isGroupView && currentGroupId) {
      loadEmpresasGrupo();
    }
  }, [isGroupView, currentGroupId]);

  useEffect(() => {
    if (funcionarioEmpresaId || currentEmpresa?.id) {
      loadCargos();
    }
  }, [funcionarioEmpresaId, currentEmpresa]);

  const loadEmpresasGrupo = async () => {
    if (!currentGroupId) return;
    
    try {
      const { data, error } = await supabase
        .from('empresas')
        .select('id, fantasia')
        .eq('grupo_empresarial_id', currentGroupId);

      if (error) throw error;
      setEmpresasGrupo(data || []);
    } catch (error) {
      console.error('Erro ao carregar empresas do grupo:', error);
    }
  };

  const loadFuncionario = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      // Use funcionarios_safe() RPC to respect role-based access to sensitive data
      const { data: allData, error } = await supabase
        .rpc('funcionarios_safe');

      if (error) {
        console.error('Erro ao buscar funcionários:', error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados do funcionário.",
          variant: "destructive",
        });
        navigate('/funcionarios');
        return;
      }

      // Filter to get the specific funcionario by ID
      const data = allData?.find((f: any) => f.id === id);
      
      if (!data) {
        toast({
          title: "Erro",
          description: "Funcionário não encontrado.",
          variant: "destructive",
        });
        navigate('/funcionarios');
        return;
      }

      if (data) {
        setFuncionarioEmpresaId(data.empresa_id);
        const formDataToSet = {
          codigo: data.codigo || '',
          nome_completo: data.nome_completo || '',
          nome_abreviado: data.nome_abreviado || '',
          genero: data.genero || '',
          data_nascimento: formatDateForInput(data.data_nascimento),
          telefone: data.telefone || '',
          email: data.email || '',
          foto_url: data.foto_url || null,
          endereco: data.endereco || '',
          numero_endereco: data.numero_endereco || '',
          bairro: data.bairro || '',
          cidade: data.cidade || '',
          uf: data.uf || '',
          cep: data.cep || '',
          telefone_emergencia: data.telefone_emergencia || '',
          nome_contato_emergencia: data.nome_contato_emergencia || '',
          tipo_sanguineo: data.tipo_sanguineo || '',
          pcd: data.pcd || false,
          fardamento: (data as any).fardamento || '',
          email_corporativo: (data as any).email_corporativo || '',
          cargo_atual: data.cargo_atual || '',
          tipo_cargo: data.tipo_cargo || '',
          tipo_contrato: data.tipo_contrato || '',
          salario_atual: data.salario_atual ? data.salario_atual.toString() : '',
          data_admissao: formatDateForInput(data.data_admissao),
          data_demissao: formatDateForInput(data.data_demissao),
          setor_atual: data.setor_atual || '',
          area_atuacao: (data as any).area_atuacao || '',
          recebe_vale_transporte: (data as any).recebe_vale_transporte || false,
          recebe_vale_alimentacao: (data as any).recebe_vale_alimentacao || false,
          rg: data.rg || '',
          cpf: data.cpf || '',
          ctps: data.ctps || '',
          serie: data.serie || '',
          pis: data.pis || '',
          banco: data.banco || '',
          agencia: data.agencia || '',
          numero_conta: data.numero_conta || '',
          tipo_conta: data.tipo_conta || '',
          chave_pix: data.chave_pix || '',
        };
        setFormData(formDataToSet);
        originalDataRef.current = formDataToSet;
      }
    } catch (error) {
      console.error('Erro ao buscar funcionário:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do funcionário.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadCargos = async () => {
    const empresaId = funcionarioEmpresaId || currentEmpresa?.id;
    if (!empresaId) return;
    
    try {
      const { data, error } = await supabase
        .from('cargos')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('nome_completo_cargo');
      
      if (error) {
        console.error('Erro ao buscar cargos:', error);
      } else {
        setCargos(data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar cargos:', error);
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleCargoChange = (cargoId: string) => {
    setSelectedCargoId(cargoId);
    const cargo = cargos.find(c => c.id === cargoId);
    if (cargo) {
      handleInputChange('cargo_atual', cargo.nome_completo_cargo);
      handleInputChange('tipo_cargo', cargo.tipo_cargo);
      handleInputChange('salario_atual', cargo.salario.toString());
    }
  };

  const handleSubmit = async () => {
    if (!id) {
      toast({
        title: "Erro",
        description: "Dados insuficientes para atualizar o funcionário.",
        variant: "destructive",
      });
      return;
    }

    if (!formData.codigo || !formData.nome_completo) {
      toast({
        title: "Erro",
        description: "Código e nome completo são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    try {
      setLoading(true);
      
      // Converte strings vazias para null nos campos de data
      const dataToUpdate = {
        ...formData,
        salario_atual: formData.salario_atual ? parseFloat(formData.salario_atual) : null,
        data_nascimento: formatDateForDatabase(formData.data_nascimento),
        data_admissao: formatDateForDatabase(formData.data_admissao),
        data_demissao: formatDateForDatabase(formData.data_demissao),
      };
      
      const { error } = await supabase
        .from('funcionarios')
        .update(dataToUpdate)
        .eq('id', id);
      
      if (error) {
        console.error('Erro ao atualizar funcionário:', error);
        toast({
          title: "Erro",
          description: "Não foi possível atualizar o funcionário.",
          variant: "destructive",
        });
      } else {
        // Registrar alterações no audit log
        if (funcionarioEmpresaId && id) {
          await logChanges(
            funcionarioEmpresaId,
            'funcionarios',
            id,
            originalDataRef.current,
            formData
          );
        }
        
        toast({
          title: "Sucesso",
          description: "Funcionário atualizado com sucesso!",
        });
        navigate('/funcionarios');
      }
    } catch (error) {
      console.error('Erro ao atualizar funcionário:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o funcionário.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!currentEmpresa && !isGroupView) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Selecione uma empresa para editar funcionários.</p>
          <Button asChild className="mt-4">
            <Link to="/funcionarios">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar para Funcionários
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Editar Funcionário</h1>
          <p className="text-muted-foreground">
            {isGroupView ? 'Editando funcionário do grupo' : `Atualize os dados do funcionário da ${currentEmpresa?.fantasia}`}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link to="/funcionarios">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Cancelar
            </Link>
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-9">
          {canViewTab('pessoais') && <TabsTrigger value="pessoais">Dados Pessoais</TabsTrigger>}
          {canViewTab('endereco') && <TabsTrigger value="endereco">Endereço</TabsTrigger>}
          {canViewTab('contratuais') && <TabsTrigger value="contratuais">Dados Contratuais</TabsTrigger>}
          {canViewTab('documentos') && <TabsTrigger value="documentos">Documentos</TabsTrigger>}
          {canViewTab('exames') && <TabsTrigger value="exames">Exames</TabsTrigger>}
          {canViewTab('treinamentos') && <TabsTrigger value="treinamentos">Treinamentos</TabsTrigger>}
          {canViewTab('ausencias') && <TabsTrigger value="ausencias">Ausências</TabsTrigger>}
          {canViewTab('ocorrencias') && <TabsTrigger value="ocorrencias">Ocorrências</TabsTrigger>}
          {canViewTab('bancarios') && <TabsTrigger value="bancarios">Dados Bancários</TabsTrigger>}
        </TabsList>

        <TabsContent value="pessoais">
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="codigo">Código *</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    onChange={(e) => handleInputChange('codigo', e.target.value)}
                    placeholder="Ex: 001"
                  />
                </div>
                <div className="md:col-span-2">
                  <Label htmlFor="nome_completo">Nome Completo *</Label>
                  <Input
                    id="nome_completo"
                    value={formData.nome_completo}
                    onChange={(e) => handleInputChange('nome_completo', e.target.value)}
                    placeholder="Nome completo do funcionário"
                  />
                </div>
              </div>

              {/* Upload de Foto */}
              <div>
                <Label>Foto do Funcionário</Label>
                <ImageUpload
                  currentImageUrl={formData.foto_url}
                  onImageChange={(url) => handleInputChange('foto_url', url)}
                  folder="funcionarios"
                  disabled={loading}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="nome_abreviado">Nome Abreviado</Label>
                  <Input
                    id="nome_abreviado"
                    value={formData.nome_abreviado}
                    onChange={(e) => handleInputChange('nome_abreviado', e.target.value)}
                    placeholder="Nome resumido"
                  />
                </div>
                <div>
                  <Label htmlFor="genero">Gênero</Label>
                  <Select value={formData.genero} onValueChange={(value) => handleInputChange('genero', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o gênero" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Masculino">Masculino</SelectItem>
                      <SelectItem value="Feminino">Feminino</SelectItem>
                      <SelectItem value="Outro">Outro</SelectItem>
                      <SelectItem value="Prefere não informar">Prefere não informar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="data_nascimento">Data de Nascimento</Label>
                  <Input
                    id="data_nascimento"
                    type="date"
                    value={formData.data_nascimento}
                    onChange={(e) => handleInputChange('data_nascimento', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="telefone">Telefone</Label>
                  <InputMask
                    mask="(99) 99999-9999"
                    value={formData.telefone}
                    onChange={(e) => handleInputChange('telefone', e.target.value)}
                  >
                    {(inputProps: any) => (
                      <Input
                        {...inputProps}
                        id="telefone"
                        placeholder="(00) 00000-0000"
                      />
                    )}
                  </InputMask>
                </div>
                <div>
                  <Label htmlFor="email">E-mail Pessoal</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <Label htmlFor="email_corporativo">E-mail Corporativo</Label>
                  <Input
                    id="email_corporativo"
                    type="email"
                    value={formData.email_corporativo}
                    onChange={(e) => handleInputChange('email_corporativo', e.target.value)}
                    placeholder="nome@empresa.com.br"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <Label htmlFor="telefone_emergencia">Telefone de Emergência</Label>
                  <InputMask
                    mask="(99) 99999-9999"
                    value={formData.telefone_emergencia}
                    onChange={(e) => handleInputChange('telefone_emergencia', e.target.value)}
                  >
                    {(inputProps: any) => (
                      <Input
                        {...inputProps}
                        id="telefone_emergencia"
                        placeholder="(00) 00000-0000"
                      />
                    )}
                  </InputMask>
                </div>
                <div>
                  <Label htmlFor="nome_contato_emergencia">Nome do Contato de Emergência</Label>
                  <Input
                    id="nome_contato_emergencia"
                    value={formData.nome_contato_emergencia}
                    onChange={(e) => handleInputChange('nome_contato_emergencia', e.target.value)}
                    placeholder="Nome completo do contato"
                  />
                </div>
                <div>
                  <Label htmlFor="tipo_sanguineo">Tipo Sanguíneo</Label>
                  <Select value={formData.tipo_sanguineo} onValueChange={(value) => handleInputChange('tipo_sanguineo', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="A+">A+</SelectItem>
                      <SelectItem value="A-">A-</SelectItem>
                      <SelectItem value="B+">B+</SelectItem>
                      <SelectItem value="B-">B-</SelectItem>
                      <SelectItem value="AB+">AB+</SelectItem>
                      <SelectItem value="AB-">AB-</SelectItem>
                      <SelectItem value="O+">O+</SelectItem>
                      <SelectItem value="O-">O-</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Switch
                    id="pcd"
                    checked={formData.pcd}
                    onCheckedChange={(checked) => handleInputChange('pcd', checked)}
                  />
                  <Label htmlFor="pcd">Pessoa com Deficiência (PCD)</Label>
                </div>
                <div>
                  <Label htmlFor="fardamento">Fardamento</Label>
                  <Input
                    id="fardamento"
                    value={formData.fardamento}
                    onChange={(e) => handleInputChange('fardamento', e.target.value)}
                    placeholder="Ex: M, G, GG, 42..."
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="endereco">
          <Card>
            <CardHeader>
              <CardTitle>Endereço</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="endereco">Logradouro</Label>
                  <Input
                    id="endereco"
                    value={formData.endereco}
                    onChange={(e) => handleInputChange('endereco', e.target.value)}
                    placeholder="Rua, Avenida, etc."
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="numero_endereco">Número</Label>
                  <Input
                    id="numero_endereco"
                    value={formData.numero_endereco}
                    onChange={(e) => handleInputChange('numero_endereco', e.target.value)}
                    placeholder="123"
                  />
                </div>
                <div>
                  <Label htmlFor="bairro">Bairro</Label>
                  <Input
                    id="bairro"
                    value={formData.bairro}
                    onChange={(e) => handleInputChange('bairro', e.target.value)}
                    placeholder="Nome do bairro"
                  />
                </div>
                <div>
                  <Label htmlFor="cidade">Cidade</Label>
                  <Input
                    id="cidade"
                    value={formData.cidade}
                    onChange={(e) => handleInputChange('cidade', e.target.value)}
                    placeholder="Nome da cidade"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="uf">UF</Label>
                  <Input
                    id="uf"
                    value={formData.uf}
                    onChange={(e) => handleInputChange('uf', e.target.value)}
                    placeholder="SP"
                    maxLength={2}
                  />
                </div>
                <div>
                  <Label htmlFor="cep">CEP</Label>
                  <InputMask
                    mask="99999-999"
                    value={formData.cep}
                    onChange={(e) => handleInputChange('cep', e.target.value)}
                  >
                    {(inputProps: any) => (
                      <Input
                        {...inputProps}
                        id="cep"
                        placeholder="00000-000"
                      />
                    )}
                  </InputMask>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contratuais">
          <Card>
            <CardHeader>
              <CardTitle>Dados Contratuais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="cargo">Cargo</Label>
                  <Select value={selectedCargoId} onValueChange={handleCargoChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um cargo" />
                    </SelectTrigger>
                    <SelectContent>
                      {cargos.map((cargo) => (
                        <SelectItem key={cargo.id} value={cargo.id}>
                          {cargo.nome_completo_cargo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="cargo_atual">Cargo Atual (Manual)</Label>
                  <Input
                    id="cargo_atual"
                    value={formData.cargo_atual}
                    onChange={(e) => handleInputChange('cargo_atual', e.target.value)}
                    placeholder="Nome do cargo"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="tipo_cargo">Tipo de Cargo</Label>
                  <Select value={formData.tipo_cargo} onValueChange={(value) => handleInputChange('tipo_cargo', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Efetivo">Efetivo</SelectItem>
                      <SelectItem value="Terceirizado">Terceirizado</SelectItem>
                      <SelectItem value="Temporário">Temporário</SelectItem>
                      <SelectItem value="Estagiário">Estagiário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="tipo_contrato">Tipo de Contrato</Label>
                  <Select value={formData.tipo_contrato} onValueChange={(value) => handleInputChange('tipo_contrato', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CLT">CLT</SelectItem>
                      <SelectItem value="PJ">Pessoa Jurídica</SelectItem>
                      <SelectItem value="Temporário">Temporário</SelectItem>
                      <SelectItem value="Estágio">Estágio</SelectItem>
                      <SelectItem value="Terceirizado">Terceirizado</SelectItem>
                      <SelectItem value="Administrativo">Administrativo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                 <div>
                   <Label htmlFor="setor_atual">Setor</Label>
                   <Input
                     id="setor_atual"
                     value={formData.setor_atual}
                     onChange={(e) => handleInputChange('setor_atual', e.target.value)}
                     placeholder="Nome do setor"
                   />
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <div>
                   <Label htmlFor="area_atuacao">Área de Atuação</Label>
                   <Select value={formData.area_atuacao} onValueChange={(value) => handleInputChange('area_atuacao', value)}>
                     <SelectTrigger>
                       <SelectValue placeholder="Selecionar área" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="Operacional">Operacional</SelectItem>
                       <SelectItem value="Tática">Tática</SelectItem>
                       <SelectItem value="Estratégica">Estratégica</SelectItem>
                     </SelectContent>
                   </Select>
                 </div>
                 <div>
                   <Label htmlFor="salario_atual">Salário Atual (R$)</Label>
                   <Input
                     id="salario_atual"
                     type="number"
                     step="0.01"
                     value={formData.salario_atual}
                     onChange={(e) => handleInputChange('salario_atual', e.target.value)}
                     placeholder="0,00"
                   />
                 </div>
                 <div>
                   <Label htmlFor="data_admissao">Data de Admissão</Label>
                   <Input
                     id="data_admissao"
                     type="date"
                     value={formData.data_admissao}
                     onChange={(e) => handleInputChange('data_admissao', e.target.value)}
                   />
                 </div>
               </div>

               <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <div>
                   <Label htmlFor="data_demissao">Data de Demissão</Label>
                   <Input
                     id="data_demissao"
                     type="date"
                     value={formData.data_demissao}
                     onChange={(e) => handleInputChange('data_demissao', e.target.value)}
                   />
                 </div>
                 <div className="flex items-center space-x-2 pt-6">
                   <Switch
                     id="recebe_vale_transporte"
                     checked={formData.recebe_vale_transporte}
                     onCheckedChange={(checked) => handleInputChange('recebe_vale_transporte', checked)}
                   />
                   <Label htmlFor="recebe_vale_transporte">Recebe Vale Transporte</Label>
                 </div>
                 <div className="flex items-center space-x-2 pt-6">
                   <Switch
                     id="recebe_vale_alimentacao"
                     checked={formData.recebe_vale_alimentacao}
                     onCheckedChange={(checked) => handleInputChange('recebe_vale_alimentacao', checked)}
                   />
                   <Label htmlFor="recebe_vale_alimentacao">Recebe Vale Alimentação</Label>
                 </div>
               </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documentos">
          <Card>
            <CardHeader>
              <CardTitle>Documentos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rg">RG</Label>
                  <Input
                    id="rg"
                    value={formData.rg}
                    onChange={(e) => handleInputChange('rg', e.target.value)}
                    placeholder="00.000.000-0"
                  />
                </div>
                <div>
                  <Label htmlFor="cpf">CPF</Label>
                  <InputMask
                    mask="999.999.999-99"
                    value={formData.cpf}
                    onChange={(e) => handleInputChange('cpf', e.target.value)}
                  >
                    {(inputProps: any) => (
                      <Input
                        {...inputProps}
                        id="cpf"
                        placeholder="000.000.000-00"
                      />
                    )}
                  </InputMask>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="ctps">CTPS</Label>
                  <Input
                    id="ctps"
                    value={formData.ctps}
                    onChange={(e) => handleInputChange('ctps', e.target.value)}
                    placeholder="0000000"
                  />
                </div>
                <div>
                  <Label htmlFor="serie">Série</Label>
                  <Input
                    id="serie"
                    value={formData.serie}
                    onChange={(e) => handleInputChange('serie', e.target.value)}
                    placeholder="000"
                  />
                </div>
                <div>
                  <Label htmlFor="pis">PIS</Label>
                  <Input
                    id="pis"
                    value={formData.pis}
                    onChange={(e) => handleInputChange('pis', e.target.value)}
                    placeholder="00000000000"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Upload de Documentos */}
          <DocumentUpload 
            funcionarioId={id}
            empresaId={funcionarioEmpresaId || currentEmpresa?.id}
            onDocumentUploaded={(url, fileName) => {
              console.log('Documento anexado:', fileName, url);
            }}
          />
        </TabsContent>

        <TabsContent value="bancarios">
          <Card>
            <CardHeader>
              <CardTitle>Dados Bancários</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="banco">Banco</Label>
                  <Input
                    id="banco"
                    value={formData.banco}
                    onChange={(e) => handleInputChange('banco', e.target.value)}
                    placeholder="Nome do banco"
                  />
                </div>
                <div>
                  <Label htmlFor="agencia">Agência</Label>
                  <Input
                    id="agencia"
                    value={formData.agencia}
                    onChange={(e) => handleInputChange('agencia', e.target.value)}
                    placeholder="0000"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="numero_conta">Número da Conta</Label>
                  <Input
                    id="numero_conta"
                    value={formData.numero_conta}
                    onChange={(e) => handleInputChange('numero_conta', e.target.value)}
                    placeholder="00000-0"
                  />
                </div>
                <div>
                  <Label htmlFor="tipo_conta">Tipo de Conta</Label>
                  <Select value={formData.tipo_conta} onValueChange={(value) => handleInputChange('tipo_conta', value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Corrente">Conta Corrente</SelectItem>
                      <SelectItem value="Poupança">Conta Poupança</SelectItem>
                      <SelectItem value="Salário">Conta Salário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="chave_pix">Chave PIX</Label>
                <Input
                  id="chave_pix"
                  value={formData.chave_pix}
                  onChange={(e) => handleInputChange('chave_pix', e.target.value)}
                  placeholder="CPF, e-mail, telefone ou chave aleatória"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exames">
          <ASOsManager 
            funcionarioId={id}
            empresaId={funcionarioEmpresaId || currentEmpresa?.id}
            cargoAtual={formData.cargo_atual || undefined}
          />
        </TabsContent>

        <TabsContent value="treinamentos">
          <TreinamentosFuncionarioManager 
            funcionarioId={id}
            empresaId={funcionarioEmpresaId || currentEmpresa?.id}
            cargoAtual={formData.cargo_atual || undefined}
          />
        </TabsContent>

        <TabsContent value="ausencias">
          <AusenciasManager 
            funcionarioId={id}
            empresaId={funcionarioEmpresaId || currentEmpresa?.id}
          />
        </TabsContent>

        <TabsContent value="ocorrencias">
          <OcorrenciasManager 
            funcionarioId={id}
            empresaId={funcionarioEmpresaId || currentEmpresa?.id}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}