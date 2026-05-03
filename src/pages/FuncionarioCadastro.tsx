import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Search, User, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { usePermissions } from '@/hooks/usePermissions';
import { type Empresa } from '@/hooks/useUserEmpresas';
import { CargosManager } from '@/components/CargosManager';
import { DocumentUpload } from '@/components/DocumentUpload';
import { ImageUpload } from '@/components/ImageUpload';
import { ExamesManager } from '@/components/ExamesManager';
import { formatDateForDatabase } from '@/lib/utils';
import InputMask from 'react-input-mask';

interface Cargo {
  id: string;
  nome_completo_cargo: string;
  nome: string;
  tipo_cargo: string;
  salario: number;
  nivel: string;
}

interface FuncionarioCadastroProps {
  currentEmpresa: Empresa | null;
  isGroupView?: boolean;
  currentGroupId?: string | null;
}

export function FuncionarioCadastro({ currentEmpresa, isGroupView, currentGroupId }: FuncionarioCadastroProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [selectedCargoId, setSelectedCargoId] = useState<string>('');
  const [cepLoading, setCepLoading] = useState(false);
  const [empresasGrupo, setEmpresasGrupo] = useState<{ id: string; fantasia: string }[]>([]);
  const [selectedEmpresaId, setSelectedEmpresaId] = useState<string>('');

  const { hasPermission, isLoading: permissionsLoading, isSuperAdmin } = usePermissions(selectedEmpresaId || currentEmpresa?.id);
  const canViewTab = (tab: string) => {
    if (permissionsLoading || isSuperAdmin) return true;
    const map: Record<string, string> = {
      dados: 'func.aba.dados_pessoais',
      funcionais: 'func.aba.contratuais',
      acesso: 'func.aba.acesso',
    };
    return map[tab] ? hasPermission(map[tab]) : true;
  };
  const allowedTabs = ['dados','funcionais','acesso'].filter(canViewTab);
  const [activeTab, setActiveTab] = useState<string>('dados');

  const [createUser, setCreateUser] = useState(false);
  const [userFormData, setUserFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    nome: ''
  });
  
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
    cep: '',
    endereco: '',
    numero_endereco: '',
    complemento: '',
    bairro: '',
    cidade: '',
    uf: '',
    
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
    
    // Documentação
    rg: '',
    cpf: '',
    ctps: '',
    serie: '',
    pis: '',
    
    // Financeiro
    banco: '',
    agencia: '',
    numero_conta: '',
    tipo_conta: '',
    chave_pix: '',
  });

  // Load empresas do grupo ou configurar empresa específica
  useEffect(() => {
    if (isGroupView && currentGroupId) {
      loadEmpresasGrupo();
    } else if (currentEmpresa) {
      setSelectedEmpresaId(currentEmpresa.id);
      if (!formData.codigo) {
        generateEmployeeCode();
      }
      loadCargos();
    }
  }, [currentEmpresa, isGroupView, currentGroupId]);

  // Load cargos when empresa changes
  useEffect(() => {
    if (selectedEmpresaId) {
      loadCargos();
      generateEmployeeCode();
    }
  }, [selectedEmpresaId]);

  useEffect(() => {
    if (permissionsLoading) return;
    if (allowedTabs.length === 0) return;
    if (!allowedTabs.includes(activeTab)) {
      setActiveTab(allowedTabs[0]);
    }
  }, [permissionsLoading, allowedTabs.join('|')]);

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

  const generateEmployeeCode = async () => {
    const empresaId = selectedEmpresaId || currentEmpresa?.id;
    if (!empresaId) return;
    
    try {
      const { data, error } = await supabase
        .from('funcionarios')
        .select('codigo')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextNumber = 1;
      if (data && data.length > 0) {
        const lastCode = data[0].codigo;
        const match = lastCode.match(/(\d+)$/);
        if (match) {
          nextNumber = parseInt(match[1]) + 1;
        }
      }

      const newCode = `FUNC${nextNumber.toString().padStart(3, '0')}`;
      setFormData(prev => ({ ...prev, codigo: newCode }));
    } catch (error) {
      console.error('Erro ao gerar código:', error);
    }
  };

  const loadCargos = async () => {
    const empresaId = selectedEmpresaId || currentEmpresa?.id;
    if (!empresaId) return;

    try {
      const { data, error } = await supabase
        .from('cargos')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('nome_completo_cargo');

      if (error) throw error;
      setCargos(data || []);
    } catch (error) {
      console.error('Erro ao carregar cargos:', error);
    }
  };

  const handleCargoChange = (cargoId: string) => {
    setSelectedCargoId(cargoId);
    const cargo = cargos.find(c => c.id === cargoId);
    
    if (cargo) {
      setFormData(prev => ({
        ...prev,
        cargo_atual: cargo.nome_completo_cargo,
        tipo_cargo: cargo.tipo_cargo,
        salario_atual: cargo.salario.toString()
      }));
    }
  };

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const searchCep = async () => {
    const cleanCep = formData.cep.replace(/\D/g, ''); // Remove non-numeric characters
    
    if (!cleanCep || cleanCep.length !== 8) {
      toast({
        title: "CEP Inválido",
        description: "Digite um CEP válido com 8 dígitos.",
        variant: "destructive",
      });
      return;
    }

    try {
      setCepLoading(true);
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      const data = await response.json();

      if (data.erro) {
        toast({
          title: "CEP não encontrado",
          description: "Verifique o CEP digitado.",
          variant: "destructive",
        });
        return;
      }

      setFormData(prev => ({
        ...prev,
        endereco: data.logradouro || '',
        bairro: data.bairro || '',
        cidade: data.localidade || '',
        uf: data.uf || ''
      }));

      toast({
        title: "CEP encontrado!",
        description: "Endereço preenchido automaticamente.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível buscar o CEP.",
        variant: "destructive",
      });
    } finally {
      setCepLoading(false);
    }
  };

  const handleSubmit = async () => {
    const empresaId = selectedEmpresaId || currentEmpresa?.id;
    if (!empresaId) {
      toast({
        title: "Erro",
        description: "Nenhuma empresa selecionada.",
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

    // Validações para criação de usuário
    if (createUser) {
      if (!userFormData.email || !userFormData.password || !userFormData.nome) {
        toast({
          title: "Erro",
          description: "Todos os campos de usuário são obrigatórios.",
          variant: "destructive",
        });
        return;
      }

      if (userFormData.password !== userFormData.confirmPassword) {
        toast({
          title: "Erro",
          description: "As senhas não coincidem.",
          variant: "destructive",
        });
        return;
      }

      if (userFormData.password.length < 6) {
        toast({
          title: "Erro",
          description: "A senha deve ter pelo menos 6 caracteres.",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      setLoading(true);
      
      // Remove os campos que não existem na tabela funcionarios
      const { cep, complemento, ...funcionarioData } = formData;
      
      // Converte strings vazias para null nos campos de data
      const dataToInsert = {
        ...funcionarioData,
        empresa_id: empresaId,
        salario_atual: formData.salario_atual ? parseFloat(formData.salario_atual) : null,
        data_nascimento: formatDateForDatabase(formData.data_nascimento),
        data_admissao: formatDateForDatabase(formData.data_admissao),
        data_demissao: formatDateForDatabase(formData.data_demissao),
      };
      
      // 1. Inserir funcionário primeiro
      const { data: funcionarioResult, error: funcionarioError } = await supabase
        .from('funcionarios')
        .insert(dataToInsert)
        .select()
        .single();
      
      if (funcionarioError) {
        console.error('Erro ao criar funcionário:', funcionarioError);
        toast({
          title: "Erro",
          description: "Não foi possível cadastrar o funcionário.",
          variant: "destructive",
        });
        return;
      }

      // 2. Se solicitado, criar usuário
      if (createUser && funcionarioResult) {
        try {
          // Usar o cliente admin do Supabase para criar usuário
          const { data: authResult, error: authError } = await supabase.auth.admin.createUser({
            email: userFormData.email,
            password: userFormData.password,
            user_metadata: {
              nome: userFormData.nome,
              funcionario_id: funcionarioResult.id,
              empresa_id: empresaId
            },
            email_confirm: true // Confirma o email automaticamente
          });

          if (authError) {
            console.error('Erro ao criar usuário:', authError);
            toast({
              title: "Funcionário criado, mas...",
              description: `Erro ao criar usuário: ${authError.message}`,
              variant: "destructive",
            });
          } else {
            toast({
              title: "Sucesso completo!",
              description: "Funcionário cadastrado e usuário criado com sucesso!",
            });
          }
        } catch (userError) {
          console.error('Erro ao criar usuário:', userError);
          toast({
            title: "Funcionário criado, mas...",
            description: "Erro ao criar usuário. O usuário pode ser criado manualmente depois.",
            variant: "destructive",
          });
        }
      } else {
        toast({
          title: "Sucesso",
          description: "Funcionário cadastrado com sucesso!",
        });
      }
      
      navigate('/funcionarios');
    } catch (error) {
      console.error('Erro ao criar funcionário:', error);
      toast({
        title: "Erro",
        description: "Não foi possível cadastrar o funcionário.",
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
          <p className="text-muted-foreground">Selecione uma empresa para cadastrar funcionários.</p>
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
        <div className="flex items-center space-x-4">
          <Button variant="ghost" asChild>
            <Link to="/funcionarios">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Voltar
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Novo Funcionário</h1>
            <p className="text-muted-foreground">
              {isGroupView ? 'Cadastrar funcionário no grupo' : `Cadastrar funcionário para ${currentEmpresa?.fantasia}`}
            </p>
          </div>
        </div>
        <Button onClick={handleSubmit} disabled={loading}>
          <Save className="h-4 w-4 mr-2" />
          {loading ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          {canViewTab('dados') && <TabsTrigger value="dados">Dados do Funcionário</TabsTrigger>}
          {canViewTab('funcionais') && <TabsTrigger value="funcionais">Funcionais</TabsTrigger>}
          {canViewTab('acesso') && <TabsTrigger value="acesso">Acesso ao Sistema</TabsTrigger>}
        </TabsList>

        <TabsContent value="dados" className="space-y-6">
          {/* Seletor de Empresa para modo grupo */}
          {isGroupView && (
            <Card>
              <CardHeader>
                <CardTitle>Selecionar Empresa</CardTitle>
              </CardHeader>
              <CardContent>
                <div>
                  <Label htmlFor="empresa">Empresa *</Label>
                  <Select value={selectedEmpresaId} onValueChange={setSelectedEmpresaId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a empresa" />
                    </SelectTrigger>
                    <SelectContent>
                      {empresasGrupo.map((empresa) => (
                        <SelectItem key={empresa.id} value={empresa.id}>
                          {empresa.fantasia}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Dados Pessoais */}
          <Card>
            <CardHeader>
              <CardTitle>Dados Pessoais</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="codigo">Código *</Label>
                <Input
                  id="codigo"
                  value={formData.codigo}
                  onChange={(e) => handleInputChange('codigo', e.target.value)}
                  placeholder="Ex: FUNC001"
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
                    <SelectValue placeholder="Selecionar gênero" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Masculino">Masculino</SelectItem>
                    <SelectItem value="Feminino">Feminino</SelectItem>
                    <SelectItem value="Outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>
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
                   {(inputProps) => (
                     <Input
                       {...inputProps}
                       id="telefone"
                       placeholder="(11) 99999-9999"
                     />
                   )}
                 </InputMask>
              </div>
              <div>
                <Label htmlFor="email">Email Pessoal</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="email@exemplo.com"
                />
              </div>
              <div>
                <Label htmlFor="email_corporativo">Email Corporativo</Label>
                <Input
                  id="email_corporativo"
                  type="email"
                  value={formData.email_corporativo}
                  onChange={(e) => handleInputChange('email_corporativo', e.target.value)}
                  placeholder="nome@empresa.com.br"
                />
              </div>
              
              {/* Upload de Foto */}
              <div className="md:col-span-3">
                <Label>Foto do Funcionário</Label>
                <ImageUpload
                  currentImageUrl={formData.foto_url}
                  onImageChange={(url) => handleInputChange('foto_url', url)}
                  folder="funcionarios"
                  disabled={loading}
                />
              </div>
            </CardContent>
          </Card>

           {/* Endereço */}
           <Card>
             <CardHeader>
               <CardTitle>Endereço</CardTitle>
             </CardHeader>
             <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
               <div>
                 <Label htmlFor="cep">CEP</Label>
                 <div className="flex gap-2">
                   <InputMask
                     mask="99999-999"
                     value={formData.cep}
                     onChange={(e) => handleInputChange('cep', e.target.value)}
                   >
                     {(inputProps) => (
                       <Input
                         {...inputProps}
                         id="cep"
                         placeholder="12345-678"
                       />
                     )}
                   </InputMask>
                   <Button 
                     type="button" 
                     variant="outline" 
                     size="sm"
                     onClick={searchCep}
                     disabled={cepLoading}
                   >
                     <Search className="h-4 w-4" />
                   </Button>
                 </div>
               </div>
               <div className="md:col-span-2">
                 <Label htmlFor="endereco">Endereço</Label>
                 <Input
                   id="endereco"
                   value={formData.endereco}
                   onChange={(e) => handleInputChange('endereco', e.target.value)}
                   placeholder="Rua, avenida, etc."
                 />
               </div>
               <div>
                 <Label htmlFor="numero_endereco">Número</Label>
                 <Input
                   id="numero_endereco"
                   value={formData.numero_endereco}
                   onChange={(e) => handleInputChange('numero_endereco', e.target.value)}
                   placeholder="123"
                 />
               </div>
               <div className="md:col-span-2">
                 <Label htmlFor="complemento">Complemento</Label>
                 <Input
                   id="complemento"
                   value={formData.complemento}
                   onChange={(e) => handleInputChange('complemento', e.target.value)}
                   placeholder="Apto 101, Bloco A, etc."
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
            </CardContent>
          </Card>

           {/* Outros Dados */}
           <Card>
             <CardHeader>
               <CardTitle>Outros Dados</CardTitle>
             </CardHeader>
             <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="telefone_emergencia">Telefone de Emergência</Label>
                  <InputMask
                    mask="(99) 99999-9999"
                    value={formData.telefone_emergencia}
                    onChange={(e) => handleInputChange('telefone_emergencia', e.target.value)}
                  >
                    {(inputProps) => (
                      <Input
                        {...inputProps}
                        id="telefone_emergencia"
                        placeholder="(11) 99999-9999"
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
                      <SelectValue placeholder="Selecionar tipo sanguíneo" />
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
                 <Checkbox
                   id="pcd"
                   checked={formData.pcd}
                   onCheckedChange={(checked) => handleInputChange('pcd', !!checked)}
                 />
                 <Label htmlFor="pcd">PCD (Pessoa com Deficiência)</Label>
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
             </CardContent>
           </Card>
        </TabsContent>

        <TabsContent value="funcionais" className="space-y-6">
          {/* Contratuais */}
          <Card>
            <CardHeader>
              <CardTitle>Contratuais</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="md:col-span-3">
                <Label htmlFor="cargo">Cargo</Label>
                <div className="flex gap-2">
                  <Select value={selectedCargoId} onValueChange={handleCargoChange}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Selecionar cargo cadastrado" />
                    </SelectTrigger>
                    <SelectContent>
                      {cargos.map((cargo) => (
                        <SelectItem key={cargo.id} value={cargo.id}>
                          {cargo.nome_completo_cargo} - {cargo.tipo_cargo} - R$ {cargo.salario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <CargosManager 
                    currentEmpresa={currentEmpresa} 
                    onCargoUpdated={loadCargos}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="cargo_atual">Cargo Atual</Label>
                <Input
                  id="cargo_atual"
                  value={formData.cargo_atual}
                  onChange={(e) => handleInputChange('cargo_atual', e.target.value)}
                  placeholder="Ex: Analista"
                  readOnly={!!selectedCargoId}
                />
              </div>
              <div>
                <Label htmlFor="tipo_cargo">Tipo de Cargo</Label>
                <Input
                  id="tipo_cargo"
                  value={formData.tipo_cargo}
                  onChange={(e) => handleInputChange('tipo_cargo', e.target.value)}
                  placeholder="Ex: Efetivo, Comissionado"
                  readOnly={!!selectedCargoId}
                />
              </div>
               <div>
                 <Label htmlFor="salario_atual">Salário Atual</Label>
                 <Input
                   id="salario_atual"
                   type="number"
                   step="0.01"
                   value={formData.salario_atual}
                   onChange={(e) => handleInputChange('salario_atual', e.target.value)}
                   placeholder="0.00"
                   readOnly={!!selectedCargoId}
                 />
               </div>
               <div>
                 <Label htmlFor="tipo_contrato">Tipo de Contrato</Label>
                 <Input
                   id="tipo_contrato"
                   value={formData.tipo_contrato}
                   onChange={(e) => handleInputChange('tipo_contrato', e.target.value)}
                   placeholder="Ex: CLT, PJ"
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
               <div>
                 <Label htmlFor="setor_atual">Setor Atual</Label>
                 <Input
                   id="setor_atual"
                   value={formData.setor_atual}
                   onChange={(e) => handleInputChange('setor_atual', e.target.value)}
                   placeholder="Ex: Recursos Humanos"
                 />
               </div>
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
                 <Label htmlFor="data_demissao">Data de Demissão</Label>
                 <Input
                   id="data_demissao"
                   type="date"
                   value={formData.data_demissao}
                   onChange={(e) => handleInputChange('data_demissao', e.target.value)}
                  placeholder="Ex: Recursos Humanos"
                />
              </div>
            </CardContent>
          </Card>

          {/* Documentação */}
          <Card>
            <CardHeader>
              <CardTitle>Documentação</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="rg">RG</Label>
                <Input
                  id="rg"
                  value={formData.rg}
                  onChange={(e) => handleInputChange('rg', e.target.value)}
                  placeholder="12.345.678-9"
                />
              </div>
              <div>
                <Label htmlFor="cpf">CPF</Label>
                <Input
                  id="cpf"
                  value={formData.cpf}
                  onChange={(e) => handleInputChange('cpf', e.target.value)}
                  placeholder="123.456.789-00"
                />
              </div>
              <div>
                <Label htmlFor="ctps">CTPS</Label>
                <Input
                  id="ctps"
                  value={formData.ctps}
                  onChange={(e) => handleInputChange('ctps', e.target.value)}
                  placeholder="1234567"
                />
              </div>
              <div>
                <Label htmlFor="serie">Série</Label>
                <Input
                  id="serie"
                  value={formData.serie}
                  onChange={(e) => handleInputChange('serie', e.target.value)}
                  placeholder="123"
                />
              </div>
              <div>
                <Label htmlFor="pis">PIS</Label>
                <Input
                  id="pis"
                  value={formData.pis}
                  onChange={(e) => handleInputChange('pis', e.target.value)}
                  placeholder="123.45678.90-1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Upload de Documentos */}
          <DocumentUpload 
            funcionarioId="temp"
            empresaId={currentEmpresa?.id}
            onDocumentUploaded={(url, fileName) => {
              console.log('Documento anexado:', fileName, url);
            }}
          />

          {/* Financeiro */}
          <Card>
            <CardHeader>
              <CardTitle>Financeiro</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="banco">Banco</Label>
                <Input
                  id="banco"
                  value={formData.banco}
                  onChange={(e) => handleInputChange('banco', e.target.value)}
                  placeholder="Ex: Banco do Brasil"
                />
              </div>
              <div>
                <Label htmlFor="agencia">Agência</Label>
                <Input
                  id="agencia"
                  value={formData.agencia}
                  onChange={(e) => handleInputChange('agencia', e.target.value)}
                  placeholder="1234"
                />
              </div>
              <div>
                <Label htmlFor="numero_conta">Número da Conta</Label>
                <Input
                  id="numero_conta"
                  value={formData.numero_conta}
                  onChange={(e) => handleInputChange('numero_conta', e.target.value)}
                  placeholder="12345-6"
                />
              </div>
              <div>
                <Label htmlFor="tipo_conta">Tipo de Conta</Label>
                <Input
                  id="tipo_conta"
                  value={formData.tipo_conta}
                  onChange={(e) => handleInputChange('tipo_conta', e.target.value)}
                  placeholder="Ex: Corrente, Poupança"
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="chave_pix">Chave PIX</Label>
                <Input
                  id="chave_pix"
                  value={formData.chave_pix}
                  onChange={(e) => handleInputChange('chave_pix', e.target.value)}
                  placeholder="email@exemplo.com ou 123.456.789-00"
                 />
               </div>
             </CardContent>
           </Card>

         </TabsContent>

        <TabsContent value="acesso" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Acesso ao Sistema
                </CardTitle>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="createUser"
                    checked={createUser}
                    onCheckedChange={(checked) => setCreateUser(!!checked)}
                  />
                  <Label htmlFor="createUser">Criar usuário para acesso ao sistema</Label>
                </div>
              </div>
            </CardHeader>
            {createUser && (
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <Label htmlFor="userNome">Nome do Usuário</Label>
                  <Input
                    id="userNome"
                    value={userFormData.nome}
                    onChange={(e) => setUserFormData(prev => ({ ...prev, nome: e.target.value }))}
                    placeholder="Nome completo do usuário"
                  />
                </div>
                <div>
                  <Label htmlFor="userEmail">Email de Acesso</Label>
                  <Input
                    id="userEmail"
                    type="email"
                    value={userFormData.email}
                    onChange={(e) => setUserFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="email@exemplo.com"
                  />
                </div>
                <div>
                  <Label htmlFor="userPassword">Senha</Label>
                  <Input
                    id="userPassword"
                    type="password"
                    value={userFormData.password}
                    onChange={(e) => setUserFormData(prev => ({ ...prev, password: e.target.value }))}
                    placeholder="••••••••"
                  />
                </div>
                <div>
                  <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    value={userFormData.confirmPassword}
                    onChange={(e) => setUserFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    placeholder="••••••••"
                  />
                </div>
                <div className="md:col-span-2">
                  <div className="bg-muted p-3 rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      ⚠️ O usuário receberá um email de confirmação para ativar a conta.
                      Certifique-se de que o email está correto.
                    </p>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        </TabsContent>

      </Tabs>
     </div>
  );
}