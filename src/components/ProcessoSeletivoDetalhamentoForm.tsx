import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, X } from "lucide-react";

interface ProcessoSeletivoDetalhamentoFormProps {
  processo: any;
}

export function ProcessoSeletivoDetalhamentoForm({
  processo,
}: ProcessoSeletivoDetalhamentoFormProps) {
  const queryClient = useQueryClient();
  const [competencias, setCompetencias] = useState<string[]>([]);
  const [novaCompetencia, setNovaCompetencia] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  const form = useForm({
    defaultValues: {
      descricao_vaga: "",
      responsabilidades: "",
      faixa_salarial_minima: "",
      faixa_salarial_maxima: "",
      beneficios: "",
    },
  });

  useEffect(() => {
    if (processo) {
      form.reset({
        descricao_vaga: processo.descricao_vaga || "",
        responsabilidades: processo.responsabilidades || "",
        faixa_salarial_minima: processo.faixa_salarial_minima || "",
        faixa_salarial_maxima: processo.faixa_salarial_maxima || "",
        beneficios: processo.beneficios || "",
      });
      setCompetencias(
        Array.isArray(processo.competencias_necessarias)
          ? processo.competencias_necessarias
          : []
      );
    }
  }, [processo]);

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const { error } = await supabase
        .from("processos_seletivos")
        .update({
          descricao_vaga: values.descricao_vaga,
          responsabilidades: values.responsabilidades,
          faixa_salarial_minima: values.faixa_salarial_minima || null,
          faixa_salarial_maxima: values.faixa_salarial_maxima || null,
          beneficios: values.beneficios,
          competencias_necessarias: competencias,
        })
        .eq("id", processo.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["processo-seletivo", processo.id] });
      toast.success("Detalhamento da vaga atualizado com sucesso");
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast.error(error?.message || "Erro ao atualizar detalhamento");
    },
  });

  const handleAddCompetencia = () => {
    if (novaCompetencia.trim()) {
      setCompetencias([...competencias, novaCompetencia.trim()]);
      setNovaCompetencia("");
    }
  };

  const handleRemoveCompetencia = (index: number) => {
    setCompetencias(competencias.filter((_, i) => i !== index));
  };

  const onSubmit = form.handleSubmit((values) => {
    mutation.mutate(values);
  });

  const hasData =
    processo.descricao_vaga ||
    processo.responsabilidades ||
    processo.faixa_salarial_minima ||
    processo.faixa_salarial_maxima ||
    processo.beneficios ||
    (processo.competencias_necessarias && processo.competencias_necessarias.length > 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Detalhamento da Vaga</CardTitle>
        {!isEditing ? (
          <Button onClick={() => setIsEditing(true)}>
            {hasData ? "Editar" : "Preencher"}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {!isEditing && !hasData ? (
          <p className="text-muted-foreground text-center py-8">
            Nenhum detalhamento cadastrado. Clique em "Preencher" para adicionar informações da vaga.
          </p>
        ) : !isEditing ? (
          <div className="space-y-6">
            {processo.descricao_vaga && (
              <div>
                <h3 className="font-semibold mb-2">Descrição da Vaga</h3>
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {processo.descricao_vaga}
                </p>
              </div>
            )}

            {processo.responsabilidades && (
              <div>
                <h3 className="font-semibold mb-2">Principais Responsabilidades</h3>
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {processo.responsabilidades}
                </p>
              </div>
            )}

            {(processo.faixa_salarial_minima || processo.faixa_salarial_maxima) && (
              <div>
                <h3 className="font-semibold mb-2">Faixa Salarial</h3>
                <p className="text-muted-foreground">
                  {processo.faixa_salarial_minima && processo.faixa_salarial_maxima
                    ? `R$ ${parseFloat(processo.faixa_salarial_minima).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })} - R$ ${parseFloat(processo.faixa_salarial_maxima).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}`
                    : processo.faixa_salarial_minima
                    ? `A partir de R$ ${parseFloat(processo.faixa_salarial_minima).toLocaleString(
                        "pt-BR",
                        { minimumFractionDigits: 2 }
                      )}`
                    : `Até R$ ${parseFloat(processo.faixa_salarial_maxima).toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}`}
                </p>
              </div>
            )}

            {processo.beneficios && (
              <div>
                <h3 className="font-semibold mb-2">Benefícios</h3>
                <p className="whitespace-pre-wrap text-muted-foreground">
                  {processo.beneficios}
                </p>
              </div>
            )}

            {processo.competencias_necessarias && processo.competencias_necessarias.length > 0 && (
              <div>
                <h3 className="font-semibold mb-2">Competências Necessárias</h3>
                <div className="flex flex-wrap gap-2">
                  {processo.competencias_necessarias.map((comp: string, idx: number) => (
                    <Badge key={idx} variant="secondary">
                      {comp}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="descricao_vaga">Descrição da Vaga</Label>
              <Textarea
                id="descricao_vaga"
                {...form.register("descricao_vaga")}
                placeholder="Descreva a vaga, o contexto e o que se espera do profissional..."
                className="min-h-[100px]"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsabilidades">Principais Responsabilidades</Label>
              <Textarea
                id="responsabilidades"
                {...form.register("responsabilidades")}
                placeholder="Liste as principais atividades e responsabilidades do cargo..."
                className="min-h-[100px]"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="faixa_salarial_minima">Faixa Salarial Mínima</Label>
                <Input
                  id="faixa_salarial_minima"
                  type="number"
                  step="0.01"
                  {...form.register("faixa_salarial_minima")}
                  placeholder="0.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="faixa_salarial_maxima">Faixa Salarial Máxima</Label>
                <Input
                  id="faixa_salarial_maxima"
                  type="number"
                  step="0.01"
                  {...form.register("faixa_salarial_maxima")}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="beneficios">Benefícios</Label>
              <Textarea
                id="beneficios"
                {...form.register("beneficios")}
                placeholder="Vale alimentação, vale transporte, plano de saúde..."
                className="min-h-[80px]"
              />
            </div>

            <div className="space-y-2">
              <Label>Competências Necessárias</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Digite uma competência e pressione Enter ou clique em Adicionar"
                  value={novaCompetencia}
                  onChange={(e) => setNovaCompetencia(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleAddCompetencia();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleAddCompetencia}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              {competencias.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {competencias.map((comp, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {comp}
                      <button
                        type="button"
                        onClick={() => handleRemoveCompetencia(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  form.reset();
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? "Salvando..." : "Salvar"}
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
