import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Building2, LogOut, Users } from 'lucide-react';
import { useUserEmpresas, type Empresa } from '@/hooks/useUserEmpresas';
import { useAuth } from '@/hooks/useAuth';
import rhcoreLogo from '@/assets/rhcore-logo.png';

interface EmpresaSelectionProps {
  onEmpresaSelect: (empresa: Empresa) => void;
  onGroupSelect: (groupId: string, groupName: string) => void;
}

const EmpresaSelection = ({ onEmpresaSelect, onGroupSelect }: EmpresaSelectionProps) => {
  const { empresas, loading } = useUserEmpresas();
  const { signOut } = useAuth();
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const handleEmpresaSelect = (empresa: Empresa) => {
    setSelectedItem(`empresa-${empresa.id}`);
    onEmpresaSelect(empresa);
  };

  const handleGroupSelect = (groupId: string, groupName: string) => {
    setSelectedItem(`grupo-${groupId}`);
    onGroupSelect(groupId, groupName);
  };

  // Agrupar empresas por grupo empresarial
  const empresasPorGrupo = empresas.reduce((acc, empresa) => {
    const grupoId = empresa.grupo_empresarial.id;
    if (!acc[grupoId]) {
      acc[grupoId] = {
        grupo: empresa.grupo_empresarial,
        empresas: []
      };
    }
    acc[grupoId].empresas.push(empresa);
    return acc;
  }, {} as Record<string, { grupo: { id: string; nome: string; descricao: string | null; logo_url: string | null }; empresas: Empresa[] }>);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando empresas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl flex gap-8">
        {/* Conteúdo Principal */}
        <div className="flex-1 max-w-2xl">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <img src={rhcoreLogo} alt="RHCore Logo" className="h-12 w-12 mr-2" />
              <h1 className="text-3xl font-bold text-primary">RHCore</h1>
            </div>
            <p className="text-muted-foreground">
              Selecione a empresa para acessar
            </p>
          </div>

          <Card className="shadow-xl">
            <CardHeader className="text-center">
              <CardTitle>Escolha sua Empresa</CardTitle>
              <CardDescription>
                Selecione uma das empresas vinculadas ao seu usuário
              </CardDescription>
            </CardHeader>
            <CardContent>
              {empresas.length === 0 ? (
                <div className="text-center py-8">
                  <Building2 className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">Nenhuma empresa encontrada</h3>
                  <p className="text-muted-foreground mb-4">
                    Você não está vinculado a nenhuma empresa no momento.
                  </p>
                  <Button onClick={signOut} variant="outline">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sair
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {Object.values(empresasPorGrupo).map(({ grupo, empresas: empresasDoGrupo }) => (
                    <div key={grupo.id} className="space-y-3">
                      {/* Opção de selecionar o grupo inteiro */}
                      <Card 
                        className={`cursor-pointer transition-all hover:shadow-md border-2 ${
                          selectedItem === `grupo-${grupo.id}` ? 'ring-2 ring-primary border-primary' : 'border-dashed border-muted-foreground/30'
                        }`}
                        onClick={() => handleGroupSelect(grupo.id, grupo.nome)}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                              <Users className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-lg">{grupo.nome}</h3>
                              <p className="text-sm text-muted-foreground">
                                {empresasDoGrupo.length} empresas - Visualizar todas
                              </p>
                              {grupo.descricao && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {grupo.descricao}
                                </p>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Empresas individuais do grupo */}
                      <div className="ml-4 space-y-2">
                        {empresasDoGrupo.map((empresa) => (
                          <Card 
                            key={empresa.id} 
                            className={`cursor-pointer transition-all hover:shadow-md ${
                              selectedItem === `empresa-${empresa.id}` ? 'ring-2 ring-primary' : ''
                            }`}
                            onClick={() => handleEmpresaSelect(empresa)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center space-x-4">
                                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                                  {empresa.logo_url ? (
                                    <img 
                                      src={empresa.logo_url} 
                                      alt={`Logo ${empresa.fantasia}`}
                                      className="w-6 h-6 object-contain"
                                    />
                                  ) : (
                                    <Building2 className="h-5 w-5 text-primary" />
                                  )}
                                </div>
                                <div className="flex-1">
                                  <h4 className="font-medium">{empresa.fantasia}</h4>
                                  {empresa.razao_social && (
                                    <p className="text-xs text-muted-foreground">
                                      {empresa.razao_social}
                                    </p>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  <div className="flex justify-center pt-4">
                    <Button onClick={signOut} variant="outline">
                      <LogOut className="h-4 w-4 mr-2" />
                      Sair
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Lateral Direita com Logo do Grupo */}
        {empresas.length > 0 && selectedItem && (
          <div className="w-80 flex items-center justify-center">
            <div className="bg-white/30 dark:bg-card/60 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border border-white/20 dark:border-border">
              {(() => {
                // Determinar qual logo mostrar baseado na seleção
                let logoUrl = null;
                let logoAlt = '';
                
                if (selectedItem.startsWith('grupo-')) {
                  const grupoId = selectedItem.replace('grupo-', '');
                  const grupo = Object.values(empresasPorGrupo).find(g => g.grupo.id === grupoId);
                  logoUrl = grupo?.grupo.logo_url;
                  logoAlt = `Logo ${grupo?.grupo.nome}`;
                } else if (selectedItem.startsWith('empresa-')) {
                  const empresaId = selectedItem.replace('empresa-', '');
                  const empresa = empresas.find(e => e.id === empresaId);
                  logoUrl = empresa?.grupo_empresarial.logo_url;
                  logoAlt = `Logo ${empresa?.grupo_empresarial.nome}`;
                }

                return logoUrl ? (
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-blue-600/20 rounded-2xl blur-xl animate-pulse"></div>
                    <img 
                      src={logoUrl} 
                      alt={logoAlt}
                      className="relative w-64 h-64 object-contain drop-shadow-2xl transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                ) : (
                  <div className="w-64 h-64 bg-gradient-to-br from-primary/20 to-blue-600/20 rounded-2xl flex items-center justify-center">
                    <Building2 className="h-24 w-24 text-primary/60" />
                  </div>
                );
              })()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmpresaSelection;