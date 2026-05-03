import { useState, useEffect } from "react";
import { useParams, Link, useSearchParams, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Edit,
  Plus,
  Trash2,
  Calendar,
  TrendingUp,
  Settings,
  GraduationCap,
  UserMinus,
  Clock,
  AlertTriangle,
  User,
  FileText,
  ShieldAlert,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CargosManager } from "@/components/CargosManager";
import { DocumentView } from "@/components/DocumentView";
import { DocumentUpload } from "@/components/DocumentUpload";
import { ASOsManager } from "@/components/ASOsManager";
import { TreinamentosFuncionarioManager } from "@/components/TreinamentosFuncionarioManager";
import { FeriasManager } from "@/components/FeriasManager";
import { AusenciasManager } from "@/components/AusenciasManager";
import { OcorrenciasManager } from "@/components/OcorrenciasManager";
import { formatDateForDisplay } from "@/lib/utils";
import { usePermissions } from "@/hooks/usePermissions";
import { AuditLogFooter } from "@/components/AuditLogFooter";
import { useAuditLog } from "@/hooks/useAuditLog";

interface Funcionario {
  id: string;
  codigo: string;
  nome_completo: string;
  nome_abreviado: string;
  genero: string;
  data_nascimento: string;
  telefone: string;
  email: string;
  endereco: string;
  numero_endereco: string;
  bairro: string;
  cidade: string;
  uf: string;
  cep: string;
  telefone_emergencia: string;
  nome_contato_emergencia: string;
  tipo_sanguineo: string;
  pcd: boolean;
  empresa_id: string;
  cargo_atual: string;
  tipo_cargo: string;
  tipo_contrato: string;
  salario_atual: number;
  data_admissao: string;
  data_demissao: string | null;
  setor_atual: string;
  area_atuacao: string;
  rg: string;
  cpf: string;
  ctps: string;
  serie: string;
  pis: string;
  banco: string;
  agencia: string;
  numero_conta: string;
  tipo_conta: string;
  chave_pix: string;
  created_at: string;
  updated_at: string;
  foto_url?: string;
  recebe_vale_alimentacao?: boolean;
  recebe_vale_transporte?: boolean;
}

interface Ferias {
  id: string;
  funcionario_id: string;
  empresa_id: string;
  previsao: boolean;
  data_limite: string;
  periodo_aquisitivo_inicio: string;
  periodo_aquisitivo_fim: string;
  valor_ferias: number;
  observacoes: string;
  created_at: string;
  updated_at: string;
}

interface AlteracaoSalarial {
  id: string;
  funcionario_id: string;
  empresa_id: string;
  data_alteracao: string;
  motivo: "Promocao" | "AlteracaoSalarial" | "TransferenciaEmpresa";
  cargo_anterior: string;
  salario_anterior: number;
  novo_cargo: string;
  novo_salario: number;
  observacoes?: string;
  created_at: string;
  updated_at: string;
}

interface Treinamento {
  id: string;
  funcionario_id: string;
  empresa_id: string;
  titulo_treinamento: string;
  fornecedor: string;
  local: string;
  data_inicio: string;
  data_termino: string;
  duracao: number;
  investimento: number;
  observacoes?: string;
  renovado?: boolean;
  created_at: string;
  updated_at: string;
}

interface Ausencia {
  id: string;
  funcionario_id: string;
  empresa_id: string;
  tipo_ausencia: string;
  data_inicio: string;
  data_fim: string;
  justificada: boolean;
  atestado_medico: boolean;
  observacoes: string;
  created_at: string;
  updated_at: string;
}

interface Advertencia {
  id: string;
  funcionario_id: string;
  empresa_id: string;
  data_ocorrencia: string;
  tipo_ocorrencia: string;
  dias_penalidade: number;
  motivo_penalidade: string;
  observacoes: string;
  created_at: string;
  updated_at: string;
}

interface Demissao {
  id: string;
  funcionario_id: string;
  empresa_id: string;
  data_demissao: string;
  motivo_desligamento: string;
  observacoes: string;
  documento_url?: string;
  created_at: string;
  updated_at: string;
}

interface Cargo {
  id: string;
  nome: string;
  salario: number;
}

interface EmpresaComPerfil {
  id: string;
  fantasia: string;
  perfil_id: string | null;
  perfil_nome: string | null;
}

interface UserAccess {
  id: string;
  email: string;
  nome: string;
  created_at: string;
  last_sign_in_at: string | null;
  roles: { role: string; empresa_id: string }[];
  empresas: EmpresaComPerfil[];
}

interface EmpresaAcessoForm {
  empresa_id: string;
  empresa_nome: string;
  selecionada: boolean;
  perfil_id: string;
}

type UserRole = 'admin' | 'hr_manager' | 'employee';

const roleLabels: Record<UserRole, string> = {
  admin: 'Administrador',
  hr_manager: 'Gestor de RH',
  employee: 'Funcionário',
};

export function FuncionarioDetalhes() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "dados");
  const [funcionario, setFuncionario] = useState<Funcionario | null>(null);
  const [alteracoesSalariais, setAlteracoesSalariais] = useState<AlteracaoSalarial[]>([]);
  const [treinamentos, setTreinamentos] = useState<Treinamento[]>([]);

  const [advertencias, setAdvertencias] = useState<Advertencia[]>([]);
  const { hasPermission, isLoading: permissionsLoading, isSuperAdmin } = usePermissions(funcionario?.empresa_id);
  const { logChanges } = useAuditLog();
  const [demissoes, setDemissoes] = useState<Demissao[]>([]);
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [currentEmpresa, setCurrentEmpresa] = useState<any>(null);
  const [userAccess, setUserAccess] = useState<UserAccess | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessLoading, setAccessLoading] = useState(false);
  const [alteracoesLoading, setAlteracoesLoading] = useState(false);
  const [treinamentosLoading, setTreinamentosLoading] = useState(false);

  const [advertenciasLoading, setAdvertenciasLoading] = useState(false);
  const [demissoesLoading, setDemissoesLoading] = useState(false);
  const [cargosManagerOpen, setCargosManagerOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [alteracaoDialogOpen, setAlteracaoDialogOpen] = useState(false);
  const [treinamentoDialogOpen, setTreinamentoDialogOpen] = useState(false);

  const [advertenciaDialogOpen, setAdvertenciaDialogOpen] = useState(false);
  const [demissaoDialogOpen, setDemissaoDialogOpen] = useState(false);
  const [accessDialogOpen, setAccessDialogOpen] = useState(false);
  const [editingAlteracao, setEditingAlteracao] = useState<AlteracaoSalarial | null>(null);
  const [editingTreinamento, setEditingTreinamento] = useState<Treinamento | null>(null);

  const [editingAdvertencia, setEditingAdvertencia] = useState<Advertencia | null>(null);
  const [editingDemissao, setEditingDemissao] = useState<Demissao | null>(null);
  const [alteracaoFormData, setAlteracaoFormData] = useState({
    data_alteracao: "",
    motivo: "Promocao" as "Promocao" | "AlteracaoSalarial" | "TransferenciaEmpresa",
    cargo_anterior: "",
    salario_anterior: 0,
    novo_cargo: "",
    novo_salario: 0,
    observacoes: "",
  });
  const [transferenciaDialogOpen, setTransferenciaDialogOpen] = useState(false);
  const [empresasDisponiveis, setEmpresasDisponiveis] = useState<{ id: string; fantasia: string }[]>([]);
  const [empresaSelecionada, setEmpresaSelecionada] = useState<string>("");
  const [treinamentoFormData, setTreinamentoFormData] = useState({
    titulo_treinamento: "",
    fornecedor: "",
    local: "",
    data_inicio: "",
    data_termino: "",
    duracao: 0,
    investimento: 0,
    observacoes: "",
    renovado: false,
  });
  const [advertenciaFormData, setAdvertenciaFormData] = useState({
    data_ocorrencia: "",
    tipo_ocorrencia: "",
    dias_penalidade: 0,
    motivo_penalidade: "",
    observacoes: "",
  });
  const [demissaoFormData, setDemissaoFormData] = useState({
    data_demissao: "",
    motivo_desligamento: "",
    observacoes: "",
    documento_url: "",
  });
  const [accessFormData, setAccessFormData] = useState({
    nome: "",
    email: "",
    password: "",
    confirmPassword: "",
    perfil_id: "",
  });
  const [perfisAcesso, setPerfisAcesso] = useState<{id: string, nome: string}[]>([]);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [editRoleDialogOpen, setEditRoleDialogOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole>("employee");

  // Estados para gerenciamento de empresas no acesso
  const [empresasGrupo, setEmpresasGrupo] = useState<{ id: string; fantasia: string }[]>([]);
  const [empresasAcessoForm, setEmpresasAcessoForm] = useState<EmpresaAcessoForm[]>([]);
  const [perfisGrupo, setPerfisGrupo] = useState<{ id: string; nome: string; empresa_id: string }[]>([]);
  const [addEmpresaDialogOpen, setAddEmpresaDialogOpen] = useState(false);
  const [editPerfilEmpresaDialogOpen, setEditPerfilEmpresaDialogOpen] = useState(false);
  const [selectedEmpresaForEdit, setSelectedEmpresaForEdit] = useState<EmpresaComPerfil | null>(null);
  const [selectedPerfilForEdit, setSelectedPerfilForEdit] = useState<string>("");
  const [newEmpresaId, setNewEmpresaId] = useState<string>("");
  const [newEmpresaPerfilId, setNewEmpresaPerfilId] = useState<string>("");

  // States para Observações
  const [observacaoDialogOpen, setObservacaoDialogOpen] = useState(false);
  const [observacaoAtual, setObservacaoAtual] = useState("");
  const [observacaoAlteracaoDialogOpen, setObservacaoAlteracaoDialogOpen] = useState(false);
  const [observacaoAlteracaoAtual, setObservacaoAlteracaoAtual] = useState("");
  const [alteracaoIdAtual, setAlteracaoIdAtual] = useState("");

  const canViewTab = (tab: string) => {
    if (permissionsLoading || isSuperAdmin) return true;

    switch (tab) {
      case "dados":
        return [
          "func.aba.dados_pessoais",
          "func.aba.documentacao",
          "func.aba.endereco",
          "func.aba.contratuais",
          "func.aba.documentos_anexados",
          "func.aba.financeiro",
          "func.aba.outros",
        ].some((p) => hasPermission(p));
      case "ferias":
        return hasPermission("func.aba.ferias");
      case "alteracoes":
      case "demissoes":
        return hasPermission("func.aba.historico");
      case "treinamentos":
        return hasPermission("func.aba.treinamentos");
      case "exames":
        return hasPermission("func.aba.exames");
      case "ausencias":
        return hasPermission("func.aba.ausencias");
      case "ocorrencias":
        return hasPermission("func.aba.ocorrencias");
      case "advertencias":
        return hasPermission("func.aba.advertencias");
      case "acesso":
        return hasPermission("func.aba.acesso");
      default:
        return true;
    }
  };

  const allowedTabs = [
    "dados",
    "ferias",
    "exames",
    "treinamentos",
    "ausencias",
    "alteracoes",
    "advertencias",
    "ocorrencias",
    "demissoes",
    "acesso",
  ].filter(canViewTab);

  const { toast } = useToast();

  useEffect(() => {
    if (permissionsLoading) return;
    if (allowedTabs.length === 0) return;

    if (activeTab && !allowedTabs.includes(activeTab)) {
      const fallback = allowedTabs[0];
      setActiveTab(fallback);
      setSearchParams({ tab: fallback });
      toast({
        title: "Sem permissão",
        description: "Você não tem permissão para acessar essa aba.",
        variant: "destructive",
      });
    }
  }, [permissionsLoading, allowedTabs.join("|"), activeTab]);

  useEffect(() => {
    if (!funcionario) return;

    loadCargos();
    loadEmpresasDisponiveis();

    // Só consulta/gerencia acesso ao sistema se tiver permissão para a aba de Acesso
    if (!permissionsLoading && (isSuperAdmin || hasPermission("func.aba.acesso"))) {
      loadUserAccess();
      loadPerfisAcesso();
      loadEmpresasGrupo();
    } else {
      setUserAccess(null);
    }

    // Criar objeto empresa para o CargosManager
    setCurrentEmpresa({
      id: funcionario.empresa_id,
      fantasia: "",
      razao_social: "",
      cnpj: "",
      logo_url: "",
    });
  }, [funcionario, permissionsLoading, isSuperAdmin, hasPermission]);

  const loadPerfisAcesso = async () => {
    if (!funcionario?.empresa_id) return;
    
    // Buscar empresa para obter grupo_empresarial_id
    const { data: empresa } = await supabase
      .from('empresas')
      .select('grupo_empresarial_id')
      .eq('id', funcionario.empresa_id)
      .single();
    
    if (!empresa) return;
    
    // Buscar todos os perfis do grupo empresarial
    const { data: empresasDoGrupo } = await supabase
      .from('empresas')
      .select('id')
      .eq('grupo_empresarial_id', empresa.grupo_empresarial_id);
    
    if (!empresasDoGrupo) return;
    
    const empresaIds = empresasDoGrupo.map(e => e.id);
    
    const { data, error } = await supabase
      .from('perfis_acesso')
      .select('id, nome, empresa_id')
      .in('empresa_id', empresaIds)
      .order('nome');
      
    if (error) {
      console.error('Erro ao buscar perfis de acesso:', error);
    } else {
      setPerfisAcesso(data || []);
      setPerfisGrupo(data || []);
    }
  };

  const loadEmpresasGrupo = async () => {
    if (!funcionario?.empresa_id) return;
    
    // Buscar empresa para obter grupo_empresarial_id
    const { data: empresa } = await supabase
      .from('empresas')
      .select('grupo_empresarial_id')
      .eq('id', funcionario.empresa_id)
      .single();
    
    if (!empresa) return;
    
    // Buscar todas as empresas do grupo
    const { data, error } = await supabase
      .from('empresas')
      .select('id, fantasia')
      .eq('grupo_empresarial_id', empresa.grupo_empresarial_id)
      .eq('ativo', true)
      .order('fantasia');
      
    if (error) {
      console.error('Erro ao buscar empresas do grupo:', error);
    } else {
      setEmpresasGrupo(data || []);
      
      // Inicializar formulário de empresas com a empresa atual selecionada
      const empresasForm: EmpresaAcessoForm[] = (data || []).map(e => ({
        empresa_id: e.id,
        empresa_nome: e.fantasia,
        selecionada: e.id === funcionario.empresa_id,
        perfil_id: "",
      }));
      setEmpresasAcessoForm(empresasForm);
    }
  };

  const loadFuncionario = async () => {
    try {
      setLoading(true);

      // Usar função segura que aplica mascaramento baseado em role
      const { data: allData, error } = await supabase.rpc("funcionarios_safe");

      if (error) throw error;

      const data = allData?.find((f) => f.id === id) || null;

      if (error) {
        console.error("Erro ao buscar funcionário:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados do funcionário.",
          variant: "destructive",
        });
      } else {
        setFuncionario(data as Funcionario);
      }
    } catch (error) {
      console.error("Erro ao buscar funcionário:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do funcionário.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadAlteracoesSalariais = async () => {
    try {
      setAlteracoesLoading(true);

      const { data, error } = await supabase
        .from("alteracoes_salariais")
        .select("*")
        .eq("funcionario_id", id)
        .order("data_alteracao", { ascending: false });

      if (error) {
        console.error("Erro ao buscar alterações salariais:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados de alterações salariais.",
          variant: "destructive",
        });
      } else {
        setAlteracoesSalariais((data || []) as AlteracaoSalarial[]);
      }
    } catch (error) {
      console.error("Erro ao buscar alterações salariais:", error);
    } finally {
      setAlteracoesLoading(false);
    }
  };

  const loadCargos = async () => {
    try {
      if (!funcionario) return;

      const { data, error } = await supabase
        .from("cargos")
        .select("id, nome, salario")
        .eq("empresa_id", funcionario.empresa_id)
        .order("nome");

      if (error) {
        console.error("Erro ao buscar cargos:", error);
      } else {
        setCargos(data || []);
      }
    } catch (error) {
      console.error("Erro ao buscar cargos:", error);
    }
  };

  const loadEmpresasDisponiveis = async () => {
    try {
      if (!funcionario) return;

      const { data, error } = await supabase
        .from("usuarios_empresas")
        .select(
          `
          empresa_id,
          empresas (
            id,
            fantasia
          )
        `,
        )
        .eq("user_id", (await supabase.auth.getUser()).data.user?.id);

      if (error) {
        console.error("Erro ao buscar empresas disponíveis:", error);
      } else {
        const empresasFormatted =
          data
            ?.map((item: any) => ({
              id: item.empresas.id,
              fantasia: item.empresas.fantasia,
            }))
            .filter((empresa) => empresa.id !== funcionario.empresa_id) || [];
        setEmpresasDisponiveis(empresasFormatted);
      }
    } catch (error) {
      console.error("Erro ao buscar empresas disponíveis:", error);
    }
  };

  const loadTreinamentos = async () => {
    try {
      setTreinamentosLoading(true);

      const { data, error } = await supabase
        .from("treinamentos")
        .select("*")
        .eq("funcionario_id", id)
        .order("data_inicio", { ascending: false });

      if (error) {
        console.error("Erro ao buscar treinamentos:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados de treinamentos.",
          variant: "destructive",
        });
      } else {
        setTreinamentos(data || []);
      }
    } catch (error) {
      console.error("Erro ao buscar treinamentos:", error);
    } finally {
      setTreinamentosLoading(false);
    }
  };

  const loadAdvertencias = async () => {
    try {
      setAdvertenciasLoading(true);

      const { data, error } = await supabase
        .from("advertencias")
        .select("*")
        .eq("funcionario_id", id)
        .order("data_ocorrencia", { ascending: false });

      if (error) {
        console.error("Erro ao buscar advertências:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados de advertências.",
          variant: "destructive",
        });
      } else {
        setAdvertencias(data || []);
      }
    } catch (error) {
      console.error("Erro ao buscar advertências:", error);
    } finally {
      setAdvertenciasLoading(false);
    }
  };

  const loadDemissoes = async () => {
    try {
      setDemissoesLoading(true);

      const { data, error } = await supabase
        .from("demissoes")
        .select("*")
        .eq("funcionario_id", id)
        .order("data_demissao", { ascending: false });

      if (error) {
        console.error("Erro ao buscar demissões:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados de demissões.",
          variant: "destructive",
        });
      } else {
        setDemissoes(data || []);
      }
    } catch (error) {
      console.error("Erro ao buscar demissões:", error);
    } finally {
      setDemissoesLoading(false);
    }
  };

  useEffect(() => {
    if (!id) {
      setFuncionario(null);
      setLoading(false);
      return;
    }

    loadFuncionario();
    loadAlteracoesSalariais();
    loadTreinamentos();
    loadAdvertencias();
    loadDemissoes();
  }, [id]);

  const loadUserAccess = async () => {
    try {
      if (!funcionario) return;

      setAccessLoading(true);

      // Usar Edge Function para buscar dados completos do usuário
      const { data: sessionData } = await supabase.auth.getSession();

      // Verificar se a sessão existe antes de chamar a função
      if (!sessionData.session?.access_token) {
        console.warn('Sessão não encontrada, pulando carregamento de acesso');
        setUserAccess(null);
        return;
      }

      const response = await supabase.functions.invoke('manage-user-access', {
        body: {
          action: 'get-user-info',
          funcionario_id: id,
          empresa_id: funcionario.empresa_id,
        },
        headers: {
          Authorization: `Bearer ${sessionData.session.access_token}`,
        },
      });

      if (response.error) {
        const status = (response.error as any)?.status;
        const message = response.error.message || "";

        if (status === 403 || message.toLowerCase().includes("permission")) {
          toast({
            title: "Sem permissão",
            description: "Você não tem permissão para gerenciar/consultar o acesso ao sistema deste funcionário.",
            variant: "destructive",
          });
          setUserAccess(null);
          return;
        }

        console.error('Erro ao buscar acesso do usuário:', response.error);
        toast({
          title: "Erro",
          description: response.error.message || "Erro ao buscar acesso do usuário.",
          variant: "destructive",
        });
        return;
      }

      const data = response.data;
      
      if (data?.hasAccess && data.user) {
        setUserAccess({
          id: data.user.id,
          email: data.user.email || '',
          nome: funcionario.nome_completo,
          created_at: data.user.created_at,
          last_sign_in_at: data.user.last_sign_in_at,
          roles: data.user.roles || [],
          empresas: data.user.empresas || [],
        });
        
        // Set selected role for edit dialog
        const currentRole = data.user.roles?.find((r: any) => r.empresa_id === funcionario.empresa_id);
        if (currentRole) {
          setSelectedRole(currentRole.role as UserRole);
        }
      } else {
        setUserAccess(null);
      }
    } catch (error: any) {
      const message = String(error?.message || "");
      if (message.toLowerCase().includes("non-2xx") || message.toLowerCase().includes("permission")) {
        toast({
          title: "Sem permissão",
          description: "Você não tem permissão para consultar o acesso ao sistema deste funcionário.",
          variant: "destructive",
        });
      } else {
        console.error("Erro ao buscar acesso do usuário:", error);
      }
      setUserAccess(null);
    } finally {
      setAccessLoading(false);
    }
  };

  const handleCreateUserAccess = async () => {
    try {
      if (!funcionario) return;

      // Validações
      if (!accessFormData.email || !accessFormData.password) {
        toast({
          title: "Erro",
          description: "Email e senha são obrigatórios.",
          variant: "destructive",
        });
        return;
      }

      // Verificar se pelo menos uma empresa foi selecionada com perfil
      const empresasSelecionadas = empresasAcessoForm.filter(e => e.selecionada && e.perfil_id);
      if (empresasSelecionadas.length === 0) {
        toast({
          title: "Erro",
          description: "Selecione pelo menos uma empresa e seu perfil de acesso.",
          variant: "destructive",
        });
        return;
      }

      if (accessFormData.password !== accessFormData.confirmPassword) {
        toast({
          title: "Erro",
          description: "As senhas não coincidem.",
          variant: "destructive",
        });
        return;
      }

      if (accessFormData.password.length < 6) {
        toast({
          title: "Erro",
          description: "A senha deve ter pelo menos 6 caracteres.",
          variant: "destructive",
        });
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();

      // Montar array de empresas com perfis
      const empresas_acesso = empresasSelecionadas.map(e => ({
        empresa_id: e.empresa_id,
        perfil_id: e.perfil_id,
      }));

      const response = await supabase.functions.invoke('create-user-access', {
        body: {
          funcionario_id: id,
          email: accessFormData.email,
          password: accessFormData.password,
          empresas_acesso,
        },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (response.error) {
        toast({
          title: "Erro",
          description: response.error.message || "Erro ao criar usuário.",
          variant: "destructive",
        });
        return;
      }

      if (response.data?.error) {
        toast({
          title: "Erro",
          description: response.data.error,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: `Usuário criado com acesso a ${empresas_acesso.length} empresa(s)!`,
      });

      setAccessDialogOpen(false);
      resetAccessForm();
      loadUserAccess();
    } catch (error: any) {
      console.error("Erro ao criar usuário:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar usuário.",
        variant: "destructive",
      });
    }
  };

  const handleAddEmpresaAccess = async () => {
    try {
      if (!userAccess || !funcionario || !newEmpresaId || !newEmpresaPerfilId) {
        toast({ title: "Erro", description: "Selecione empresa e perfil.", variant: "destructive" });
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('manage-user-access', {
        body: {
          action: 'add-empresa-access',
          user_id: userAccess.id,
          empresa_id: funcionario.empresa_id,
          target_empresa_id: newEmpresaId,
          perfil_id: newEmpresaPerfilId,
        },
        headers: { Authorization: `Bearer ${sessionData.session?.access_token}` },
      });

      if (response.error || response.data?.error) {
        toast({ title: "Erro", description: response.data?.error || response.error?.message, variant: "destructive" });
        return;
      }

      toast({ title: "Sucesso", description: "Empresa vinculada com sucesso!" });
      setAddEmpresaDialogOpen(false);
      setNewEmpresaId("");
      setNewEmpresaPerfilId("");
      loadUserAccess();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleRemoveEmpresaAccess = async (empresaId: string) => {
    try {
      if (!userAccess || !funcionario) return;

      const { data: sessionData } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('manage-user-access', {
        body: {
          action: 'remove-empresa-access',
          user_id: userAccess.id,
          empresa_id: funcionario.empresa_id,
          target_empresa_id: empresaId,
        },
        headers: { Authorization: `Bearer ${sessionData.session?.access_token}` },
      });

      if (response.error || response.data?.error) {
        toast({ title: "Erro", description: response.data?.error || response.error?.message, variant: "destructive" });
        return;
      }

      toast({ title: "Sucesso", description: "Acesso à empresa removido!" });
      loadUserAccess();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleUpdatePerfilEmpresa = async () => {
    try {
      if (!userAccess || !funcionario || !selectedEmpresaForEdit || !selectedPerfilForEdit) return;

      const { data: sessionData } = await supabase.auth.getSession();
      const response = await supabase.functions.invoke('manage-user-access', {
        body: {
          action: 'update-perfil',
          user_id: userAccess.id,
          empresa_id: funcionario.empresa_id,
          target_empresa_id: selectedEmpresaForEdit.id,
          perfil_id: selectedPerfilForEdit,
        },
        headers: { Authorization: `Bearer ${sessionData.session?.access_token}` },
      });

      if (response.error || response.data?.error) {
        toast({ title: "Erro", description: response.data?.error || response.error?.message, variant: "destructive" });
        return;
      }

      toast({ title: "Sucesso", description: "Perfil atualizado!" });
      setEditPerfilEmpresaDialogOpen(false);
      setSelectedEmpresaForEdit(null);
      setSelectedPerfilForEdit("");
      loadUserAccess();
    } catch (error: any) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
    }
  };

  const handleRevokeAccess = async () => {
    try {
      if (!userAccess || !funcionario) return;

      const { data: sessionData } = await supabase.auth.getSession();

      const response = await supabase.functions.invoke('manage-user-access', {
        body: {
          action: 'revoke-access',
          funcionario_id: id,
          user_id: userAccess.id,
          empresa_id: funcionario.empresa_id,
        },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (response.error || response.data?.error) {
        toast({
          title: "Erro",
          description: response.data?.error || response.error?.message || "Erro ao revogar acesso.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Acesso revogado com sucesso!",
      });

      setUserAccess(null);
    } catch (error: any) {
      console.error("Erro ao revogar acesso:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao revogar acesso.",
        variant: "destructive",
      });
    }
  };

  const handleUpdateRole = async () => {
    try {
      if (!userAccess || !funcionario) return;

      const { data: sessionData } = await supabase.auth.getSession();

      const response = await supabase.functions.invoke('manage-user-access', {
        body: {
          action: 'update-role',
          user_id: userAccess.id,
          empresa_id: funcionario.empresa_id,
          new_role: selectedRole,
        },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (response.error || response.data?.error) {
        toast({
          title: "Erro",
          description: response.data?.error || response.error?.message || "Erro ao atualizar perfil.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Perfil de acesso atualizado com sucesso!",
      });

      setEditRoleDialogOpen(false);
      loadUserAccess();
    } catch (error: any) {
      console.error("Erro ao atualizar perfil:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar perfil.",
        variant: "destructive",
      });
    }
  };

  const handleResetPassword = async () => {
    try {
      if (!userAccess || !funcionario) return;

      if (newPassword !== confirmNewPassword) {
        toast({
          title: "Erro",
          description: "As senhas não coincidem.",
          variant: "destructive",
        });
        return;
      }

      if (newPassword.length < 6) {
        toast({
          title: "Erro",
          description: "A senha deve ter pelo menos 6 caracteres.",
          variant: "destructive",
        });
        return;
      }

      const { data: sessionData } = await supabase.auth.getSession();

      const response = await supabase.functions.invoke('manage-user-access', {
        body: {
          action: 'reset-password',
          user_id: userAccess.id,
          empresa_id: funcionario.empresa_id,
          new_password: newPassword,
        },
        headers: {
          Authorization: `Bearer ${sessionData.session?.access_token}`,
        },
      });

      if (response.error || response.data?.error) {
        toast({
          title: "Erro",
          description: response.data?.error || response.error?.message || "Erro ao redefinir senha.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sucesso",
        description: "Senha redefinida com sucesso!",
      });

      setResetPasswordDialogOpen(false);
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (error: any) {
      console.error("Erro ao redefinir senha:", error);
      toast({
        title: "Erro",
        description: error.message || "Erro ao redefinir senha.",
        variant: "destructive",
      });
    }
  };

  const resetAccessForm = () => {
    setAccessFormData({
      nome: funcionario?.nome_completo || "",
      email: funcionario?.email || "",
      password: "",
      confirmPassword: "",
      perfil_id: "",
    });
    // Resetar seleção de empresas
    const empresasForm: EmpresaAcessoForm[] = empresasGrupo.map(e => ({
      empresa_id: e.id,
      empresa_nome: e.fantasia,
      selecionada: e.id === funcionario?.empresa_id,
      perfil_id: "",
    }));
    setEmpresasAcessoForm(empresasForm);
  };

  const handleSaveAlteracao = async () => {
    try {
      if (!funcionario) return;

      const alteracaoData = {
        funcionario_id: funcionario.id,
        empresa_id: funcionario.empresa_id,
        ...alteracaoFormData,
      };

      if (editingAlteracao) {
        const { error } = await supabase
          .from("alteracoes_salariais")
          .update(alteracaoData)
          .eq("id", editingAlteracao.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Alteração salarial atualizada com sucesso!",
        });
      } else {
        const { error } = await supabase.from("alteracoes_salariais").insert(alteracaoData);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Alteração salarial cadastrada com sucesso!",
        });
      }

      setAlteracaoDialogOpen(false);
      setEditingAlteracao(null);
      setAlteracaoFormData({
        data_alteracao: "",
        motivo: "Promocao",
        cargo_anterior: "",
        salario_anterior: 0,
        novo_cargo: "",
        novo_salario: 0,
        observacoes: "",
      });
      loadAlteracoesSalariais();
    } catch (error) {
      console.error("Erro ao salvar alteração salarial:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a alteração salarial.",
        variant: "destructive",
      });
    }
  };

  const handleEditAlteracao = (alteracao: AlteracaoSalarial) => {
    setEditingAlteracao(alteracao);
    setAlteracaoFormData({
      data_alteracao: alteracao.data_alteracao,
      motivo: alteracao.motivo,
      cargo_anterior: alteracao.cargo_anterior || "",
      salario_anterior: alteracao.salario_anterior || 0,
      novo_cargo: alteracao.novo_cargo || "",
      novo_salario: alteracao.novo_salario,
      observacoes: alteracao.observacoes || "",
    });
    setAlteracaoDialogOpen(true);
  };

  const handleDeleteAlteracao = async (alteracaoId: string) => {
    try {
      const { error } = await supabase.from("alteracoes_salariais").delete().eq("id", alteracaoId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Alteração salarial excluída com sucesso!",
      });

      loadAlteracoesSalariais();
    } catch (error) {
      console.error("Erro ao excluir alteração salarial:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a alteração salarial.",
        variant: "destructive",
      });
    }
  };

  const resetAlteracaoForm = () => {
    setEditingAlteracao(null);
    setAlteracaoFormData({
      data_alteracao: "",
      motivo: "Promocao",
      cargo_anterior: funcionario?.cargo_atual || "",
      salario_anterior: funcionario?.salario_atual || 0,
      novo_cargo: "",
      novo_salario: 0,
      observacoes: "",
    });
  };

  const handleCargoSelect = (cargoId: string) => {
    const cargo = cargos.find((c) => c.id === cargoId);
    if (cargo) {
      setAlteracaoFormData((prev) => ({
        ...prev,
        novo_cargo: cargo.nome,
        novo_salario: cargo.salario,
      }));
    }
  };

  const handleCargoAnteriorSelect = (cargoId: string) => {
    const cargo = cargos.find((c) => c.id === cargoId);
    if (cargo) {
      setAlteracaoFormData((prev) => ({
        ...prev,
        cargo_anterior: cargo.nome,
        salario_anterior: cargo.salario,
      }));
    }
  };

  const handleTransferenciaEmpresa = async () => {
    if (!empresaSelecionada || !funcionario) {
      toast({
        title: "Erro",
        description: "Selecione uma empresa válida.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Primeiro atualizar o funcionário com a nova empresa
      const { error: funcionarioError } = await supabase
        .from("funcionarios")
        .update({ empresa_id: empresaSelecionada })
        .eq("id", funcionario.id);

      if (funcionarioError) throw funcionarioError;

      // Depois registrar a alteração funcional
      const alteracaoData = {
        funcionario_id: funcionario.id,
        empresa_id: empresaSelecionada,
        data_alteracao: new Date().toISOString().split("T")[0],
        motivo: "TransferenciaEmpresa",
        cargo_anterior: funcionario.cargo_atual || "",
        salario_anterior: funcionario.salario_atual || 0,
        novo_cargo: funcionario.cargo_atual || "",
        novo_salario: funcionario.salario_atual || 0,
      };

      const { error: alteracaoError } = await supabase.from("alteracoes_salariais").insert(alteracaoData);

      if (alteracaoError) throw alteracaoError;

      toast({
        title: "Sucesso",
        description: "Transferência realizada com sucesso!",
      });

      setTransferenciaDialogOpen(false);
      setEmpresaSelecionada("");
      loadFuncionario();
      loadAlteracoesSalariais();
    } catch (error) {
      console.error("Erro ao realizar transferência:", error);
      toast({
        title: "Erro",
        description: "Não foi possível realizar a transferência.",
        variant: "destructive",
      });
    }
  };

  const handleSaveTreinamento = async () => {
    try {
      if (!funcionario) return;

      const treinamentoData = {
        funcionario_id: funcionario.id,
        empresa_id: funcionario.empresa_id,
        ...treinamentoFormData,
        data_inicio: treinamentoFormData.data_inicio || null,
        data_termino: treinamentoFormData.data_termino || null,
      };

      if (editingTreinamento) {
        // Registrar auditoria antes de salvar
        await logChanges(
          funcionario.empresa_id,
          'treinamentos',
          editingTreinamento.id,
          editingTreinamento,
          treinamentoData
        );

        const { error } = await supabase.from("treinamentos").update(treinamentoData).eq("id", editingTreinamento.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Treinamento atualizado com sucesso!",
        });
      } else {
        const { error } = await supabase.from("treinamentos").insert(treinamentoData);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Treinamento cadastrado com sucesso!",
        });
      }

      setTreinamentoDialogOpen(false);
      setEditingTreinamento(null);
      setTreinamentoFormData({
        titulo_treinamento: "",
        fornecedor: "",
        local: "",
        data_inicio: "",
        data_termino: "",
        duracao: 0,
        investimento: 0,
        observacoes: "",
        renovado: false,
      });
      loadTreinamentos();
    } catch (error) {
      console.error("Erro ao salvar treinamento:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o treinamento.",
        variant: "destructive",
      });
    }
  };

  const handleEditTreinamento = (treinamento: Treinamento) => {
    setEditingTreinamento(treinamento);
    setTreinamentoFormData({
      titulo_treinamento: treinamento.titulo_treinamento,
      fornecedor: treinamento.fornecedor || "",
      local: treinamento.local || "",
      data_inicio: treinamento.data_inicio || "",
      data_termino: treinamento.data_termino || "",
      duracao: treinamento.duracao || 0,
      investimento: treinamento.investimento || 0,
      observacoes: treinamento.observacoes || "",
      renovado: treinamento.renovado || false,
    });
    setTreinamentoDialogOpen(true);
  };

  const handleDeleteTreinamento = async (treinamentoId: string) => {
    try {
      const { error } = await supabase.from("treinamentos").delete().eq("id", treinamentoId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Treinamento excluído com sucesso!",
      });

      loadTreinamentos();
    } catch (error) {
      console.error("Erro ao excluir treinamento:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir o treinamento.",
        variant: "destructive",
      });
    }
  };

  const resetTreinamentoForm = () => {
    setEditingTreinamento(null);
    setTreinamentoFormData({
      titulo_treinamento: "",
      fornecedor: "",
      local: "",
      data_inicio: "",
      data_termino: "",
      duracao: 0,
      investimento: 0,
      observacoes: "",
      renovado: false,
    });
  };

  // Advertências CRUD
  const handleSaveAdvertencia = async () => {
    try {
      if (!funcionario) return;

      const advertenciaData = {
        funcionario_id: funcionario.id,
        empresa_id: funcionario.empresa_id,
        ...advertenciaFormData,
      };

      if (editingAdvertencia) {
        // Registrar auditoria antes de salvar
        await logChanges(
          funcionario.empresa_id,
          'advertencias',
          editingAdvertencia.id,
          editingAdvertencia,
          advertenciaData
        );

        const { error } = await supabase.from("advertencias").update(advertenciaData).eq("id", editingAdvertencia.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Advertência atualizada com sucesso!",
        });
      } else {
        const { error } = await supabase.from("advertencias").insert(advertenciaData);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Advertência cadastrada com sucesso!",
        });
      }

      setAdvertenciaDialogOpen(false);
      setEditingAdvertencia(null);
      resetAdvertenciaForm();
      loadAdvertencias();
    } catch (error) {
      console.error("Erro ao salvar advertência:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a advertência.",
        variant: "destructive",
      });
    }
  };

  const handleEditAdvertencia = (advertencia: Advertencia) => {
    setEditingAdvertencia(advertencia);
    setAdvertenciaFormData({
      data_ocorrencia: advertencia.data_ocorrencia,
      tipo_ocorrencia: advertencia.tipo_ocorrencia,
      dias_penalidade: advertencia.dias_penalidade || 0,
      motivo_penalidade: advertencia.motivo_penalidade,
      observacoes: advertencia.observacoes || "",
    });
    setAdvertenciaDialogOpen(true);
  };

  const handleDeleteAdvertencia = async (advertenciaId: string) => {
    try {
      const { error } = await supabase.from("advertencias").delete().eq("id", advertenciaId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Advertência excluída com sucesso!",
      });

      loadAdvertencias();
    } catch (error) {
      console.error("Erro ao excluir advertência:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a advertência.",
        variant: "destructive",
      });
    }
  };

  const resetAdvertenciaForm = () => {
    setEditingAdvertencia(null);
    setAdvertenciaFormData({
      data_ocorrencia: "",
      tipo_ocorrencia: "",
      dias_penalidade: 0,
      motivo_penalidade: "",
      observacoes: "",
    });
  };

  // Demissões CRUD
  const handleSaveDemissao = async () => {
    try {
      if (!funcionario) return;

      const demissaoData = {
        funcionario_id: funcionario.id,
        empresa_id: funcionario.empresa_id,
        ...demissaoFormData,
      };

      if (editingDemissao) {
        // Registrar auditoria antes de salvar
        await logChanges(
          funcionario.empresa_id,
          'demissoes',
          editingDemissao.id,
          editingDemissao,
          demissaoData
        );

        const { error } = await supabase.from("demissoes").update(demissaoData).eq("id", editingDemissao.id);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Demissão atualizada com sucesso!",
        });
      } else {
        const { error } = await supabase.from("demissoes").insert(demissaoData);

        if (error) throw error;

        toast({
          title: "Sucesso",
          description: "Demissão cadastrada com sucesso!",
        });
      }

      setDemissaoDialogOpen(false);
      setEditingDemissao(null);
      resetDemissaoForm();
      loadDemissoes();
      loadFuncionario(); // Recarrega os dados do funcionário para atualizar a data_demissao
    } catch (error) {
      console.error("Erro ao salvar demissão:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a demissão.",
        variant: "destructive",
      });
    }
  };

  const handleEditDemissao = (demissao: Demissao) => {
    setEditingDemissao(demissao);
    setDemissaoFormData({
      data_demissao: demissao.data_demissao,
      motivo_desligamento: demissao.motivo_desligamento,
      observacoes: demissao.observacoes || "",
      documento_url: demissao.documento_url || "",
    });
    setDemissaoDialogOpen(true);
  };

  const handleDeleteDemissao = async (demissaoId: string) => {
    try {
      const { error } = await supabase.from("demissoes").delete().eq("id", demissaoId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Demissão excluída com sucesso!",
      });

      loadDemissoes();
      loadFuncionario(); // Recarrega os dados do funcionário para atualizar a data_demissao
    } catch (error) {
      console.error("Erro ao excluir demissão:", error);
      toast({
        title: "Erro",
        description: "Não foi possível excluir a demissão.",
        variant: "destructive",
      });
    }
  };

  const resetDemissaoForm = () => {
    setEditingDemissao(null);
    setDemissaoFormData({
      data_demissao: "",
      motivo_desligamento: "",
      observacoes: "",
      documento_url: "",
    });
  };

  const formatDate = (dateString?: string | null) => {
    return formatDateForDisplay(dateString);
  };

  const handleObservacaoAlteracaoClick = (alteracao: AlteracaoSalarial) => {
    setObservacaoAlteracaoAtual(alteracao.observacoes || "");
    setAlteracaoIdAtual(alteracao.id);
    setObservacaoAlteracaoDialogOpen(true);
  };

  const handleSaveObservacaoAlteracao = async () => {
    try {
      const { error } = await supabase
        .from("alteracoes_salariais")
        .update({ observacoes: observacaoAlteracaoAtual })
        .eq("id", alteracaoIdAtual);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Observação atualizada com sucesso!",
      });

      setObservacaoAlteracaoDialogOpen(false);
      loadAlteracoesSalariais();
    } catch (error) {
      console.error("Erro ao salvar observação:", error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar a observação.",
        variant: "destructive",
      });
    }
  };

  const handleDocumentUpload = async (url: string, fileName: string) => {
    setDemissaoFormData((prev) => ({ ...prev, documento_url: url }));
  };

  const calculateTenure = (admissionDate?: string | null) => {
    if (!admissionDate) return "-";

    const admission = new Date(admissionDate);
    const today = new Date();

    let years = today.getFullYear() - admission.getFullYear();
    let months = today.getMonth() - admission.getMonth();
    let days = today.getDate() - admission.getDate();

    if (days < 0) {
      months--;
      days += new Date(today.getFullYear(), today.getMonth(), 0).getDate();
    }

    if (months < 0) {
      years--;
      months += 12;
    }

    const parts = [];
    if (years > 0) parts.push(`${years} ano${years > 1 ? "s" : ""}`);
    if (months > 0) parts.push(`${months} ${months > 1 ? "meses" : "mês"}`);
    if (days > 0) parts.push(`${days} dia${days > 1 ? "s" : ""}`);

    return parts.length > 0 ? parts.join(", ") : "0 dias";
  };

  const formatCurrency = (value: number) => {
    if (!value) return "-";
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatCEP = (cep?: string | null) => {
    if (!cep) return "-";
    const cleanCEP = cep.replace(/\D/g, "");
    if (cleanCEP.length === 8) {
      return `${cleanCEP.slice(0, 5)}-${cleanCEP.slice(5)}`;
    }
    return cep;
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6 animate-fade-in">
        <div className="flex items-center gap-4 mb-6">
          <Skeleton className="h-10 w-24" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-8 w-80" />
              <Skeleton className="h-4 w-56" />
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-6">
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-28" />
          <Skeleton className="h-10 w-24" />
          <Skeleton className="h-10 w-28" />
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-40" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!funcionario) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-8">
          <p className="text-muted-foreground">Funcionário não encontrado.</p>
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
          <div className="flex items-center space-x-4">
            {funcionario.foto_url ? (
              <Dialog>
                <DialogTrigger asChild>
                  <img
                    src={funcionario.foto_url}
                    alt={`Foto de ${funcionario.nome_completo}`}
                    className="w-16 h-16 rounded-full object-cover border-2 border-primary/20 cursor-pointer hover:opacity-80 transition-opacity"
                  />
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Foto de {funcionario.nome_completo}</DialogTitle>
                  </DialogHeader>
                  <div className="flex justify-center">
                    <img
                      src={funcionario.foto_url}
                      alt={`Foto de ${funcionario.nome_completo}`}
                      className="max-w-full max-h-[70vh] object-contain rounded-lg"
                    />
                  </div>
                </DialogContent>
              </Dialog>
            ) : (
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <User className="h-8 w-8 text-primary" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-foreground uppercase">{funcionario.nome_completo}</h1>
              <p className="text-muted-foreground">
                {funcionario.codigo} • {funcionario.cargo_atual || "Cargo não informado"}
              </p>
            </div>
          </div>
        </div>
        {(isSuperAdmin || hasPermission('func.editar')) && (
          <Button asChild>
            <Link to={`/funcionarios/${funcionario.id}/editar`}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Link>
          </Button>
        )}
      </div>

      {permissionsLoading ? (
        <div className="space-y-4 animate-fade-in">
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>

          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
            </CardHeader>
            <CardContent className="space-y-3">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-4/6" />
            </CardContent>
          </Card>
        </div>
      ) : (
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value);
            setSearchParams({ tab: value });
          }}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-10">
            {canViewTab("dados") && <TabsTrigger value="dados">Dados</TabsTrigger>}
            {canViewTab("ferias") && <TabsTrigger value="ferias">Férias</TabsTrigger>}
            {canViewTab("exames") && <TabsTrigger value="exames">Exames</TabsTrigger>}
            {canViewTab("treinamentos") && (
              <TabsTrigger value="treinamentos">
                <GraduationCap className="h-4 w-4 mr-1" />
                Treinamentos
              </TabsTrigger>
            )}
            {canViewTab("ausencias") && (
              <TabsTrigger value="ausencias">
                <Clock className="h-4 w-4 mr-1" />
                Ausências
              </TabsTrigger>
            )}
            {canViewTab("alteracoes") && <TabsTrigger value="alteracoes">Alterações</TabsTrigger>}
            {canViewTab("advertencias") && (
              <TabsTrigger value="advertencias">
                <AlertTriangle className="h-4 w-4 mr-1" />
                Disciplinar
              </TabsTrigger>
            )}
            {canViewTab("ocorrencias") && (
              <TabsTrigger value="ocorrencias">
                <FileText className="h-4 w-4 mr-1" />
                Ocorrência
              </TabsTrigger>
            )}
            {canViewTab("demissoes") && (
              <TabsTrigger value="demissoes">
                <UserMinus className="h-4 w-4 mr-1" />
                Demissões
              </TabsTrigger>
            )}
            {canViewTab("acesso") && (
              <TabsTrigger value="acesso">
                <ShieldAlert className="h-4 w-4 mr-1" />
                Acesso
              </TabsTrigger>
            )}
          </TabsList>
        <TabsContent value="dados" className="space-y-6">
          {/* Dados Pessoais */}
          {(isSuperAdmin || hasPermission('func.aba.dados_pessoais')) && (
            <Card>
              <CardHeader>
                <CardTitle>Dados Pessoais</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Código</label>
                  <p className="text-foreground">{funcionario.codigo}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nome Completo</label>
                  <p className="text-foreground">{funcionario.nome_completo}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nome Abreviado</label>
                  <p className="text-foreground">{funcionario.nome_abreviado || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Gênero</label>
                  <p className="text-foreground">{funcionario.genero || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data de Nascimento</label>
                  <p className="text-foreground">{formatDate(funcionario.data_nascimento)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Telefone</label>
                  <p className="text-foreground">{funcionario.telefone || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email Pessoal</label>
                  <p className="text-foreground">{funcionario.email || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Email Corporativo</label>
                  <p className="text-foreground">{(funcionario as any).email_corporativo || "-"}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Documentação */}
          {(isSuperAdmin || hasPermission('func.aba.documentacao')) && (
            <Card>
              <CardHeader>
                <CardTitle>Documentação</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">RG</label>
                  <p className="text-foreground">{funcionario.rg || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">CPF</label>
                  <p className="text-foreground">{funcionario.cpf || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">CTPS</label>
                  <p className="text-foreground">{funcionario.ctps || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Série</label>
                  <p className="text-foreground">{funcionario.serie || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">PIS</label>
                  <p className="text-foreground">{funcionario.pis || "-"}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Endereço */}
          {(isSuperAdmin || hasPermission('func.aba.endereco')) && (
            <Card>
              <CardHeader>
                <CardTitle>Endereço</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Endereço</label>
                  <p className="text-foreground">{funcionario.endereco || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Número</label>
                  <p className="text-foreground">{funcionario.numero_endereco || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Bairro</label>
                  <p className="text-foreground">{funcionario.bairro || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Cidade</label>
                  <p className="text-foreground">{funcionario.cidade || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">UF</label>
                  <p className="text-foreground">{funcionario.uf || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">CEP</label>
                  <p className="text-foreground">{formatCEP(funcionario.cep)}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contratuais */}
          {(isSuperAdmin || hasPermission('func.aba.contratuais')) && (
            <Card>
              <CardHeader>
                <CardTitle>Contratuais</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Cargo Atual</label>
                  <p className="text-foreground">{funcionario.cargo_atual || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tipo de Cargo</label>
                  <p className="text-foreground">{funcionario.tipo_cargo || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tipo de Contrato</label>
                  <p className="text-foreground">{funcionario.tipo_contrato || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Salário Atual</label>
                  <p className="text-foreground">{formatCurrency(funcionario.salario_atual)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data de Admissão</label>
                  <p className="text-foreground">{formatDate(funcionario.data_admissao)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tempo de Empresa</label>
                  <p className="text-foreground">{calculateTenure(funcionario.data_admissao)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Data de Demissão</label>
                  <p className="text-foreground">{formatDate(funcionario.data_demissao)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Setor Atual</label>
                  <p className="text-foreground">{funcionario.setor_atual || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Área de Atuação</label>
                  <p className="text-foreground">{funcionario.area_atuacao || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Recebe Vale Transporte</label>
                  <p className="text-foreground">{funcionario.recebe_vale_transporte ? "Sim" : "Não"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Recebe Vale Alimentação</label>
                  <p className="text-foreground">{funcionario.recebe_vale_alimentacao ? "Sim" : "Não"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Fardamento</label>
                  <p className="text-foreground">{(funcionario as any).fardamento || "-"}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Documentos Anexados */}
          {(isSuperAdmin || hasPermission('func.aba.documentos_anexados')) && funcionario && (
            <DocumentView funcionarioId={funcionario.id} empresaId={funcionario.empresa_id} />
          )}

          {/* Financeiro */}
          {(isSuperAdmin || hasPermission('func.aba.financeiro')) && (
            <Card>
              <CardHeader>
                <CardTitle>Financeiro</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Banco</label>
                  <p className="text-foreground">{funcionario.banco || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Agência</label>
                  <p className="text-foreground">{funcionario.agencia || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Número da Conta</label>
                  <p className="text-foreground">{funcionario.numero_conta || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tipo de Conta</label>
                  <p className="text-foreground">{funcionario.tipo_conta || "-"}</p>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Chave PIX</label>
                  <p className="text-foreground">{funcionario.chave_pix || "-"}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Outros Dados */}
          {(isSuperAdmin || hasPermission('func.aba.outros')) && (
            <Card>
              <CardHeader>
                <CardTitle>Outros Dados</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Telefone de Emergência</label>
                  <p className="text-foreground">{funcionario.telefone_emergencia || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Nome do Contato de Emergência</label>
                  <p className="text-foreground">{funcionario.nome_contato_emergencia || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Tipo Sanguíneo</label>
                  <p className="text-foreground">{funcionario.tipo_sanguineo || "-"}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">PCD</label>
                  <Badge variant={funcionario.pcd ? "default" : "secondary"}>{funcionario.pcd ? "Sim" : "Não"}</Badge>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="ferias">
          <FeriasManager funcionarioId={funcionario?.id} empresaId={funcionario?.empresa_id} />
        </TabsContent>

        <TabsContent value="alteracoes" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Alterações Funcionais</h2>
            <div className="flex space-x-2">
              <Dialog open={cargosManagerOpen} onOpenChange={setCargosManagerOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Settings className="h-4 w-4 mr-2" />
                    Gerenciar Cargos
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Gerenciar Cargos</DialogTitle>
                  </DialogHeader>
                  <CargosManager
                    currentEmpresa={currentEmpresa}
                    onCargoUpdated={() => {
                      loadCargos();
                    }}
                  />
                </DialogContent>
              </Dialog>
              <Dialog open={transferenciaDialogOpen} onOpenChange={setTransferenciaDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <User className="h-4 w-4 mr-2" />
                    Transferência Empresa
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Transferir Funcionário para Outra Empresa</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="empresa_destino">Empresa de Destino</Label>
                      <Select value={empresaSelecionada} onValueChange={setEmpresaSelecionada}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione a empresa" />
                        </SelectTrigger>
                        <SelectContent>
                          {empresasDisponiveis.map((empresa) => (
                            <SelectItem key={empresa.id} value={empresa.id}>
                              {empresa.fantasia}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button variant="outline" onClick={() => setTransferenciaDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button disabled={!empresaSelecionada}>Salvar</Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar Transferência</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja realizar essa transferência? Esta ação irá mover o funcionário para a
                            empresa selecionada.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Não</AlertDialogCancel>
                          <AlertDialogAction onClick={handleTransferenciaEmpresa}>Sim</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </DialogContent>
              </Dialog>
              <Dialog
                open={alteracaoDialogOpen}
                onOpenChange={(open) => {
                  setAlteracaoDialogOpen(open);
                  if (!open) resetAlteracaoForm();
                }}
              >
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Alteração
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>
                      {editingAlteracao ? "Editar Alteração Funcional" : "Adicionar Alteração Funcional"}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Primeira coluna: Data da Alteração e Motivo */}
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="data_alteracao">Data da Alteração</Label>
                        <Input
                          id="data_alteracao"
                          type="date"
                          value={alteracaoFormData.data_alteracao}
                          onChange={(e) =>
                            setAlteracaoFormData((prev) => ({ ...prev, data_alteracao: e.target.value }))
                          }
                          required
                        />
                      </div>
                      <div>
                        <Label htmlFor="motivo">Motivo</Label>
                        <Select
                          value={alteracaoFormData.motivo}
                          onValueChange={(value: "Promocao" | "AlteracaoSalarial" | "TransferenciaEmpresa") =>
                            setAlteracaoFormData((prev) => ({ ...prev, motivo: value }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o motivo" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Promocao">Promoção</SelectItem>
                            <SelectItem value="AlteracaoSalarial">Alteração Salarial</SelectItem>
                            <SelectItem value="TransferenciaEmpresa">Transferência Empresa</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {/* Segunda coluna: Cargo Anterior e Salário Anterior */}
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="cargo_anterior">Cargo Anterior</Label>
                        <Select
                          value={cargos.find((c) => c.nome === alteracaoFormData.cargo_anterior)?.id || ""}
                          onValueChange={handleCargoAnteriorSelect}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o cargo anterior" />
                          </SelectTrigger>
                          <SelectContent>
                            {cargos.map((cargo) => (
                              <SelectItem key={cargo.id} value={cargo.id}>
                                {cargo.nome} - {formatCurrency(cargo.salario)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="salario_anterior">Salário Anterior</Label>
                        <Input
                          id="salario_anterior"
                          type="number"
                          step="0.01"
                          value={alteracaoFormData.salario_anterior}
                          onChange={(e) =>
                            setAlteracaoFormData((prev) => ({ ...prev, salario_anterior: Number(e.target.value) }))
                          }
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    {/* Terceira coluna: Novo Cargo e Novo Salário */}
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="novo_cargo">Novo Cargo</Label>
                        <Select onValueChange={handleCargoSelect}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um cargo" />
                          </SelectTrigger>
                          <SelectContent>
                            {cargos.map((cargo) => (
                              <SelectItem key={cargo.id} value={cargo.id}>
                                {cargo.nome} - {formatCurrency(cargo.salario)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="novo_salario">Novo Salário</Label>
                        <Input
                          id="novo_salario"
                          type="number"
                          step="0.01"
                          value={alteracaoFormData.novo_salario}
                          onChange={(e) =>
                            setAlteracaoFormData((prev) => ({ ...prev, novo_salario: Number(e.target.value) }))
                          }
                          placeholder="0.00"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  {/* Campo de Observações */}
                  <div className="mt-4">
                    <Label htmlFor="observacoes_alteracao">Observações</Label>
                    <Textarea
                      id="observacoes_alteracao"
                      value={alteracaoFormData.observacoes}
                      onChange={(e) => setAlteracaoFormData((prev) => ({ ...prev, observacoes: e.target.value }))}
                      placeholder="Observações sobre a alteração..."
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end space-x-2 mt-4">
                    <Button variant="outline" onClick={() => setAlteracaoDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleSaveAlteracao}>
                      {editingAlteracao ? "Salvar Alterações" : "Adicionar Alteração"}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="space-y-4">
            {alteracoesLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Carregando alterações salariais...</p>
              </div>
            ) : alteracoesSalariais.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <TrendingUp className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Nenhuma alteração salarial cadastrada para este funcionário.</p>
                </CardContent>
              </Card>
            ) : (
              alteracoesSalariais.map((alteracao) => (
                <Card key={alteracao.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <CardTitle className="text-lg">
                          {alteracao.motivo === "Promocao"
                            ? "Promoção"
                            : alteracao.motivo === "TransferenciaEmpresa"
                              ? "Transferência Empresa"
                              : "Alteração Salarial"}
                        </CardTitle>
                        <Badge variant={alteracao.motivo === "Promocao" ? "default" : "secondary"}>
                          {formatDate(alteracao.data_alteracao)}
                        </Badge>
                      </div>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleEditAlteracao(alteracao)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleObservacaoAlteracaoClick(alteracao)}
                          disabled={!alteracao.observacoes}
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir este registro de alteração salarial? Esta ação não pode
                                ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteAlteracao(alteracao.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-6">
                      {/* Primeira coluna: Data da Alteração e Motivo */}
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Data da Alteração</label>
                          <p className="text-foreground">{formatDate(alteracao.data_alteracao)}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Motivo</label>
                          <p className="text-foreground">
                            {alteracao.motivo === "Promocao"
                              ? "Promoção"
                              : alteracao.motivo === "TransferenciaEmpresa"
                                ? "Transferência Empresa"
                                : "Alteração Salarial"}
                          </p>
                        </div>
                      </div>

                      {/* Segunda coluna: Cargo Anterior e Salário Anterior */}
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Cargo Anterior</label>
                          <p className="text-foreground">{alteracao.cargo_anterior || "-"}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Salário Anterior</label>
                          <p className="text-foreground">{formatCurrency(alteracao.salario_anterior)}</p>
                        </div>
                      </div>

                      {/* Terceira coluna: Novo Cargo e Novo Salário */}
                      <div className="space-y-4">
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Novo Cargo</label>
                          <p className="text-foreground">{alteracao.novo_cargo || "-"}</p>
                        </div>
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">Novo Salário</label>
                          <p className="text-foreground font-semibold text-green-600">
                            {formatCurrency(alteracao.novo_salario)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="treinamentos" className="space-y-6">
          <TreinamentosFuncionarioManager 
            funcionarioId={funcionario?.id} 
            empresaId={funcionario?.empresa_id} 
            cargoAtual={funcionario?.cargo_atual || undefined}
          />
        </TabsContent>

        <TabsContent value="ausencias" className="space-y-6">
          <AusenciasManager funcionarioId={id} empresaId={funcionario?.empresa_id} />
        </TabsContent>

        <TabsContent value="ocorrencias" className="space-y-6">
          <OcorrenciasManager funcionarioId={id} empresaId={funcionario?.empresa_id} />
        </TabsContent>

        <TabsContent value="advertencias" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Advertências</h2>
            <Dialog
              open={advertenciaDialogOpen}
              onOpenChange={(open) => {
                setAdvertenciaDialogOpen(open);
                if (!open) resetAdvertenciaForm();
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Advertência
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingAdvertencia ? "Editar Advertência" : "Adicionar Advertência"}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="data_ocorrencia">Data da Ocorrência</Label>
                    <Input
                      id="data_ocorrencia"
                      type="date"
                      value={advertenciaFormData.data_ocorrencia}
                      onChange={(e) => setAdvertenciaFormData((prev) => ({ ...prev, data_ocorrencia: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="tipo_ocorrencia">Tipo de Ocorrência</Label>
                    <Select
                      value={advertenciaFormData.tipo_ocorrencia}
                      onValueChange={(value) => setAdvertenciaFormData((prev) => ({ ...prev, tipo_ocorrencia: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Advertencia">Advertência</SelectItem>
                        <SelectItem value="Suspensao">Suspensão</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="dias_penalidade">Dias de Penalidade</Label>
                    <Input
                      id="dias_penalidade"
                      type="number"
                      min="0"
                      value={advertenciaFormData.dias_penalidade}
                      onChange={(e) =>
                        setAdvertenciaFormData((prev) => ({ ...prev, dias_penalidade: parseInt(e.target.value) || 0 }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="motivo_penalidade">Motivo da Penalidade</Label>
                    <Input
                      id="motivo_penalidade"
                      value={advertenciaFormData.motivo_penalidade}
                      onChange={(e) =>
                        setAdvertenciaFormData((prev) => ({ ...prev, motivo_penalidade: e.target.value }))
                      }
                      placeholder="Motivo da advertência/suspensão"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="observacoes_advertencia">Observações</Label>
                    <Textarea
                      id="observacoes_advertencia"
                      value={advertenciaFormData.observacoes}
                      onChange={(e) => setAdvertenciaFormData((prev) => ({ ...prev, observacoes: e.target.value }))}
                      placeholder="Observações sobre a advertência..."
                      rows={3}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 mt-4">
                  <Button variant="outline" onClick={() => setAdvertenciaDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveAdvertencia}>
                    {editingAdvertencia ? "Salvar Alterações" : "Adicionar Advertência"}
                  </Button>
                </div>

                {editingAdvertencia && funcionario && (
                  <AuditLogFooter
                    tabela="advertencias"
                    registroId={editingAdvertencia.id}
                    updatedAt={editingAdvertencia.updated_at}
                    empresaId={funcionario.empresa_id}
                  />
                )}
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {advertenciasLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Carregando advertências...</p>
              </div>
            ) : advertencias.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Nenhuma advertência cadastrada para este funcionário.</p>
                </CardContent>
              </Card>
            ) : (
              advertencias.map((advertencia) => (
                <Card key={advertencia.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{advertencia.tipo_ocorrencia}</CardTitle>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleEditAdvertencia(advertencia)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir este registro de advertência? Esta ação não pode ser
                                desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteAdvertencia(advertencia.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Data da Ocorrência</label>
                        <p className="text-foreground">{formatDate(advertencia.data_ocorrencia)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Dias de Penalidade</label>
                        <p className="text-foreground">{advertencia.dias_penalidade || "-"}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Motivo</label>
                        <p className="text-foreground">{advertencia.motivo_penalidade}</p>
                      </div>
                      {advertencia.observacoes && (
                        <div className="md:col-span-2 lg:col-span-3">
                          <label className="text-sm font-medium text-muted-foreground">Observações</label>
                          <p className="text-foreground">{advertencia.observacoes}</p>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="demissoes" className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">Demissões</h2>
            <Dialog
              open={demissaoDialogOpen}
              onOpenChange={(open) => {
                setDemissaoDialogOpen(open);
                if (!open) resetDemissaoForm();
              }}
            >
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Demissão
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingDemissao ? "Editar Demissão" : "Adicionar Demissão"}</DialogTitle>
                </DialogHeader>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="data_demissao">Data de Demissão</Label>
                    <Input
                      id="data_demissao"
                      type="date"
                      value={demissaoFormData.data_demissao}
                      onChange={(e) => setDemissaoFormData((prev) => ({ ...prev, data_demissao: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="motivo_desligamento">Motivo do Desligamento</Label>
                    <Input
                      id="motivo_desligamento"
                      value={demissaoFormData.motivo_desligamento}
                      onChange={(e) =>
                        setDemissaoFormData((prev) => ({ ...prev, motivo_desligamento: e.target.value }))
                      }
                      placeholder="Ex: Demissão sem justa causa, Pedido de demissão, etc."
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="observacoes_demissao">Observações</Label>
                    <Textarea
                      id="observacoes_demissao"
                      value={demissaoFormData.observacoes}
                      onChange={(e) => setDemissaoFormData((prev) => ({ ...prev, observacoes: e.target.value }))}
                      placeholder="Observações sobre a demissão..."
                      rows={3}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Documento da Demissão</Label>
                    <DocumentUpload
                      funcionarioId={funcionario?.id}
                      empresaId={funcionario?.empresa_id}
                      onDocumentUploaded={handleDocumentUpload}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2 mt-4">
                  <Button variant="outline" onClick={() => setDemissaoDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveDemissao}>
                    {editingDemissao ? "Salvar Alterações" : "Adicionar Demissão"}
                  </Button>
                </div>

                {editingDemissao && funcionario && (
                  <AuditLogFooter
                    tabela="demissoes"
                    registroId={editingDemissao.id}
                    updatedAt={editingDemissao.updated_at}
                    empresaId={funcionario.empresa_id}
                  />
                )}
              </DialogContent>
            </Dialog>
          </div>

          <div className="space-y-4">
            {demissoesLoading ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Carregando demissões...</p>
              </div>
            ) : demissoes.length === 0 ? (
              <Card>
                <CardContent className="text-center py-8">
                  <UserMinus className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Nenhuma demissão cadastrada para este funcionário.</p>
                </CardContent>
              </Card>
            ) : (
              demissoes.map((demissao) => (
                <Card key={demissao.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">Demissão</CardTitle>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline" onClick={() => handleEditDemissao(demissao)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button size="sm" variant="outline">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir este registro de demissão? Esta ação não pode ser
                                desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleDeleteDemissao(demissao.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Data de Demissão</label>
                        <p className="text-foreground">{formatDate(demissao.data_demissao)}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">Motivo do Desligamento</label>
                        <p className="text-foreground">{demissao.motivo_desligamento}</p>
                      </div>
                      {demissao.observacoes && (
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium text-muted-foreground">Observações</label>
                          <p className="text-foreground">{demissao.observacoes}</p>
                        </div>
                      )}
                      {demissao.documento_url && (
                        <div className="md:col-span-2">
                          <label className="text-sm font-medium text-muted-foreground">Documento</label>
                          <div className="mt-1">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => window.open(demissao.documento_url, "_blank")}
                            >
                              <FileText className="h-4 w-4 mr-2" />
                              Visualizar Documento
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="exames">
          <ASOsManager 
            funcionarioId={funcionario?.id} 
            empresaId={funcionario?.empresa_id} 
            cargoAtual={funcionario?.cargo_atual || undefined}
          />
        </TabsContent>

        <TabsContent value="acesso" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Acesso ao Sistema
                </CardTitle>
                {!userAccess && (
                  <Dialog open={accessDialogOpen} onOpenChange={setAccessDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={resetAccessForm}>
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Acesso
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                      <DialogHeader>
                        <DialogTitle>Criar Acesso ao Sistema</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="access-nome">Nome do Funcionário</Label>
                          <Input
                            id="access-nome"
                            value={accessFormData.nome}
                            disabled
                            className="bg-muted"
                          />
                        </div>
                        <div>
                          <Label htmlFor="access-email">Email</Label>
                          <Input
                            id="access-email"
                            type="email"
                            value={accessFormData.email}
                            onChange={(e) => setAccessFormData((prev) => ({ ...prev, email: e.target.value }))}
                            placeholder="email@empresa.com"
                          />
                        </div>
                        
                        <Separator />
                        
                        <div>
                          <Label className="text-base font-semibold">Empresas e Perfis de Acesso</Label>
                          <p className="text-sm text-muted-foreground mb-3">Selecione as empresas e defina o perfil de acesso para cada uma.</p>
                          <div className="space-y-3 max-h-60 overflow-y-auto border rounded-md p-3">
                            {empresasAcessoForm.map((empresa, index) => (
                              <div key={empresa.empresa_id} className="flex items-center gap-3 p-2 border rounded-md">
                                <Checkbox
                                  checked={empresa.selecionada}
                                  onCheckedChange={(checked) => {
                                    const updated = [...empresasAcessoForm];
                                    updated[index].selecionada = !!checked;
                                    if (!checked) updated[index].perfil_id = "";
                                    setEmpresasAcessoForm(updated);
                                  }}
                                />
                                <span className="flex-1 text-sm font-medium">{empresa.empresa_nome}</span>
                                {empresa.selecionada && (
                                  <Select
                                    value={empresa.perfil_id}
                                    onValueChange={(value) => {
                                      const updated = [...empresasAcessoForm];
                                      updated[index].perfil_id = value;
                                      setEmpresasAcessoForm(updated);
                                    }}
                                  >
                                    <SelectTrigger className="w-48">
                                      <SelectValue placeholder="Selecione o perfil" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {perfisGrupo.map((perfil) => (
                                        <SelectItem key={perfil.id} value={perfil.id}>
                                          {perfil.nome}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                        
                        <Separator />
                        <div>
                          <Label htmlFor="access-password">Senha</Label>
                          <Input
                            id="access-password"
                            type="password"
                            value={accessFormData.password}
                            onChange={(e) => setAccessFormData((prev) => ({ ...prev, password: e.target.value }))}
                            placeholder="Senha (mínimo 6 caracteres)"
                          />
                        </div>
                        <div>
                          <Label htmlFor="access-confirm-password">Confirmar Senha</Label>
                          <Input
                            id="access-confirm-password"
                            type="password"
                            value={accessFormData.confirmPassword}
                            onChange={(e) =>
                              setAccessFormData((prev) => ({ ...prev, confirmPassword: e.target.value }))
                            }
                            placeholder="Confirme a senha"
                          />
                        </div>
                        <div className="flex justify-end space-x-2">
                          <Button variant="outline" onClick={() => setAccessDialogOpen(false)}>
                            Cancelar
                          </Button>
                          <Button onClick={handleCreateUserAccess}>Criar Usuário</Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {accessLoading ? (
                <div className="text-center py-8">
                  <div className="text-muted-foreground">Carregando informações de acesso...</div>
                </div>
              ) : userAccess ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Nome</label>
                      <p className="text-foreground">{userAccess.nome}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Email</label>
                      <p className="text-foreground">{userAccess.email}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Data de Criação</label>
                      <p className="text-foreground">{formatDate(userAccess.created_at)}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Último Login</label>
                      <p className="text-foreground">
                        {userAccess.last_sign_in_at ? formatDate(userAccess.last_sign_in_at) : "Nunca fez login"}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Seção de Empresas Vinculadas */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-lg">Empresas Vinculadas</h4>
                        <p className="text-sm text-muted-foreground">Gerencie o acesso do usuário às empresas do grupo</p>
                      </div>
                      <Dialog open={addEmpresaDialogOpen} onOpenChange={setAddEmpresaDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" onClick={() => { setNewEmpresaId(""); setNewEmpresaPerfilId(""); }}>
                            <Plus className="h-4 w-4 mr-2" />
                            Adicionar Empresa
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Adicionar Acesso a Empresa</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Empresa</Label>
                              <Select value={newEmpresaId} onValueChange={setNewEmpresaId}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione a empresa" />
                                </SelectTrigger>
                                <SelectContent>
                                  {empresasGrupo
                                    .filter(e => !userAccess.empresas?.some(ue => ue.id === e.id))
                                    .map(empresa => (
                                      <SelectItem key={empresa.id} value={empresa.id}>
                                        {empresa.fantasia}
                                      </SelectItem>
                                    ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Perfil de Acesso</Label>
                              <Select value={newEmpresaPerfilId} onValueChange={setNewEmpresaPerfilId}>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione o perfil" />
                                </SelectTrigger>
                                <SelectContent>
                                  {perfisGrupo.map(perfil => (
                                    <SelectItem key={perfil.id} value={perfil.id}>
                                      {perfil.nome}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button variant="outline" onClick={() => setAddEmpresaDialogOpen(false)}>
                                Cancelar
                              </Button>
                              <Button onClick={handleAddEmpresaAccess}>Adicionar</Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>

                    {userAccess.empresas && userAccess.empresas.length > 0 ? (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Empresa</TableHead>
                            <TableHead>Perfil de Acesso</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {userAccess.empresas.map((empresa) => (
                            <TableRow key={empresa.id}>
                              <TableCell className="font-medium">{empresa.fantasia}</TableCell>
                              <TableCell>
                                <Badge variant="secondary">{empresa.perfil_nome || "Sem perfil"}</Badge>
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedEmpresaForEdit(empresa);
                                      setSelectedPerfilForEdit(empresa.perfil_id || "");
                                      setEditPerfilEmpresaDialogOpen(true);
                                    }}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  {userAccess.empresas.length > 1 && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="sm">
                                          <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Remover Acesso</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            Tem certeza que deseja remover o acesso à empresa "{empresa.fantasia}"?
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleRemoveEmpresaAccess(empresa.id)}
                                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                          >
                                            Remover
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        Nenhuma empresa vinculada encontrada.
                      </div>
                    )}
                  </div>

                  <Separator />

                  <div className="flex flex-wrap justify-between items-center gap-2">
                    <div>
                      <h4 className="font-medium">Gerenciar Acesso</h4>
                      <p className="text-sm text-muted-foreground">Este funcionário possui acesso ao sistema</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setResetPasswordDialogOpen(true)}>
                        Redefinir Senha
                      </Button>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="destructive" size="sm">
                            <Trash2 className="h-4 w-4 mr-2" />
                            Revogar Acesso
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar Revogação</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja revogar o acesso ao sistema para este funcionário? Esta ação não pode
                              ser desfeita e o usuário será removido permanentemente.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleRevokeAccess}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Revogar Acesso
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <User className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">Sem Acesso ao Sistema</h3>
                  <p className="text-muted-foreground mb-4">Este funcionário ainda não possui acesso ao sistema.</p>
                  <Dialog open={accessDialogOpen} onOpenChange={setAccessDialogOpen}>
                    <DialogTrigger asChild>
                      <Button onClick={resetAccessForm}>
                        <Plus className="h-4 w-4 mr-2" />
                        Criar Acesso
                      </Button>
                    </DialogTrigger>
                  </Dialog>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dialog para Editar Perfil de Empresa */}
          <Dialog open={editPerfilEmpresaDialogOpen} onOpenChange={setEditPerfilEmpresaDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Alterar Perfil de Acesso</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Empresa</Label>
                  <Input value={selectedEmpresaForEdit?.fantasia || ""} disabled className="bg-muted" />
                </div>
                <div>
                  <Label>Perfil de Acesso</Label>
                  <Select value={selectedPerfilForEdit} onValueChange={setSelectedPerfilForEdit}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      {perfisGrupo.map(perfil => (
                        <SelectItem key={perfil.id} value={perfil.id}>
                          {perfil.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setEditPerfilEmpresaDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleUpdatePerfilEmpresa}>Salvar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Dialog para Editar Role (legado) */}
          <Dialog open={editRoleDialogOpen} onOpenChange={setEditRoleDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Alterar Perfil de Acesso</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Perfil de Acesso</Label>
                  <Select value={selectedRole} onValueChange={(value: UserRole) => setSelectedRole(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o perfil" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="hr_manager">Gestor de RH</SelectItem>
                      <SelectItem value="employee">Funcionário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setEditRoleDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleUpdateRole}>Salvar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Dialog para Redefinir Senha */}
          <Dialog open={resetPasswordDialogOpen} onOpenChange={setResetPasswordDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Redefinir Senha</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Nova Senha</Label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nova senha (mínimo 6 caracteres)"
                  />
                </div>
                <div>
                  <Label>Confirmar Nova Senha</Label>
                  <Input
                    type="password"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    placeholder="Confirme a nova senha"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button variant="outline" onClick={() => setResetPasswordDialogOpen(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleResetPassword}>Redefinir</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
      )}

      {/* Dialog para Observações de Alterações */}
      <Dialog open={observacaoAlteracaoDialogOpen} onOpenChange={setObservacaoAlteracaoDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Observações da Alteração</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={observacaoAlteracaoAtual}
              onChange={(e) => setObservacaoAlteracaoAtual(e.target.value)}
              placeholder="Digite as observações..."
              rows={4}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setObservacaoAlteracaoDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveObservacaoAlteracao}>Salvar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Rodapé de Auditoria */}
      {funcionario && (
        <AuditLogFooter 
          tabela="funcionarios" 
          registroId={funcionario.id} 
          updatedAt={funcionario.updated_at}
          empresaId={funcionario.empresa_id}
        />
      )}
    </div>
  );
}
