import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building2, Users, Edit, Image as ImageIcon, FileText, Plus, Power } from 'lucide-react';
import { useUserEmpresas } from '@/hooks/useUserEmpresas';
import { EmpresaLogoManager } from '@/components/EmpresaLogoManager';
import { EmpresaForm } from '@/components/EmpresaForm';
import { GrupoEmpresarialForm } from '@/components/GrupoEmpresarialForm';
import { DocumentosPadraoManager } from '@/components/DocumentosPadraoManager';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface ConfiguracoesProps {
  currentEmpresa?: { id: string; fantasia: string } | null;
}

export const Configuracoes: React.FC<ConfiguracoesProps> = ({ currentEmpresa }) => {
  const { empresas: empresasAtivas, loading: loadingAtivas } = useUserEmpresas();
  const [todasEmpresas, setTodasEmpresas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEmpresa, setSelectedEmpresa] = useState<string | null>(null);
  const [editingEmpresa, setEditingEmpresa] = useState<string | null>(null);
  const [editingMode, setEditingMode] = useState<'form' | 'logo' | null>(null);
  const [creatingEmpresa, setCreatingEmpresa] = useState(false);
  const [selectedGrupo, setSelectedGrupo] = useState<string | null>(null);
  const [empresaToToggle, setEmpresaToToggle] = useState<any | null>(null);
  const { user } = useAuth();

  // Usa a empresa atual selecionada se disponível, senão usa a primeira empresa ativa
  const empresaIdParaConfig = currentEmpresa?.id || (empresasAtivas.length > 0 ? empresasAtivas[0].id : null);

  useEffect(() => {
    if (user) {
      loadAllEmpresas();
    }
  }, [user]);

  const loadAllEmpresas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('usuarios_empresas')
        .select(`
          empresa_id,
          empresas (
            id,
            fantasia,
            razao_social,
            cnpj,
            logo_url,
            ativo,
            grupos_empresariais (
              id,
              nome,
              descricao,
              logo_url
            )
          )
        `)
        .eq('user_id', user!.id);

      if (error) throw error;

      const empresasFormatted = data
        ?.filter((item: any) => item.empresas?.grupos_empresariais)
        .map((item: any) => ({
          id: item.empresas.id,
          fantasia: item.empresas.fantasia,
          razao_social: item.empresas.razao_social,
          cnpj: item.empresas.cnpj,
          logo_url: item.empresas.logo_url,
          ativo: item.empresas.ativo ?? true,
          grupo_empresarial: {
            id: item.empresas.grupos_empresariais.id,
            nome: item.empresas.grupos_empresariais.nome,
            descricao: item.empresas.grupos_empresariais.descricao,
            logo_url: item.empresas.grupos_empresariais.logo_url,
          }
        })) || [];

      setTodasEmpresas(empresasFormatted);
    } catch (error) {
      console.error('Erro ao carregar empresas:', error);
      toast.error('Erro ao carregar empresas');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleEmpresa = async (empresa: any) => {
    try {
      const { error } = await supabase
        .from('empresas')
        .update({ ativo: !empresa.ativo })
        .eq('id', empresa.id);

      if (error) throw error;

      toast.success(
        empresa.ativo 
          ? 'Empresa desativada com sucesso!' 
          : 'Empresa ativada com sucesso!'
      );
      
      loadAllEmpresas();
      setEmpresaToToggle(null);
    } catch (error) {
      console.error('Erro ao alterar status da empresa:', error);
      toast.error('Erro ao alterar status da empresa');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Carregando configurações...</div>
      </div>
    );
  }

  const grupos = Array.from(
    new Map(
      todasEmpresas.map(emp => [
        emp.grupo_empresarial.id,
        emp.grupo_empresarial
      ])
    ).values()
  );

  const empresaSelecionada = todasEmpresas.find(emp => emp.id === selectedEmpresa || emp.id === editingEmpresa);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie empresas e grupos empresariais
        </p>
      </div>

      <Tabs defaultValue="empresas" className="space-y-6">
        <TabsList>
          <TabsTrigger value="empresas" className="flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Empresas
          </TabsTrigger>
          <TabsTrigger value="grupos" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Grupos Empresariais
          </TabsTrigger>
          <TabsTrigger value="documentos-padrao" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Documentos Padrão
          </TabsTrigger>
        </TabsList>

        <TabsContent value="empresas" className="space-y-4">
          {(selectedEmpresa || editingEmpresa || creatingEmpresa) ? (
            <div className="space-y-4">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSelectedEmpresa(null);
                  setEditingEmpresa(null);
                  setEditingMode(null);
                  setCreatingEmpresa(false);
                }}
              >
                ← Voltar à lista
              </Button>
              
              {creatingEmpresa ? (
                <EmpresaForm
                  grupoEmpresarialId={selectedGrupo || undefined}
                  onSuccess={() => {
                    setCreatingEmpresa(false);
                    setSelectedGrupo(null);
                    loadAllEmpresas();
                  }}
                  onCancel={() => {
                    setCreatingEmpresa(false);
                    setSelectedGrupo(null);
                  }}
                />
              ) : editingMode === 'form' ? (
                <EmpresaForm
                  empresa={empresaSelecionada}
                  onSuccess={() => {
                    setEditingEmpresa(null);
                    setEditingMode(null);
                    loadAllEmpresas();
                  }}
                  onCancel={() => {
                    setEditingEmpresa(null);
                    setEditingMode(null);
                  }}
                />
              ) : (
                <EmpresaLogoManager
                  empresa={empresaSelecionada}
                  onSuccess={() => {
                    setSelectedEmpresa(null);
                    setEditingMode(null);
                    loadAllEmpresas();
                  }}
                  onCancel={() => {
                    setSelectedEmpresa(null);
                    setEditingMode(null);
                  }}
                />
              )}
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-semibold">Lista de Empresas</h2>
                <div className="flex gap-2">
                  {grupos.map(grupo => (
                    <Button
                      key={grupo.id}
                      variant="default"
                      size="sm"
                      onClick={() => {
                        setSelectedGrupo(grupo.id);
                        setCreatingEmpresa(true);
                      }}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Nova Empresa ({grupo.nome})
                    </Button>
                  ))}
                </div>
              </div>
              
              <div className="grid gap-3">
                {todasEmpresas.map((empresa) => (
                  <Card key={empresa.id} className={`hover:shadow-md transition-shadow ${!empresa.ativo ? 'opacity-60' : ''}`}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {empresa.logo_url ? (
                            <img
                              src={empresa.logo_url}
                              alt={`Logo ${empresa.fantasia}`}
                              className="w-12 h-12 object-cover rounded-lg border"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                              <Building2 className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-medium">{empresa.fantasia}</h3>
                              {!empresa.ativo && (
                                <Badge variant="destructive">Inativa</Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {empresa.razao_social || 'Sem razão social'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {empresa.cnpj && `CNPJ: ${empresa.cnpj} • `}
                              Grupo: {empresa.grupo_empresarial.nome}
                            </p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setEditingEmpresa(empresa.id);
                              setEditingMode('form');
                            }}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedEmpresa(empresa.id);
                              setEditingMode('logo');
                            }}
                          >
                            <ImageIcon className="w-4 h-4 mr-1" />
                            Logo
                          </Button>
                          <Button
                            variant={empresa.ativo ? "destructive" : "default"}
                            size="sm"
                            onClick={() => setEmpresaToToggle(empresa)}
                          >
                            <Power className="w-4 h-4 mr-1" />
                            {empresa.ativo ? 'Desativar' : 'Ativar'}
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="grupos" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Grupos Empresariais</h2>
          </div>
          
          <div className="grid gap-3">
            {grupos.map((grupo) => (
              <Card key={grupo.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {grupo.logo_url ? (
                        <img
                          src={grupo.logo_url}
                          alt={`Logo ${grupo.nome}`}
                          className="w-12 h-12 object-cover rounded-lg border"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                          <Users className="w-6 h-6 text-muted-foreground" />
                        </div>
                      )}
                      <div>
                        <h3 className="font-medium">{grupo.nome}</h3>
                        <p className="text-sm text-muted-foreground">
                          {grupo.descricao || 'Sem descrição'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {todasEmpresas.filter(emp => emp.grupo_empresarial.id === grupo.id).length} empresa(s)
                        </p>
                      </div>
                    </div>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline">
                          Editar
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <GrupoEmpresarialForm
                          grupo={{
                            id: grupo.id,
                            nome: grupo.nome,
                            descricao: grupo.descricao,
                            logo_url: grupo.logo_url
                          }}
                          onSuccess={() => window.location.reload()}
                        />
                      </DialogContent>
                    </Dialog>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="documentos-padrao" className="space-y-4">
          {empresaIdParaConfig ? (
            <>
              <p className="text-sm text-muted-foreground">Configurando para: <strong>{currentEmpresa?.fantasia || empresasAtivas[0]?.fantasia}</strong></p>
              <DocumentosPadraoManager empresaId={empresaIdParaConfig} />
            </>
          ) : (
            <p className="text-muted-foreground">Selecione uma empresa para configurar.</p>
          )}
        </TabsContent>

      </Tabs>

      {/* AlertDialog para confirmar desativação/ativação */}
      <AlertDialog open={!!empresaToToggle} onOpenChange={() => setEmpresaToToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {empresaToToggle?.ativo ? 'Desativar' : 'Ativar'} Empresa
            </AlertDialogTitle>
            <AlertDialogDescription>
              {empresaToToggle?.ativo ? (
                <>
                  Tem certeza que deseja desativar a empresa <strong>{empresaToToggle?.fantasia}</strong>?
                  <br /><br />
                  Esta empresa não aparecerá mais na seleção de empresas do login e no menu lateral.
                  Você poderá reativá-la a qualquer momento.
                </>
              ) : (
                <>
                  Tem certeza que deseja ativar a empresa <strong>{empresaToToggle?.fantasia}</strong>?
                  <br /><br />
                  Esta empresa voltará a aparecer na seleção de empresas do login e no menu lateral.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => handleToggleEmpresa(empresaToToggle)}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};