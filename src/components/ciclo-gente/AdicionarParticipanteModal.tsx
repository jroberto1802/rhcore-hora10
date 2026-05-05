import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Search } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  cicloId: string;
  empresaId: string;
  onSuccess: () => void;
  existingFuncionarioIds: string[];
}

export function AdicionarParticipanteModal({
  open, onClose, cicloId, empresaId, onSuccess, existingFuncionarioIds,
}: Props) {
  const db = supabase as any;
  const [search, setSearch] = useState("");
  const [selectedFuncionario, setSelectedFuncionario] = useState("");
  const [selectedGestor, setSelectedGestor] = useState("");

  const { data: funcionarios = [] } = useQuery({
    queryKey: ["funcionarios_ativos", empresaId],
    queryFn: async () => {
      const { data, error } = await db
        .from("funcionarios")
        .select("id, nome_completo, cargo_atual")
        .eq("empresa_id", empresaId)
        .is("data_demissao", null)
        .order("nome_completo");
      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaId && open,
  });

  const available = funcionarios.filter(
    (f: any) =>
      !existingFuncionarioIds.includes(f.id) &&
      f.nome_completo.toLowerCase().includes(search.toLowerCase())
  );

  const mutation = useMutation({
    mutationFn: async () => {
      if (!selectedFuncionario) throw new Error("Selecione um colaborador");
      const { error } = await db.from("ciclo_gente_participantes").insert({
        ciclo_id: cicloId,
        funcionario_id: selectedFuncionario,
        gestor_id: selectedGestor || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Participante adicionado.");
      onSuccess();
      onClose();
      setSelectedFuncionario("");
      setSelectedGestor("");
      setSearch("");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao adicionar participante."),
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar Participante</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Colaborador</Label>
            <div className="relative mt-1.5 mb-2">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar colaborador..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={selectedFuncionario} onValueChange={setSelectedFuncionario}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o colaborador" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {available.map((f: any) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nome_completo} {f.cargo_atual ? `— ${f.cargo_atual}` : ""}
                  </SelectItem>
                ))}
                {available.length === 0 && (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    Nenhum colaborador disponível
                  </div>
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Gestor direto (opcional)</Label>
            <Select value={selectedGestor} onValueChange={setSelectedGestor}>
              <SelectTrigger className="mt-1.5">
                <SelectValue placeholder="Selecione o gestor" />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {funcionarios.map((f: any) => (
                  <SelectItem key={f.id} value={f.id}>
                    {f.nome_completo}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!selectedFuncionario || mutation.isPending}
          >
            {mutation.isPending ? "Adicionando..." : "Adicionar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
