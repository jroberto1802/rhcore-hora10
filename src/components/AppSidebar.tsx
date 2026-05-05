import { useState, useMemo, useEffect } from "react";
import {
  ChevronDown,
  Building2,
  Users,
  Settings,
  LogOut,
  Home,
  FileText,
  UserCheck,
  Shield,
  Moon,
  Sun,
  Wind,
  Users2,
} from "lucide-react";
import { useTheme } from "next-themes";
import rhcoreLogo from "@/assets/rhcore-logo.png";
import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import { type Empresa } from "@/hooks/useUserEmpresas";
import { useUserEmpresas } from "@/hooks/useUserEmpresas";
import { usePermissions } from "@/hooks/usePermissions";
import { MENU_PERMISSION_MAP } from "@/lib/permissions";

interface AppSidebarProps {
  currentEmpresa: Empresa | null;
  onEmpresaChange: (empresa: Empresa) => void;
  onGroupSelect: (groupId: string, groupName: string) => void;
  isGroupView?: boolean;
  currentGroupId?: string | null;
  currentGroupName?: string | null;
}

// Definição dos itens do menu com permissões
const menuItemsConfig = [
  { title: "Dashboard", url: "/dashboard", icon: Home, permissions: [] },
  {
    title: "Funcionários",
    icon: Users,
    permissions: ["menu.funcionarios", "menu.cargos"],
    submenu: [
      { title: "Lista de Funcionários", url: "/funcionarios", permissions: ["menu.funcionarios"] },
      { title: "Gerenciamento de Cargos", url: "/cargos", permissions: ["menu.cargos"] },
    ],
  },
  {
    title: "Recrutamento",
    icon: UserCheck,
    permissions: ["menu.recrutamento"],
    submenu: [
      { title: "Processos Seletivos", url: "/processos-seletivos", permissions: ["menu.recrutamento", "menu.processos_seletivos"] },
      { title: "Banco de Talentos", url: "/banco-talentos", permissions: ["menu.recrutamento", "menu.banco_talentos"] },
    ],
  },
  {
    title: "Relatórios",
    icon: FileText,
    permissions: [
      "rel.gestao_funcionarios", "rel.gestao_ferias", "rel.gestao_exames",
      "rel.gestao_treinamentos", "rel.aniversariantes", "rel.gestao_absenteismo",
      "rel.gestao_turnover", "rel.gestao_documental_pessoas"
    ],
    submenu: [
      {
        title: "Funcionários",
        icon: Users,
        permissions: [
          "rel.gestao_funcionarios", "rel.gestao_ferias", "rel.gestao_exames",
          "rel.gestao_treinamentos", "rel.aniversariantes", "rel.gestao_absenteismo",
          "rel.gestao_turnover", "rel.gestao_documental_pessoas"
        ],
        subsections: [
          { title: "Gestão de Funcionários", url: "/relatorios", permissions: ["rel.gestao_funcionarios"] },
          { title: "Gestão de Férias", url: "/relatorios/ferias", permissions: ["rel.gestao_ferias"] },
          { title: "Gestão de Exames", url: "/relatorios/exames", permissions: ["rel.gestao_exames"] },
          { title: "Gestão de Treinamentos", url: "/relatorios/treinamentos", permissions: ["rel.gestao_treinamentos"] },
          { title: "Gestão de Turnover", url: "/relatorios/turnover", permissions: ["rel.gestao_turnover"] },
          { title: "Aniversariantes", url: "/relatorios/aniversariantes", permissions: ["rel.aniversariantes"] },
          { title: "Gestão de Absenteísmo", url: "/relatorios/absenteismo", permissions: ["rel.gestao_absenteismo"] },
          { title: "Gestão Documental", url: "/relatorios/gestao-documental-pessoas", permissions: ["rel.gestao_documental_pessoas"] },
        ],
      },
    ],
  },
  {
    title: "Clima Organizacional",
    icon: Wind,
    permissions: ["menu.clima"],
    submenu: [
      { title: "Pesquisas", url: "/clima/pesquisas", permissions: ["menu.clima"] },
    ],
  },
  {
    title: "Ciclo de Gente",
    icon: Users2,
    permissions: ["menu.ciclo_gente"],
    submenu: [
      { title: "Ciclos", url: "/ciclo-gente", permissions: ["menu.ciclo_gente"] },
    ],
  },
  { title: "Ocorrências", url: "/ocorrencias-gerais", icon: FileText, permissions: ["menu.ocorrencias_gerais"] },
  { title: "Configurações", url: "/configuracoes", icon: Settings, permissions: ["menu.configuracoes"] },
  { title: "Permissões", url: "/configuracoes/permissoes", icon: Shield, permissions: ["menu.permissoes"] },
];

export function AppSidebar({
  currentEmpresa,
  onEmpresaChange,
  onGroupSelect,
  isGroupView,
  currentGroupId,
  currentGroupName,
}: AppSidebarProps) {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { signOut } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  const { empresas } = useUserEmpresas();
  const location = useLocation();
  const currentPath = location.pathname;
  
  // Hook de permissões - usar a primeira empresa do grupo se estiver em visualização de grupo
  const empresaIdForPermissions = currentEmpresa?.id || 
    (isGroupView && currentGroupId ? empresas.find(e => e.grupo_empresarial.id === currentGroupId)?.id : undefined);
  
  const { hasPermission, hasAnyPermission, isSuperAdmin, isLoading: permissionsLoading } = usePermissions(
    empresaIdForPermissions
  );

  // Estado para controlar submenu colapsável
  const [submenuOpen, setSubmenuOpen] = useState<{ [key: string]: boolean }>({
    Funcionários: false,
    Recrutamento: false,
    Relatórios: false,
    "Clima Organizacional": false,
    "Ciclo de Gente": false,
  });

  const [subsectionOpen, setSubsectionOpen] = useState<{ [key: string]: boolean }>({
    "Relatórios-Funcionários": false,
  });

  // Filtrar itens do menu baseado em permissões
  const filteredMenuItems = useMemo(() => {
    // Se carregando permissões, mostrar todos os itens
    if (permissionsLoading) return menuItemsConfig;
    
    // Super Admin vê tudo
    if (isSuperAdmin) return menuItemsConfig;

    return menuItemsConfig.filter((item) => {
      // Dashboard sempre visível
      if (item.permissions.length === 0) return true;
      
      // Verificar se tem alguma permissão do item
      if (!hasAnyPermission(item.permissions)) return false;

      // Se tem submenu, filtrar também
      if (item.submenu) {
        const filteredSubmenu = item.submenu.filter((subItem: any) => {
          if (subItem.permissions?.length === 0) return true;
          if (!hasAnyPermission(subItem.permissions || [])) return false;

          // Se tem subsections, filtrar também
          if (subItem.subsections) {
            const filteredSubsections = subItem.subsections.filter((subsec: any) => 
              subsec.permissions?.length === 0 || hasAnyPermission(subsec.permissions || [])
            );
            return filteredSubsections.length > 0;
          }
          return true;
        });
        return filteredSubmenu.length > 0;
      }
      return true;
    }).map((item) => {
      // Filtrar submenus e subsections
      if (item.submenu) {
        return {
          ...item,
          submenu: item.submenu.filter((subItem: any) => {
            if (subItem.permissions?.length === 0) return true;
            if (!hasAnyPermission(subItem.permissions || [])) return false;

            if (subItem.subsections) {
              const filteredSubsections = subItem.subsections.filter((subsec: any) => 
                subsec.permissions?.length === 0 || hasAnyPermission(subsec.permissions || [])
              );
              subItem.subsections = filteredSubsections;
              return filteredSubsections.length > 0;
            }
            return true;
          }).map((subItem: any) => {
            if (subItem.subsections) {
              return {
                ...subItem,
                subsections: subItem.subsections.filter((subsec: any) => 
                  subsec.permissions?.length === 0 || hasAnyPermission(subsec.permissions || [])
                )
              };
            }
            return subItem;
          })
        };
      }
      return item;
    });
  }, [permissionsLoading, isSuperAdmin, hasAnyPermission]);

  const isActive = (path: string) => currentPath === path;
  const getNavCls = ({ isActive }: { isActive: boolean }) =>
    isActive ? "bg-primary text-primary-foreground font-medium" : "hover:bg-muted/50 text-sidebar-foreground";

  // Função para alternar submenu com comportamento de accordion
  const toggleSubmenu = (itemTitle: string) => {
    setSubmenuOpen((prev) => {
      // Se o menu clicado já está aberto, apenas fecha ele
      if (prev[itemTitle]) {
        return {
          ...prev,
          [itemTitle]: false,
        };
      }

      // Senão, fecha todos os outros e abre apenas o clicado (accordion)
      const newState: { [key: string]: boolean } = {};
      Object.keys(prev).forEach((key) => {
        newState[key] = key === itemTitle;
      });
      return newState;
    });
  };

  // Função para alternar subsection com comportamento de accordion
  const toggleSubsection = (key: string) => {
    setSubsectionOpen((prev) => {
      // Se a subsection clicada já está aberta, apenas fecha ela
      if (prev[key]) {
        return {
          ...prev,
          [key]: false,
        };
      }

      // Senão, fecha todas as outras subsections do mesmo nível e abre apenas a clicada
      const newState: { [key: string]: boolean } = {};
      Object.keys(prev).forEach((k) => {
        newState[k] = k === key;
      });
      return newState;
    });
  };

  // Verifica se algum item do submenu está ativo
  const isSubmenuActive = (submenu: any[]) => {
    return submenu.some((subItem) => {
      if (subItem.url) {
        return isActive(subItem.url);
      }
      if (subItem.subsections) {
        return subItem.subsections.some((subsec: any) => isActive(subsec.url));
      }
      return false;
    });
  };

  // Gerenciar seleção de empresa ou grupo
  const handleEmpresaSelect = (empresa: Empresa) => {
    onEmpresaChange(empresa);
  };

  const handleGrupoSelect = (grupoId: string, grupoNome: string) => {
    onGroupSelect(grupoId, grupoNome);
  };

  // Agrupar empresas por grupo empresarial
  const empresasPorGrupo = empresas.reduce(
    (acc, empresa) => {
      const grupoId = empresa.grupo_empresarial.id;
      if (!acc[grupoId]) {
        acc[grupoId] = {
          grupo: empresa.grupo_empresarial,
          empresas: [],
        };
      }
      acc[grupoId].empresas.push(empresa);
      return acc;
    },
    {} as Record<
      string,
      { grupo: { id: string; nome: string; descricao: string | null; logo_url: string | null }; empresas: Empresa[] }
    >,
  );

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible="icon">
      <SidebarTrigger className="m-2 self-end" />

      <SidebarContent>
        {/* Header with Group Logo */}
        <div className="p-4">
          <div className="w-full flex items-center justify-center">
            {currentEmpresa || isGroupView ? (
              <div className="w-full flex items-center justify-center">
                {isGroupView && currentGroupId ? (
                  // Buscar logo do grupo
                  (() => {
                    const grupo = Object.values(empresasPorGrupo).find((g) => g.grupo.id === currentGroupId);
                    return grupo?.grupo.logo_url ? (
                      <img
                        src={grupo.grupo.logo_url}
                        alt={`Logo ${grupo.grupo.nome}`}
                        className="w-full h-20 object-contain"
                      />
                    ) : (
                      <Users className="h-12 w-12 text-primary" />
                    );
                  })()
                ) : currentEmpresa?.grupo_empresarial.logo_url ? (
                  <img
                    src={currentEmpresa.grupo_empresarial.logo_url}
                    alt={`Logo ${currentEmpresa.grupo_empresarial.nome}`}
                    className="w-full h-20 object-contain"
                  />
                ) : (
                  <Building2 className="h-12 w-12 text-primary" />
                )}
              </div>
            ) : (
              <div className="w-full flex items-center justify-center">
                <Building2 className="h-12 w-12 text-primary" />
              </div>
            )}
          </div>
        </div>

        {/* Current Company or Group */}
        {(currentEmpresa || isGroupView) && (
          <div className="p-4 border-b">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="w-full justify-between text-left">
                  <div className="flex items-center space-x-2 flex-1 min-w-0">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      {isGroupView ? (
                        <Users className="h-4 w-4 text-primary" />
                      ) : currentEmpresa?.logo_url ? (
                        <img
                          src={currentEmpresa.logo_url}
                          alt={`Logo ${currentEmpresa.fantasia}`}
                          className="w-5 h-5 object-contain"
                        />
                      ) : (
                        <Building2 className="h-4 w-4 text-primary" />
                      )}
                    </div>
                    {!collapsed && (
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">
                          {isGroupView ? currentGroupName : currentEmpresa?.fantasia}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {isGroupView ? "Visualização em grupo" : currentEmpresa?.grupo_empresarial.nome}
                        </p>
                      </div>
                    )}
                  </div>
                  {!collapsed && <ChevronDown className="h-4 w-4" />}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 bg-popover border border-border z-50" align="start">
                {Object.values(empresasPorGrupo).map(({ grupo, empresas: empresasDoGrupo }) => (
                  <div key={grupo.id}>
                    <DropdownMenuItem
                      onClick={() => handleGrupoSelect(grupo.id, grupo.nome)}
                      className="font-medium text-sidebar-foreground hover:bg-muted"
                    >
                      <div className="flex items-center gap-3 w-full">
                        {grupo.logo_url ? (
                          <img
                            src={grupo.logo_url}
                            alt={`Logo ${grupo.nome}`}
                            className="w-8 h-8 object-cover rounded border flex-shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 bg-muted rounded flex items-center justify-center flex-shrink-0">
                            <Users className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="font-medium truncate">{grupo.nome}</span>
                          <span className="text-xs text-muted-foreground truncate">
                            Visualização em grupo ({empresasDoGrupo.length} empresas)
                          </span>
                        </div>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />

                    {empresasDoGrupo.map((empresa) => (
                      <DropdownMenuItem
                        key={empresa.id}
                        onClick={() => handleEmpresaSelect(empresa)}
                        className={
                          currentEmpresa?.id === empresa.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                        }
                      >
                        <div className="flex items-center gap-3 w-full">
                          {empresa.logo_url ? (
                            <img
                              src={empresa.logo_url}
                              alt={`Logo ${empresa.fantasia}`}
                              className="w-8 h-8 object-cover rounded border flex-shrink-0"
                            />
                          ) : (
                            <div className="w-8 h-8 bg-muted rounded flex items-center justify-center flex-shrink-0">
                              <Building2 className="w-4 h-4 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="font-medium truncate">{empresa.fantasia}</span>
                            {empresa.razao_social && (
                              <span className="text-xs text-muted-foreground truncate">{empresa.razao_social}</span>
                            )}
                            {empresa.cnpj && (
                              <span className="text-xs text-muted-foreground truncate">CNPJ: {empresa.cnpj}</span>
                            )}
                          </div>
                        </div>
                      </DropdownMenuItem>
                    ))}

                    {Object.keys(empresasPorGrupo).length > 1 && <DropdownMenuSeparator />}
                  </div>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Main Navigation */}
        <SidebarGroup className="flex-1">
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <TooltipProvider delayDuration={300}>
              <SidebarMenu>
                {filteredMenuItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    {item.submenu ? (
                      <>
                        <SidebarMenuButton
                          onClick={() => toggleSubmenu(item.title)}
                          className={
                            isSubmenuActive(item.submenu)
                              ? "bg-primary text-primary-foreground font-medium"
                              : "hover:bg-muted/50 text-sidebar-foreground"
                          }
                        >
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                          {!collapsed && (
                            <ChevronDown
                              className={`ml-auto h-4 w-4 transition-transform duration-200 ${
                                submenuOpen[item.title] ? "transform rotate-180" : ""
                              }`}
                            />
                          )}
                        </SidebarMenuButton>
                        {!collapsed && submenuOpen[item.title] && (
                          <SidebarMenuSub>
                            {item.submenu.map((subItem: any) => (
                              <SidebarMenuSubItem key={subItem.title}>
                                {subItem.subsections ? (
                                  <>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <SidebarMenuSubButton
                                          onClick={() => toggleSubsection(`${item.title}-${subItem.title}`)}
                                          className="hover:bg-muted/50 text-sidebar-foreground"
                                        >
                                          {subItem.icon && <subItem.icon className="h-3 w-3 mr-2" />}
                                          <span className="text-xs font-medium truncate">{subItem.title}</span>
                                          <ChevronDown
                                            className={`ml-auto h-3 w-3 transition-transform duration-200 flex-shrink-0 ${
                                              subsectionOpen[`${item.title}-${subItem.title}`]
                                                ? "transform rotate-180"
                                                : ""
                                            }`}
                                          />
                                        </SidebarMenuSubButton>
                                      </TooltipTrigger>
                                      <TooltipContent
                                        side="right"
                                        className="bg-popover text-popover-foreground border border-border"
                                      >
                                        <p>{subItem.title}</p>
                                      </TooltipContent>
                                    </Tooltip>
                                    {subsectionOpen[`${item.title}-${subItem.title}`] && (
                                      <SidebarMenuSub className="ml-4">
                                        {subItem.subsections.map((subsec: any) => (
                                          <SidebarMenuSubItem key={subsec.title}>
                                            <Tooltip>
                                              <TooltipTrigger asChild>
                                                <SidebarMenuSubButton asChild>
                                                  <NavLink
                                                    to={subsec.url}
                                                    className={({ isActive }) =>
                                                      `w-full text-xs ${getNavCls({ isActive })}`
                                                    }
                                                  >
                                                    <span className="truncate">{subsec.title}</span>
                                                  </NavLink>
                                                </SidebarMenuSubButton>
                                              </TooltipTrigger>
                                              <TooltipContent
                                                side="right"
                                                className="bg-popover text-popover-foreground border border-border"
                                              >
                                                <p>{subsec.title}</p>
                                              </TooltipContent>
                                            </Tooltip>
                                          </SidebarMenuSubItem>
                                        ))}
                                      </SidebarMenuSub>
                                    )}
                                  </>
                                ) : (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <SidebarMenuSubButton asChild>
                                        <NavLink
                                          to={subItem.url}
                                          className={({ isActive }) => `w-full ${getNavCls({ isActive })}`}
                                        >
                                          <span className="truncate">{subItem.title}</span>
                                        </NavLink>
                                      </SidebarMenuSubButton>
                                    </TooltipTrigger>
                                    <TooltipContent
                                      side="right"
                                      className="bg-popover text-popover-foreground border border-border"
                                    >
                                      <p>{subItem.title}</p>
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </SidebarMenuSubItem>
                            ))}
                          </SidebarMenuSub>
                        )}
                      </>
                    ) : (
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.url!}
                          end
                          className={({ isActive }) => `flex items-center space-x-2 w-full ${getNavCls({ isActive })}`}
                        >
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    )}
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </TooltipProvider>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Footer */}
        <div className="mt-auto">
          {!collapsed && (
            <div className="p-4 text-center">
              <div className="flex flex-col items-center justify-center gap-1">
                <span className="text-xs text-muted-foreground">By:</span>
                <img src={rhcoreLogo} alt="RHCore" className="h-8 object-contain" />
              </div>
            </div>
          )}

          {/* Theme Toggle Button */}
          <div className="px-4 pb-1">
            {mounted && (
              collapsed ? (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-full"
                        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                      >
                        {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      {resolvedTheme === 'dark' ? 'Alternar para tema claro' : 'Alternar para tema escuro'}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              ) : (
                <Button
                  variant="ghost"
                  className="w-full justify-start"
                  onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                >
                  {resolvedTheme === 'dark'
                    ? <><Sun className="h-4 w-4" /><span className="ml-2">☀️ Tema Claro</span></>
                    : <><Moon className="h-4 w-4" /><span className="ml-2">🌙 Tema Escuro</span></>
                  }
                </Button>
              )
            )}
          </div>

          {/* Logout Button */}
          <div className="p-4 border-t">
            <Button variant="ghost" className="w-full justify-start" onClick={signOut}>
              <LogOut className="h-4 w-4" />
              {!collapsed && <span className="ml-2">Sair</span>}
            </Button>
          </div>
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
