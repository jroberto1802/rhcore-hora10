import { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { AppSidebar } from '@/components/AppSidebar';
import { Header } from '@/components/Header';
import { SidebarProvider } from '@/components/ui/sidebar';
import Login from './Login';
import EmpresaSelection from './EmpresaSelection';
import Dashboard from './Dashboard';
import { Funcionarios } from './Funcionarios';
import { FuncionarioDetalhes } from './FuncionarioDetalhes';
import { FuncionarioCadastro } from './FuncionarioCadastro';
import { FuncionarioEdicao } from './FuncionarioEdicao';
import { Cargos } from './Cargos';
import { Configuracoes } from './Configuracoes';
import { Relatorios } from './Relatorios';
import { GestaoFerias } from './GestaoFerias';
import { Aniversariantes } from './Aniversariantes';
import { GestaoDocumentalPessoas } from './relatorios/GestaoDocumentalPessoas';
import { GestaoAbsenteismo } from './relatorios/GestaoAbsenteismo';
import { GestaoExames } from './relatorios/GestaoExames';
import { GestaoTreinamentos } from './relatorios/GestaoTreinamentos';
import { GestaoTurnover } from './relatorios/GestaoTurnover';
import ProcessosSeletivos from './ProcessosSeletivos';
import ProcessoSeletivoDetalhes from './ProcessoSeletivoDetalhes';
import BancoTalentos from './BancoTalentos';
import CandidatoDetalhes from './CandidatoDetalhes';
import GerenciarPermissoes from './GerenciarPermissoes';
import { OcorrenciasGerais } from './OcorrenciasGerais';
import { type Empresa } from '@/hooks/useUserEmpresas';

const Index = () => {
  const { user, loading } = useAuth();
  const [selectedEmpresa, setSelectedEmpresa] = useState<Empresa | null>(null);
  const [showEmpresaSelection, setShowEmpresaSelection] = useState(false);
  const [isGroupView, setIsGroupView] = useState(false);
  const [currentGroupId, setCurrentGroupId] = useState<string | null>(null);
  const [currentGroupName, setCurrentGroupName] = useState<string | null>(null);

  const handleEmpresaSelect = (empresa: Empresa) => {
    setSelectedEmpresa(empresa);
    setIsGroupView(false);
    setCurrentGroupId(null);
    setCurrentGroupName(null);
    setShowEmpresaSelection(false);
  };

  const handleGroupSelect = (groupId: string, groupName: string) => {
    setIsGroupView(true);
    setCurrentGroupId(groupId);
    setCurrentGroupName(groupName);
    setSelectedEmpresa(null);
    setShowEmpresaSelection(false);
  };

  const handleEmpresaChange = (empresa: Empresa) => {
    setSelectedEmpresa(empresa);
    setIsGroupView(false);
    setCurrentGroupId(null);
    setCurrentGroupName(null);
  };

  const handleGroupSelectFromSidebar = (groupId: string, groupName: string) => {
    setIsGroupView(true);
    setCurrentGroupId(groupId);
    setCurrentGroupName(groupName);
    setSelectedEmpresa(null);
  };

  const getPageTitle = () => {
    const path = window.location.pathname;
    switch (path) {
      case '/dashboard':
        return 'Dashboard';
      case '/funcionarios':
        return 'Funcionários';
      case '/cargos':
        return 'Gerenciamento de Cargos';
      case '/relatorios':
        return 'Relatórios';
      case '/relatorios/ferias':
        return 'Gestão de Férias';
      case '/relatorios/aniversariantes':
        return 'Aniversariantes';
      case '/processos-seletivos':
        return 'Processos Seletivos';
      case '/banco-talentos':
        return 'Banco de Talentos';
      case '/ocorrencias-gerais':
        return 'Ocorrências Gerais';
      case '/configuracoes':
        return 'Configurações';
      case '/configuracoes/permissoes':
        return 'Gerenciar Permissões';
      default:
        return 'RHCore';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  if (showEmpresaSelection || (!selectedEmpresa && !isGroupView)) {
    return <EmpresaSelection onEmpresaSelect={handleEmpresaSelect} onGroupSelect={handleGroupSelect} />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar
          currentEmpresa={selectedEmpresa}
          onEmpresaChange={handleEmpresaChange}
          onGroupSelect={handleGroupSelectFromSidebar}
          isGroupView={isGroupView}
          currentGroupId={currentGroupId}
          currentGroupName={currentGroupName}
        />
        <div className="flex-1 flex flex-col">
          <Header
            title={getPageTitle()}
            currentEmpresa={selectedEmpresa}
            isGroupView={isGroupView}
            currentGroupName={currentGroupName}
          />
          <main className="flex-1 p-6 bg-background">
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route
                path="/dashboard"
                element={
                  <Dashboard
                    currentEmpresa={selectedEmpresa}
                    isGroupView={isGroupView}
                    currentGroupId={currentGroupId}
                  />
                }
              />
              <Route
                path="/funcionarios"
                element={
                  <Funcionarios
                    currentEmpresa={selectedEmpresa}
                    isGroupView={isGroupView}
                    currentGroupId={currentGroupId}
                  />
                }
              />
              <Route
                path="/funcionarios/novo"
                element={
                  <FuncionarioCadastro
                    currentEmpresa={selectedEmpresa}
                    isGroupView={isGroupView}
                    currentGroupId={currentGroupId}
                  />
                }
              />
              <Route
                path="/funcionarios/:id/editar"
                element={
                  <FuncionarioEdicao
                    currentEmpresa={selectedEmpresa}
                    isGroupView={isGroupView}
                    currentGroupId={currentGroupId}
                  />
                }
              />
              <Route path="/funcionarios/:id" element={<FuncionarioDetalhes />} />
              <Route
                path="/cargos"
                element={<Cargos currentEmpresa={selectedEmpresa} />}
              />
              <Route
                path="/relatorios"
                element={
                  <Relatorios
                    currentEmpresa={selectedEmpresa}
                    isGroupView={isGroupView}
                    currentGroupId={currentGroupId}
                  />
                }
              />
              <Route
                path="/relatorios/ferias"
                element={
                  <GestaoFerias
                    currentEmpresa={selectedEmpresa}
                    isGroupView={isGroupView}
                    currentGroupId={currentGroupId}
                  />
                }
              />
              <Route
                path="/relatorios/aniversariantes"
                element={
                  <Aniversariantes
                    currentEmpresa={selectedEmpresa}
                    isGroupView={isGroupView}
                    currentGroupId={currentGroupId}
                  />
                }
              />
              <Route
                path="/relatorios/exames"
                element={
                  <GestaoExames
                    currentEmpresa={selectedEmpresa}
                    isGroupView={isGroupView}
                    currentGroupId={currentGroupId}
                  />
                }
              />
              <Route
                path="/relatorios/absenteismo"
                element={
                  <GestaoAbsenteismo
                    currentEmpresa={selectedEmpresa}
                    isGroupView={isGroupView}
                    currentGroupId={currentGroupId}
                  />
                }
              />
              <Route
                path="/relatorios/treinamentos"
                element={
                  <GestaoTreinamentos
                    currentEmpresa={selectedEmpresa}
                    isGroupView={isGroupView}
                    currentGroupId={currentGroupId}
                  />
                }
              />
              <Route
                path="/relatorios/turnover"
                element={
                  <GestaoTurnover
                    currentEmpresa={selectedEmpresa}
                    isGroupView={isGroupView}
                    currentGroupId={currentGroupId}
                  />
                }
              />
              <Route
                path="/relatorios/gestao-documental-pessoas"
                element={
                  <GestaoDocumentalPessoas
                    currentEmpresa={selectedEmpresa}
                    isGroupView={isGroupView}
                    currentGroupId={currentGroupId}
                  />
                }
              />
              <Route
                path="/processos-seletivos"
                element={
                  <ProcessosSeletivos
                    currentEmpresa={selectedEmpresa}
                    isGroupView={isGroupView}
                    currentGroupId={currentGroupId}
                  />
                }
              />
              <Route
                path="/processos-seletivos/:id"
                element={<ProcessoSeletivoDetalhes />}
              />
              <Route
                path="/banco-talentos"
                element={
                  <BancoTalentos
                    currentEmpresa={selectedEmpresa}
                    isGroupView={isGroupView}
                    currentGroupId={currentGroupId}
                  />
                }
              />
              <Route
                path="/banco-talentos/:id"
                element={<CandidatoDetalhes />}
              />
              <Route
                path="/ocorrencias-gerais"
                element={
                  <OcorrenciasGerais
                    currentEmpresa={selectedEmpresa}
                    isGroupView={isGroupView}
                    currentGroupId={currentGroupId}
                  />
                }
              />
              <Route path="/configuracoes" element={<Configuracoes currentEmpresa={selectedEmpresa} />} />
              <Route
                path="/configuracoes/permissoes"
                element={
                  <GerenciarPermissoes
                    selectedEmpresa={selectedEmpresa}
                    isGroupView={isGroupView}
                    currentGroupId={currentGroupId}
                  />
                }
              />
            </Routes>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default Index;
