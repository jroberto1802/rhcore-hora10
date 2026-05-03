import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserEmpresas } from "@/hooks/useUserEmpresas";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus, Check, ChevronsUpDown } from "lucide-react";
import { CandidatoModal } from "./CandidatoModal";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import removeAccents from "remove-accents";

interface EntrevistaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entrevista?: any;
  processoSeletivoId: string;
  empresaId: string;
}

export function EntrevistaModal({
  open,
  onOpenChange,
  entrevista,
  processoSeletivoId,
  empresaId,
}: EntrevistaModalProps) {
  const queryClient = useQueryClient();
  const [isCandidatoModalOpen, setIsCandidatoModalOpen] = useState(false);
  const [openCombobox, setOpenCombobox] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const form = useForm({
    defaultValues: {
      data_entrevista: "",
      horario_entrevista: "",
      candidato_id: "",
      observacao: "",
      status: "Aguardando",
    },
  });

  const { data: candidatos, isLoading: isLoadingCandidatos } = useQuery({
    queryKey: ["candidatos", empresaId],
    queryFn: async () => {
      if (!empresaId) return [];
      
      const { data, error } = await supabase
        .from("candidatos")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("nome_completo");

      if (error) throw error;
      return data || [];
    },
    enabled: !!empresaId,
  });

  useEffect(() => {
    if (entrevista) {
      const dataEntrevista = new Date(entrevista.data_entrevista);
      const dataFormatada = dataEntrevista.toISOString().split('T')[0];
      const horarioFormatado = dataEntrevista.toTimeString().slice(0, 5);
      
      form.reset({
        data_entrevista: dataFormatada,
        horario_entrevista: horarioFormatado,
        candidato_id: entrevista.candidato_id,
        observacao: entrevista.observacao || "",
        status: entrevista.status,
      });
    } else {
      form.reset({
        data_entrevista: "",
        horario_entrevista: "",
        candidato_id: "",
        observacao: "",
        status: "Aguardando",
      });
    }
  }, [entrevista, form]);

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      // Combinar data e horário em um timestamp
      const dataHora = `${values.data_entrevista}T${values.horario_entrevista}:00`;
      const dataEntrevistaTimestamp = new Date(dataHora).toISOString();
      
      const dataToSave = {
        data_entrevista: dataEntrevistaTimestamp,
        candidato_id: values.candidato_id,
        observacao: values.observacao,
        status: values.status,
      };
      
      if (entrevista) {
        const { error } = await supabase
          .from("entrevistas")
          .update(dataToSave)
          .eq("id", entrevista.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("entrevistas")
          .insert([{
            ...dataToSave,
            processo_seletivo_id: processoSeletivoId,
            empresa_id: empresaId,
          }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["entrevistas", processoSeletivoId] });
      queryClient.invalidateQueries({ queryKey: ["entrevistas"] });
      toast.success(
        entrevista
          ? "Entrevista atualizada com sucesso"
          : "Entrevista cadastrada com sucesso"
      );
      onOpenChange(false);
      form.reset();
    },
    onError: () => {
      toast.error("Erro ao salvar entrevista");
    },
  });

  const onSubmit = (values: any) => {
    mutation.mutate(values);
  };

  const handleCandidatoCreated = () => {
    queryClient.invalidateQueries({ queryKey: ["candidatos"] });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {entrevista ? "Editar" : "Nova"} Entrevista
            </DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="data_entrevista"
                  rules={{ required: "Data é obrigatória" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data da Entrevista</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="horario_entrevista"
                  rules={{ required: "Horário é obrigatório" }}
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horário</FormLabel>
                      <FormControl>
                        <Input type="time" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="candidato_id"
                rules={{ required: "Candidato é obrigatório" }}
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Candidato</FormLabel>
                    <div className="flex gap-2">
                      <Popover open={openCombobox} onOpenChange={setOpenCombobox}>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              role="combobox"
                              className={cn(
                                "flex-1 justify-between",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value
                                ? candidatos?.find(
                                    (candidato) => candidato.id === field.value
                                  )?.nome_completo
                                : "Buscar candidato..."}
                              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-[400px] p-0">
                          <Command shouldFilter={false}>
                            <CommandInput 
                              placeholder="Buscar candidato..." 
                              value={searchQuery}
                              onValueChange={setSearchQuery}
                            />
                            <CommandList>
                              {isLoadingCandidatos ? (
                                <div className="p-4 text-sm text-muted-foreground text-center">
                                  Carregando candidatos...
                                </div>
                              ) : (
                                <>
                                  <CommandEmpty>Nenhum candidato encontrado.</CommandEmpty>
                                  <CommandGroup className="max-h-[300px] overflow-auto">
                                    {(candidatos || [])
                                      .filter((candidato) => {
                                        if (!searchQuery) return true;
                                        
                                        const searchNormalized = removeAccents(searchQuery.toLowerCase());
                                        const nomeNormalized = removeAccents(candidato.nome_completo.toLowerCase());
                                        const cidadeNormalized = candidato.cidade 
                                          ? removeAccents(candidato.cidade.toLowerCase())
                                          : "";
                                        
                                        return nomeNormalized.includes(searchNormalized) || 
                                               cidadeNormalized.includes(searchNormalized);
                                      })
                                      .map((candidato) => (
                                      <CommandItem
                                        key={candidato.id}
                                        value={candidato.id}
                                        onSelect={() => {
                                          form.setValue("candidato_id", candidato.id);
                                          setOpenCombobox(false);
                                        }}
                                      >
                                        <Check
                                          className={cn(
                                            "mr-2 h-4 w-4",
                                            candidato.id === field.value
                                              ? "opacity-100"
                                              : "opacity-0"
                                          )}
                                        />
                                        <div className="flex flex-col">
                                          <span>{candidato.nome_completo}</span>
                                          {candidato.cidade && candidato.uf && (
                                            <span className="text-xs text-muted-foreground">
                                              {candidato.cidade} - {candidato.uf}
                                            </span>
                                          )}
                                        </div>
                                       </CommandItem>
                                    ))}
                                  </CommandGroup>
                                </>
                              )}
                            </CommandList>
                          </Command>
                        </PopoverContent>
                      </Popover>
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => setIsCandidatoModalOpen(true)}
                      >
                        <Plus className="w-4 h-4" />
                      </Button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                rules={{ required: "Status é obrigatório" }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
            <SelectContent>
              <SelectItem value="Aguardando">Aguardando</SelectItem>
              <SelectItem value="Entrevistar">Entrevistar</SelectItem>
              <SelectItem value="Em análise">Em análise</SelectItem>
              <SelectItem value="Aprovado">Aprovado</SelectItem>
              <SelectItem value="Reprovado">Reprovado</SelectItem>
              <SelectItem value="Desistente">Desistente</SelectItem>
              <SelectItem value="Contratado">Contratado</SelectItem>
            </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="observacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observação</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end gap-2">
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
          </Form>
        </DialogContent>
      </Dialog>

      <CandidatoModal
        open={isCandidatoModalOpen}
        onOpenChange={setIsCandidatoModalOpen}
        onSuccess={handleCandidatoCreated}
        empresaId={empresaId}
      />
    </>
  );
}
