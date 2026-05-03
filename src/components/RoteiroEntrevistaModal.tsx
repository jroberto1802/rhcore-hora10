import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface RoteiroEntrevistaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roteiro?: any;
  processoSeletivoId: string;
  empresaId: string;
}

export function RoteiroEntrevistaModal({
  open,
  onOpenChange,
  roteiro,
  processoSeletivoId,
  empresaId,
}: RoteiroEntrevistaModalProps) {
  const queryClient = useQueryClient();
  const [perguntas, setPerguntas] = useState<string[]>([]);
  const [novaPergunta, setNovaPergunta] = useState("");

  const form = useForm({
    defaultValues: {
      nome_roteiro: "",
      tipo: "",
    },
  });

  useEffect(() => {
    if (roteiro) {
      form.reset({
        nome_roteiro: roteiro.nome_roteiro || "",
        tipo: roteiro.tipo || "",
      });
      setPerguntas(
        Array.isArray(roteiro.perguntas) ? roteiro.perguntas : []
      );
    } else {
      form.reset({
        nome_roteiro: "",
        tipo: "",
      });
      setPerguntas([]);
    }
    setNovaPergunta("");
  }, [roteiro, open]);

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const data = {
        nome_roteiro: values.nome_roteiro,
        tipo: values.tipo,
        perguntas: perguntas,
        processo_seletivo_id: processoSeletivoId,
        empresa_id: empresaId,
        criador_id: (await supabase.auth.getUser()).data.user?.id,
      };

      if (roteiro) {
        const { error } = await supabase
          .from("roteiros_entrevista")
          .update(data)
          .eq("id", roteiro.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("roteiros_entrevista")
          .insert([data]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roteiros", processoSeletivoId] });
      toast.success(
        roteiro ? "Roteiro atualizado com sucesso" : "Roteiro criado com sucesso"
      );
      onOpenChange(false);
      form.reset();
      setPerguntas([]);
    },
    onError: (error: any) => {
      toast.error(error?.message || "Erro ao salvar roteiro");
    },
  });

  const handleAddPergunta = () => {
    if (novaPergunta.trim()) {
      setPerguntas([...perguntas, novaPergunta.trim()]);
      setNovaPergunta("");
    }
  };

  const handleRemovePergunta = (index: number) => {
    setPerguntas(perguntas.filter((_, i) => i !== index));
  };

  const onSubmit = form.handleSubmit((values) => {
    if (perguntas.length === 0) {
      toast.error("Adicione pelo menos uma pergunta ao roteiro");
      return;
    }
    mutation.mutate(values);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {roteiro ? "Editar Roteiro" : "Novo Roteiro de Entrevista"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome_roteiro">Nome do Roteiro</Label>
            <Input
              id="nome_roteiro"
              {...form.register("nome_roteiro", { required: true })}
              placeholder="Ex: Roteiro para Desenvolvedor Sênior"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de Entrevista</Label>
            <Select
              value={form.watch("tipo")}
              onValueChange={(value) => form.setValue("tipo", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Técnico">Técnico</SelectItem>
                <SelectItem value="RH">RH</SelectItem>
                <SelectItem value="Comportamental">Comportamental</SelectItem>
                <SelectItem value="Líder">Líder</SelectItem>
                <SelectItem value="Cultura">Cultura</SelectItem>
                <SelectItem value="Case">Case</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Perguntas ({perguntas.length})</Label>
            <div className="flex gap-2">
              <Textarea
                placeholder="Digite uma pergunta e pressione Enter ou clique em Adicionar"
                value={novaPergunta}
                onChange={(e) => setNovaPergunta(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAddPergunta();
                  }
                }}
                className="min-h-[60px]"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleAddPergunta}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>

            {perguntas.length > 0 && (
              <div className="space-y-2 mt-4 p-4 border rounded-lg bg-muted/30">
                {perguntas.map((pergunta, index) => (
                  <div
                    key={index}
                    className="flex items-start gap-2 p-2 bg-background rounded border"
                  >
                    <span className="text-sm flex-1">
                      {index + 1}. {pergunta}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => handleRemovePergunta(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
