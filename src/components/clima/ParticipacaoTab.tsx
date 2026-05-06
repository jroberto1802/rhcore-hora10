import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Plus, Upload, Copy, Send, Download, Search, CheckCircle, Clock, X, AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Props {
  campanha: any;
}

function gerarToken(): string {
  return Math.random().toString(36).substring(2, 10).toUpperCase() +
    Math.random().toString(36).substring(2, 6).toUpperCase();
}

const BASE_URL = window.location.origin;

export function ParticipacaoTab({ campanha }: Props) {
  const queryClient = useQueryClient();
  const db = supabase as any;
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("todos");
  const [addOpen, setAddOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estado do formulário de adicionar
  const [funcSearch, setFuncSearch] = useState("");
  const [selectedFunc, setSelectedFunc] = useState<any>(null);
  const [turno, setTurno] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const resetAddForm = () => {
    setFuncSearch("");
    setSelectedFunc(null);
    setTurno("");
    setDropdownOpen(false);
  };

  // Busca funcionários da empresa da campanha
  const { data: funcionarios = [] } = useQuery({
    queryKey: ["funcionarios_clima", campanha.empresa_id],
    queryFn: async () => {
      const { data, error } = await db
        .from("funcionarios")
        .select("id, nome_completo, cargo_atual, setor_atual, cidade")
        .eq("empresa_id", campanha.empresa_id)
        .is("data_demissao", null)
        .order("nome_completo");
      if (error) throw error;
      return data || [];
    },
    enabled: !!campanha.empresa_id,
  });

  const { data: participantes = [], isLoading } = useQuery({
    queryKey: ["clima_participantes", campanha.id],
    queryFn: async () => {
      const { data, error } = await db
        .from("clima_participantes")
        .select("*")
        .eq("campanha_id", campanha.id)
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  const existingFuncIds = participantes.map((p: any) => p.funcionario_id).filter(Boolean);

  const funcFiltered = funcionarios.filter(
    (f: any) =>
      !existingFuncIds.includes(f.id) &&
      f.nome_completo.toLowerCase().includes(funcSearch.toLowerCase())
  );

  const adicionarMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFunc) throw new Error("Selecione um colaborador");
      const expira = new Date();
      expira.setHours(expira.getHours() + (campanha.token_expiracao_horas || 168));
      const { error } = await db.from("clima_participantes").insert({
        campanha_id: campanha.id,
        funcionario_id: selectedFunc.id,
        nome: selectedFunc.nome_completo,
        unidade: selectedFunc.cidade || null,
        setor: selectedFunc.setor_atual || null,
        turno: turno || null,
        token: gerarToken(),
        token_expira_em: expira.toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clima_participantes", campanha.id] });
      toast.success("Participante adicionado");
      resetAddForm();
      setAddOpen(false);
    },
    onError: (e: any) => toast.error(e.message || "Erro ao adicionar participante"),
  });

  const isRascunho = campanha.status === "rascunho";

  const copiarLinkComAviso = (link: string, nome?: string) => {
    if (isRascunho) {
      toast.warning("Campanha ainda em rascunho — publique antes de enviar os links, senão o funcionário verá 'Link inválido'.");
    }
    navigator.clipboard.writeText(link);
    toast.success(nome ? `Link copiado: ${nome}` : "Link copiado");
  };

  const reenviarMutation = useMutation({
    mutationFn: async (participante: any) => {
      copiarLinkComAviso(
        `${BASE_URL}/pesquisa/clima?token=${participante.token}`,
        participante.nome || "participante"
      );
    },
  });

  const copiarLinkTodos = () => {
    const pendentes = participantes.filter((p: any) => p.status === "pendente");
    const links = pendentes
      .map((p: any) => `${p.nome || "—"}: ${BASE_URL}/pesquisa/clima?token=${p.token}`)
      .join("\n");
    if (isRascunho) {
      toast.warning("Campanha ainda em rascunho — publique antes de enviar os links, senão os funcionários verão 'Link inválido'.");
    }
    navigator.clipboard.writeText(links);
    toast.success(`${pendentes.length} links copiados`);
  };

  const exportarCSV = () => {
    const header = "Nome,Unidade,Setor,Turno,Token,Status,Data Resposta\n";
    const rows = participantes.map((p: any) =>
      `"${p.nome || ""}","${p.unidade || ""}","${p.setor || ""}","${p.turno || ""}","${p.token}","${p.status}","${p.data_resposta || ""}"`
    ).join("\n");
    const blob = new Blob([header + rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `participantes_${campanha.nome.replace(/\s+/g, "_")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Lista exportada");
  };

  const importarCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split("\n").slice(1).filter(Boolean);
      const participantesToInsert = lines.map((line) => {
        const cols = line.split(",").map((c) => c.replace(/^"|"$/g, "").trim());
        const expira = new Date();
        expira.setHours(expira.getHours() + (campanha.token_expiracao_horas || 168));
        return {
          campanha_id: campanha.id,
          nome: cols[0] || null,
          unidade: cols[1] || null,
          setor: cols[2] || null,
          turno: cols[3] || null,
          token: gerarToken(),
          token_expira_em: expira.toISOString(),
        };
      });
      const { error } = await db.from("clima_participantes").insert(participantesToInsert);
      if (error) {
        toast.error("Erro ao importar participantes");
      } else {
        queryClient.invalidateQueries({ queryKey: ["clima_participantes", campanha.id] });
        toast.success(`${participantesToInsert.length} participantes importados`);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const filtered = participantes.filter((p: any) => {
    const matchSearch =
      !search ||
      p.nome?.toLowerCase().includes(search.toLowerCase()) ||
      p.setor?.toLowerCase().includes(search.toLowerCase()) ||
      p.unidade?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "todos" || p.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const total = participantes.length;
  const respondidos = participantes.filter((p: any) => p.status === "respondido").length;
  const pendentes = total - respondidos;

  const formatDt = (d: string | null) =>
    d ? format(new Date(d), "dd/MM/yy HH:mm", { locale: ptBR }) : "—";

  return (
    <div className="space-y-5">
      {/* Aviso de campanha não publicada */}
      {isRascunho && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
          <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Campanha não publicada</p>
            <p className="text-sm text-amber-700 mt-0.5">
              Os links gerados não funcionarão até que a campanha seja publicada. Vá até a aba{" "}
              <strong>Visão Geral</strong> e clique em <strong>Publicar campanha</strong> antes de enviar os links aos colaboradores.
            </p>
          </div>
        </div>
      )}

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total", value: total, icon: null, className: "text-foreground" },
          { label: "Responderam", value: respondidos, icon: CheckCircle, className: "text-green-600" },
          { label: "Pendentes", value: pendentes, icon: Clock, className: "text-amber-600" },
        ].map(({ label, value, icon: Icon, className }) => (
          <Card key={label} className="p-4 text-center">
            <p className={`text-3xl font-bold ${className}`}>{value}</p>
            <p className="text-xs text-muted-foreground mt-1">{label}</p>
          </Card>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex flex-col sm:flex-row gap-2 flex-1">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar participante..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <div className="flex gap-1 rounded-lg border p-1 bg-muted/30">
            {["todos", "pendente", "respondido"].map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors ${
                  statusFilter === s
                    ? "bg-white shadow text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {s === "todos" ? "Todos" : s === "pendente" ? "Pendentes" : "Respondidos"}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={copiarLinkTodos}>
            <Copy className="h-4 w-4 mr-1.5" /> Copiar links pendentes
          </Button>
          <Button variant="outline" size="sm" onClick={exportarCSV}>
            <Download className="h-4 w-4 mr-1.5" /> Exportar
          </Button>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            <Upload className="h-4 w-4 mr-1.5" /> Importar CSV
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={importarCSV}
          />
          <Button size="sm" onClick={() => setAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1.5" /> Adicionar
          </Button>
        </div>
      </div>

      {/* Tabela */}
      <Card className="overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <p className="text-sm">Nenhum participante encontrado</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Colaborador</TableHead>
                <TableHead>Unidade</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead>Turno</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data de envio</TableHead>
                <TableHead>Data de resposta</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p: any) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.nome || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.unidade || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.setor || "—"}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{p.turno || "—"}</TableCell>
                  <TableCell>
                    {p.status === "respondido" ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700 border border-green-200">
                        <CheckCircle className="h-3 w-3" /> Respondido
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700 border border-amber-200">
                        <Clock className="h-3 w-3" /> Pendente
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{formatDt(p.data_envio)}</TableCell>
                  <TableCell className="text-sm">{formatDt(p.data_resposta)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex gap-1 justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        title="Copiar link"
                        onClick={() => copiarLinkComAviso(`${BASE_URL}/pesquisa/clima?token=${p.token}`)}
                      >
                        <Copy className="h-3.5 w-3.5" />
                      </Button>
                      {p.status === "pendente" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          title="Reenviar convite"
                          onClick={() => reenviarMutation.mutate(p)}
                        >
                          <Send className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Modal adicionar */}
      <Dialog open={addOpen} onOpenChange={(open) => { setAddOpen(open); if (!open) resetAddForm(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar participante</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {/* Combobox de colaborador */}
            <div>
              <Label className="text-sm font-medium">Colaborador</Label>
              {selectedFunc ? (
                <div className="mt-1.5 flex items-center justify-between gap-2 px-3 py-2 rounded-md border bg-muted/40">
                  <div>
                    <p className="text-sm font-medium">{selectedFunc.nome_completo}</p>
                    <p className="text-xs text-muted-foreground">
                      {selectedFunc.cargo_atual}{selectedFunc.setor_atual ? ` · ${selectedFunc.setor_atual}` : ""}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSelectedFunc(null); setFuncSearch(""); }}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="relative mt-1.5">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar colaborador..."
                    value={funcSearch}
                    onChange={(e) => { setFuncSearch(e.target.value); setDropdownOpen(true); }}
                    onFocus={() => setDropdownOpen(true)}
                    className="pl-9"
                  />
                  {dropdownOpen && funcSearch && (
                    <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-md max-h-52 overflow-y-auto">
                      {funcFiltered.length === 0 ? (
                        <div className="px-3 py-4 text-sm text-center text-muted-foreground">
                          Nenhum colaborador encontrado
                        </div>
                      ) : (
                        funcFiltered.map((f: any) => (
                          <button
                            key={f.id}
                            type="button"
                            className="w-full text-left px-3 py-2 hover:bg-muted transition-colors"
                            onClick={() => {
                              setSelectedFunc(f);
                              setFuncSearch("");
                              setDropdownOpen(false);
                            }}
                          >
                            <p className="text-sm font-medium">{f.nome_completo}</p>
                            <p className="text-xs text-muted-foreground">
                              {f.cargo_atual}{f.setor_atual ? ` · ${f.setor_atual}` : ""}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Campos preenchidos automaticamente */}
            {selectedFunc && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs text-muted-foreground">Unidade</Label>
                  <p className="text-sm mt-0.5">{selectedFunc.cidade || "—"}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Setor</Label>
                  <p className="text-sm mt-0.5">{selectedFunc.setor_atual || "—"}</p>
                </div>
              </div>
            )}

            {/* Turno — único campo editável */}
            <div>
              <Label className="text-sm font-medium">Turno (opcional)</Label>
              <Input
                className="mt-1.5"
                placeholder="Ex: Manhã, Tarde, Noite..."
                value={turno}
                onChange={(e) => setTurno(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="mt-2">
            <Button variant="outline" onClick={() => { setAddOpen(false); resetAddForm(); }}>
              Cancelar
            </Button>
            <Button
              onClick={() => adicionarMutation.mutate()}
              disabled={!selectedFunc || adicionarMutation.isPending}
            >
              {adicionarMutation.isPending ? "Adicionando..." : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
