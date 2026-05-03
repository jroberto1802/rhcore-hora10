import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit, Trash2, Shield, ShieldCheck, Users, ChevronDown, ChevronRight, Copy } from "lucide-react";
import { PERMISSION_GROUPS, type Permission } from "@/lib/permissions";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface Empresa {
  id: string;
  fantasia: string;
}

interface PerfilAcesso {
  id: string;
  empresa_id: string;
  nome: string;
  descricao: string | null;
  is_system: boolean;
  created_at: string;
  empresa?: { fantasia: string };
  permissoes?: string[];
  usuarios_count?: number;
}

interface GerenciarPermissoesProps {
  selectedEmpresa: Empresa | null;
  isGroupView?: boolean;
  currentGroupId?: string | null;
}

export default function GerenciarPermissoes({ selectedEmpresa, isGroupView, currentGroupId }: GerenciarPermissoesProps) {
  const navigate = useNavigate();
  const [perfis, setPerfis] = useState<PerfilAcesso[]>([]);
  const [empresasGrupo, setEmpresasGrupo] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [duplicateDialogOpen, setDuplicateDialogOpen] = useState(false);
  const [editingPerfil, setEditingPerfil] = useState<PerfilAcesso | null>(null);
  const [duplicatingPerfil, setDuplicatingPerfil] = useState<PerfilAcesso | null>(null);
  const [formData, setFormData] = useState({ nome: "", descricao: "" });
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(PERMISSION_GROUPS.map(g => g.label)));
  const [saving, setSaving] = useState(false);
  const [duplicateTargetEmpresa, setDuplicateTargetEmpresa] = useState<string>("");
  const [duplicateNewName, setDuplicateNewName] = useState<string>("");

  useEffect(() => {
    if (selectedEmpresa?.id || currentGroupId) {
      loadPerfis();
      loadEmpresasGrupo();
    }
  }, [selectedEmpresa?.id, currentGroupId]);

  const loadEmpresasGrupo = async () => {
    try {
      if (currentGroupId) {
        const { data, error } = await supabase
          .from('empresas')
          .select('id, fantasia')
          .eq('grupo_empresarial_id', currentGroupId)
          .eq('ativo', true)
          .order('fantasia');
        
        if (error) throw error;
        setEmpresasGrupo(data || []);
      } else if (selectedEmpresa) {
        // Buscar o grupo da empresa selecionada
        const { data: empresa } = await supabase
          .from('empresas')
          .select('grupo_empresarial_id')
          .eq('id', selectedEmpresa.id)
          .single();
        
        if (empresa?.grupo_empresarial_id) {
          const { data, error } = await supabase
            .from('empresas')
            .select('id, fantasia')
            .eq('grupo_empresarial_id', empresa.grupo_empresarial_id)
            .eq('ativo', true)
            .order('fantasia');
          
          if (error) throw error;
          setEmpresasGrupo(data || []);
        }
      }
    } catch (error) {
      console.error('Error loading empresas grupo:', error);
    }
  };

  const loadPerfis = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('perfis_acesso')
        .select(`
          *,
          empresa:empresas(fantasia)
        `)
        .order('nome');

      if (isGroupView && currentGroupId) {
        // Buscar empresas do grupo
        const { data: empresasGrupo } = await supabase
          .from('empresas')
          .select('id')
          .eq('grupo_empresarial_id', currentGroupId);
        
        if (empresasGrupo) {
          query = query.in('empresa_id', empresasGrupo.map(e => e.id));
        }
      } else if (selectedEmpresa?.id) {
        query = query.eq('empresa_id', selectedEmpresa.id);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Buscar permissões e contagem de usuários para cada perfil
      const perfisComDados = await Promise.all((data || []).map(async (perfil) => {
        const [permissoesRes, usuariosRes] = await Promise.all([
          supabase
            .from('permissoes_perfil')
            .select('codigo_permissao')
            .eq('perfil_id', perfil.id),
          supabase
            .from('usuarios_perfis')
            .select('id', { count: 'exact' })
            .eq('perfil_id', perfil.id)
        ]);

        return {
          ...perfil,
          permissoes: permissoesRes.data?.map(p => p.codigo_permissao) || [],
          usuarios_count: usuariosRes.count || 0
        };
      }));

      setPerfis(perfisComDados);
    } catch (error) {
      console.error('Error loading perfis:', error);
      toast.error('Erro ao carregar perfis de acesso');
    } finally {
      setLoading(false);
    }
  };

  const openCreateDialog = () => {
    setEditingPerfil(null);
    setFormData({ nome: "", descricao: "" });
    setSelectedPermissions(new Set());
    setDialogOpen(true);
  };

  const openEditDialog = (perfil: PerfilAcesso) => {
    if (perfil.is_system) {
      toast.error('Perfis do sistema não podem ser editados');
      return;
    }
    setEditingPerfil(perfil);
    setFormData({ nome: perfil.nome, descricao: perfil.descricao || "" });
    setSelectedPermissions(new Set(perfil.permissoes || []));
    setDialogOpen(true);
  };

  const openDuplicateDialog = (perfil: PerfilAcesso) => {
    setDuplicatingPerfil(perfil);
    setDuplicateNewName(`${perfil.nome} (Cópia)`);
    setDuplicateTargetEmpresa("");
    setDuplicateDialogOpen(true);
  };

  const handleDuplicate = async () => {
    if (!duplicatingPerfil || !duplicateTargetEmpresa || !duplicateNewName.trim()) {
      toast.error('Preencha todos os campos');
      return;
    }

    setSaving(true);
    try {
      // Criar o novo perfil
      const { data: newPerfil, error: createError } = await supabase
        .from('perfis_acesso')
        .insert({
          empresa_id: duplicateTargetEmpresa,
          nome: duplicateNewName.trim(),
          descricao: duplicatingPerfil.descricao,
        })
        .select()
        .single();

      if (createError) throw createError;

      // Copiar as permissões
      if (duplicatingPerfil.permissoes && duplicatingPerfil.permissoes.length > 0) {
        const permissoesInsert = duplicatingPerfil.permissoes.map(codigo => ({
          perfil_id: newPerfil.id,
          codigo_permissao: codigo
        }));

        const { error: permError } = await supabase
          .from('permissoes_perfil')
          .insert(permissoesInsert);

        if (permError) throw permError;
      }

      const empresaNome = empresasGrupo.find(e => e.id === duplicateTargetEmpresa)?.fantasia;
      toast.success(`Perfil duplicado com sucesso para ${empresaNome}`);
      setDuplicateDialogOpen(false);
      loadPerfis();
    } catch (error: any) {
      console.error('Error duplicating perfil:', error);
      if (error.code === '23505') {
        toast.error('Já existe um perfil com esse nome nesta empresa');
      } else {
        toast.error('Erro ao duplicar perfil');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!formData.nome.trim()) {
      toast.error('Nome do perfil é obrigatório');
      return;
    }

    if (!selectedEmpresa?.id) {
      toast.error('Selecione uma empresa');
      return;
    }

    setSaving(true);
    try {
      if (editingPerfil) {
        // Atualizar perfil existente
        const { error: updateError } = await supabase
          .from('perfis_acesso')
          .update({
            nome: formData.nome.trim(),
            descricao: formData.descricao.trim() || null,
          })
          .eq('id', editingPerfil.id);

        if (updateError) throw updateError;

        // Remover permissões antigas
        await supabase
          .from('permissoes_perfil')
          .delete()
          .eq('perfil_id', editingPerfil.id);

        // Inserir novas permissões
        if (selectedPermissions.size > 0) {
          const permissoesInsert = Array.from(selectedPermissions).map(codigo => ({
            perfil_id: editingPerfil.id,
            codigo_permissao: codigo
          }));

          const { error: permError } = await supabase
            .from('permissoes_perfil')
            .insert(permissoesInsert);

          if (permError) throw permError;
        }

        toast.success('Perfil atualizado com sucesso');
      } else {
        // Criar novo perfil
        const { data: newPerfil, error: createError } = await supabase
          .from('perfis_acesso')
          .insert({
            empresa_id: selectedEmpresa.id,
            nome: formData.nome.trim(),
            descricao: formData.descricao.trim() || null,
          })
          .select()
          .single();

        if (createError) throw createError;

        // Inserir permissões
        if (selectedPermissions.size > 0) {
          const permissoesInsert = Array.from(selectedPermissions).map(codigo => ({
            perfil_id: newPerfil.id,
            codigo_permissao: codigo
          }));

          const { error: permError } = await supabase
            .from('permissoes_perfil')
            .insert(permissoesInsert);

          if (permError) throw permError;
        }

        toast.success('Perfil criado com sucesso');
      }

      setDialogOpen(false);
      loadPerfis();
    } catch (error: any) {
      console.error('Error saving perfil:', error);
      if (error.code === '23505') {
        toast.error('Já existe um perfil com esse nome nesta empresa');
      } else {
        toast.error('Erro ao salvar perfil');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (perfil: PerfilAcesso) => {
    if (perfil.is_system) {
      toast.error('Perfis do sistema não podem ser excluídos');
      return;
    }

    if (perfil.usuarios_count && perfil.usuarios_count > 0) {
      toast.error('Remova os usuários vinculados antes de excluir o perfil');
      return;
    }

    if (!confirm(`Deseja realmente excluir o perfil "${perfil.nome}"?`)) return;

    try {
      const { error } = await supabase
        .from('perfis_acesso')
        .delete()
        .eq('id', perfil.id);

      if (error) throw error;

      toast.success('Perfil excluído com sucesso');
      loadPerfis();
    } catch (error) {
      console.error('Error deleting perfil:', error);
      toast.error('Erro ao excluir perfil');
    }
  };

  const togglePermission = (codigo: string) => {
    setSelectedPermissions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(codigo)) {
        newSet.delete(codigo);
      } else {
        newSet.add(codigo);
      }
      return newSet;
    });
  };

  const toggleGroup = (groupLabel: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupLabel)) {
        newSet.delete(groupLabel);
      } else {
        newSet.add(groupLabel);
      }
      return newSet;
    });
  };

  const toggleAllInGroup = (permissions: Permission[], checked: boolean) => {
    setSelectedPermissions(prev => {
      const newSet = new Set(prev);
      permissions.forEach(p => {
        if (checked) {
          newSet.add(p.codigo);
        } else {
          newSet.delete(p.codigo);
        }
      });
      return newSet;
    });
  };

  const isGroupAllSelected = (permissions: Permission[]) => {
    return permissions.every(p => selectedPermissions.has(p.codigo));
  };

  const isGroupPartiallySelected = (permissions: Permission[]) => {
    const selected = permissions.filter(p => selectedPermissions.has(p.codigo));
    return selected.length > 0 && selected.length < permissions.length;
  };

  if (!selectedEmpresa && !isGroupView) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-10 text-center">
            <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Selecione uma empresa para gerenciar os perfis de acesso</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Gerenciar Permissões
          </h1>
          <p className="text-muted-foreground">
            Configure perfis de acesso e suas permissões
          </p>
        </div>
        <Button onClick={openCreateDialog}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Perfil
        </Button>
      </div>

      {/* Info sobre Super Admin */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="py-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-primary" />
            <div>
              <p className="font-medium text-sm">Super Administrador</p>
              <p className="text-xs text-muted-foreground">
                Usuários com perfil "admin" na tabela de roles têm acesso total ao sistema, ignorando todas as permissões configuradas.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Perfis */}
      <Card>
        <CardHeader>
          <CardTitle>Perfis de Acesso</CardTitle>
          <CardDescription>
            {isGroupView 
              ? `Perfis de todas as empresas do grupo`
              : `Perfis da empresa ${selectedEmpresa?.fantasia}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8 text-muted-foreground">Carregando...</div>
          ) : perfis.length === 0 ? (
            <div className="text-center py-8">
              <Shield className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">Nenhum perfil de acesso cadastrado</p>
              <Button variant="outline" className="mt-4" onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Criar primeiro perfil
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  {isGroupView && <TableHead>Empresa</TableHead>}
                  <TableHead className="text-center">Permissões</TableHead>
                  <TableHead className="text-center">Usuários</TableHead>
                  <TableHead className="w-[140px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {perfis.map((perfil) => (
                  <TableRow key={perfil.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {perfil.nome}
                        {perfil.is_system && (
                          <Badge variant="secondary" className="text-xs">Sistema</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {perfil.descricao || "-"}
                    </TableCell>
                    {isGroupView && (
                      <TableCell>{perfil.empresa?.fantasia}</TableCell>
                    )}
                    <TableCell className="text-center">
                      <Badge variant="outline">{perfil.permissoes?.length || 0}</Badge>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{perfil.usuarios_count || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDuplicateDialog(perfil)}
                          title="Duplicar para outra empresa"
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEditDialog(perfil)}
                          disabled={perfil.is_system}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(perfil)}
                          disabled={perfil.is_system}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Dialog de Duplicar Perfil */}
      <Dialog open={duplicateDialogOpen} onOpenChange={setDuplicateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Duplicar Perfil para Outra Empresa</DialogTitle>
            <DialogDescription>
              Selecione a empresa de destino e o nome para o novo perfil
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Perfil Original</Label>
              <div className="p-3 bg-muted rounded-md">
                <p className="font-medium">{duplicatingPerfil?.nome}</p>
                <p className="text-sm text-muted-foreground">
                  {duplicatingPerfil?.permissoes?.length || 0} permissões
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="targetEmpresa">Empresa de Destino *</Label>
              <Select value={duplicateTargetEmpresa} onValueChange={setDuplicateTargetEmpresa}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {empresasGrupo
                    .filter(e => e.id !== duplicatingPerfil?.empresa_id)
                    .map(empresa => (
                      <SelectItem key={empresa.id} value={empresa.id}>
                        {empresa.fantasia}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newName">Nome do Novo Perfil *</Label>
              <Input
                id="newName"
                value={duplicateNewName}
                onChange={(e) => setDuplicateNewName(e.target.value)}
                placeholder="Nome do perfil"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDuplicateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleDuplicate} disabled={saving || !duplicateTargetEmpresa || !duplicateNewName.trim()}>
              {saving ? "Duplicando..." : "Duplicar Perfil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Criar/Editar Perfil */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingPerfil ? "Editar Perfil" : "Novo Perfil de Acesso"}
            </DialogTitle>
            <DialogDescription>
              Configure o nome, descrição e as permissões do perfil
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Dados básicos */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome do Perfil *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                  placeholder="Ex: Analista RH"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição</Label>
                <Input
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  placeholder="Breve descrição do perfil"
                />
              </div>
            </div>

            {/* Permissões */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">Permissões</Label>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPermissions(new Set(PERMISSION_GROUPS.flatMap(g => g.permissions.map(p => p.codigo))))}
                  >
                    Selecionar Todos
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedPermissions(new Set())}
                  >
                    Limpar Seleção
                  </Button>
                </div>
              </div>

              <div className="border rounded-lg divide-y">
                {PERMISSION_GROUPS.map((group) => (
                  <Collapsible
                    key={group.label}
                    open={expandedGroups.has(group.label)}
                    onOpenChange={() => toggleGroup(group.label)}
                  >
                    <CollapsibleTrigger className="flex items-center justify-between w-full p-4 hover:bg-muted/50">
                      <div className="flex items-center gap-3">
                        <Checkbox
                          checked={isGroupAllSelected(group.permissions)}
                          ref={(el) => {
                            if (el) {
                              (el as any).indeterminate = isGroupPartiallySelected(group.permissions);
                            }
                          }}
                          onCheckedChange={(checked) => {
                            toggleAllInGroup(group.permissions, checked as boolean);
                          }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <span className="font-medium">{group.label}</span>
                        <Badge variant="secondary" className="text-xs">
                          {group.permissions.filter(p => selectedPermissions.has(p.codigo)).length}/{group.permissions.length}
                        </Badge>
                      </div>
                      {expandedGroups.has(group.label) ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="px-4 pb-4 grid grid-cols-2 gap-2 ml-8">
                        {group.permissions.map((permission) => (
                          <div key={permission.codigo} className="flex items-center gap-2">
                            <Checkbox
                              id={permission.codigo}
                              checked={selectedPermissions.has(permission.codigo)}
                              onCheckedChange={() => togglePermission(permission.codigo)}
                            />
                            <Label
                              htmlFor={permission.codigo}
                              className="text-sm font-normal cursor-pointer"
                            >
                              {permission.label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : editingPerfil ? "Salvar Alterações" : "Criar Perfil"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
