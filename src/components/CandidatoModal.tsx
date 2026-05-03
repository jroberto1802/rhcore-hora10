import { useEffect, useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useUserEmpresas } from "@/hooks/useUserEmpresas";
import { useAuditLog } from "@/hooks/useAuditLog";
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
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import InputMask from "react-input-mask";
import { CurriculoUpload } from "./CurriculoUpload";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface CandidatoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  candidato?: any;
  onSuccess?: () => void;
  empresaId: string;
}

export function CandidatoModal({
  open,
  onOpenChange,
  candidato,
  onSuccess,
  empresaId,
}: CandidatoModalProps) {
  const queryClient = useQueryClient();
  const { logChanges } = useAuditLog();
  const [cepLoading, setCepLoading] = useState(false);
  const [funcaoInput, setFuncaoInput] = useState("");
  const originalDataRef = useRef<Record<string, any>>({});
  
  const form = useForm({
    defaultValues: {
      nome_completo: "",
      cpf: "",
      contato_whatsapp: "",
      curriculo_url: "",
      cep: "",
      logradouro: "",
      bairro: "",
      cidade: "",
      uf: "",
      complemento: "",
      formacao: "",
      funcoes: [],
    },
  });

  useEffect(() => {
    if (candidato) {
      const formDataToSet = {
        nome_completo: candidato.nome_completo || "",
        cpf: candidato.cpf || "",
        contato_whatsapp: candidato.contato_whatsapp || "",
        curriculo_url: candidato.curriculo_url || "",
        cep: candidato.cep || "",
        logradouro: candidato.logradouro || "",
        bairro: candidato.bairro || "",
        cidade: candidato.cidade || "",
        uf: candidato.uf || "",
        complemento: candidato.complemento || "",
        formacao: candidato.formacao || "",
        funcoes: Array.isArray(candidato.funcoes) ? candidato.funcoes : [],
      };
      form.reset(formDataToSet);
      originalDataRef.current = formDataToSet;
    } else {
      form.reset({
        nome_completo: "",
        cpf: "",
        contato_whatsapp: "",
        curriculo_url: "",
        cep: "",
        logradouro: "",
        bairro: "",
        cidade: "",
        uf: "",
        complemento: "",
        formacao: "",
        funcoes: [],
      });
    }
    setFuncaoInput("");
  }, [candidato, form]);

  const buscarCep = async (cep: string) => {
    const cepLimpo = cep.replace(/\D/g, "");
    if (cepLimpo.length !== 8) return;

    setCepLoading(true);
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cepLimpo}/json/`);
      const data = await response.json();

      if (!data.erro) {
        form.setValue("logradouro", data.logradouro || "");
        form.setValue("bairro", data.bairro || "");
        form.setValue("cidade", data.localidade || "");
        form.setValue("uf", data.uf || "");
      } else {
        toast.error("CEP não encontrado");
      }
    } catch (error) {
      toast.error("Erro ao buscar CEP");
    } finally {
      setCepLoading(false);
    }
  };

  const mutation = useMutation({
    mutationFn: async (values: any) => {
      const data = {
        nome_completo: values.nome_completo || "",
        cpf: values.cpf || "",
        contato_whatsapp: values.contato_whatsapp || "",
        curriculo_url: values.curriculo_url || "",
        cep: values.cep || "",
        logradouro: values.logradouro || "",
        bairro: values.bairro || "",
        cidade: values.cidade || "",
        uf: values.uf || "",
        complemento: values.complemento || "",
        formacao: values.formacao || "",
        funcoes: Array.isArray(values.funcoes) ? values.funcoes : [],
      };

      if (candidato) {
        const { error } = await supabase
          .from("candidatos")
          .update(data)
          .eq("id", candidato.id);
        if (error) throw error;
        
        // Registrar alterações no audit log
        await logChanges(
          empresaId,
          'candidatos',
          candidato.id,
          originalDataRef.current,
          data
        );
      } else {
        const { error } = await supabase
          .from("candidatos")
          .insert([{ ...data, empresa_id: empresaId }]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["candidatos"] });
      toast.success(
        candidato
          ? "Candidato atualizado com sucesso"
          : "Candidato cadastrado com sucesso"
      );
      onSuccess?.();
      onOpenChange(false);
      form.reset();
    },
    onError: (error: any) => {
      console.error("Erro ao salvar candidato:", error);
      toast.error(error?.message || "Erro ao salvar candidato");
    },
  });

  const onSubmit = (values: any) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {candidato ? "Editar" : "Novo"} Candidato
          </DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="nome_completo"
              rules={{ required: "Nome completo é obrigatório" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome Completo</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="cpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPF</FormLabel>
                    <FormControl>
                      <InputMask mask="999.999.999-99" {...field}>
                        {(inputProps: any) => <Input {...inputProps} />}
                      </InputMask>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contato_whatsapp"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contato WhatsApp</FormLabel>
                    <FormControl>
                      <InputMask mask="(99) 99999-9999" {...field}>
                        {(inputProps: any) => <Input {...inputProps} />}
                      </InputMask>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="formacao"
              rules={{ required: "Formação é obrigatória" }}
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Formação</FormLabel>
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
                      <SelectItem value="Fundamental Incompleto">Fundamental Incompleto</SelectItem>
                      <SelectItem value="Fundamental Completo">Fundamental Completo</SelectItem>
                      <SelectItem value="Médio Incompleto">Médio Incompleto</SelectItem>
                      <SelectItem value="Médio Completo">Médio Completo</SelectItem>
                      <SelectItem value="Superior Incompleto">Superior Incompleto</SelectItem>
                      <SelectItem value="Superior Completo">Superior Completo</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="funcoes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Funções que pode exercer</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Input
                          placeholder="Digite uma função e pressione Enter"
                          value={funcaoInput}
                          onChange={(e) => setFuncaoInput(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              const novaFuncao = funcaoInput.trim();
                              if (novaFuncao && !(field.value || []).includes(novaFuncao)) {
                                field.onChange([...(field.value || []), novaFuncao]);
                                setFuncaoInput("");
                              }
                            }
                          }}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => {
                            const novaFuncao = funcaoInput.trim();
                            if (novaFuncao && !(field.value || []).includes(novaFuncao)) {
                              field.onChange([...(field.value || []), novaFuncao]);
                              setFuncaoInput("");
                            }
                          }}
                        >
                          Adicionar
                        </Button>
                      </div>
                      {field.value && field.value.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {field.value.map((funcao: string, index: number) => (
                            <Badge key={index} variant="secondary" className="text-sm">
                              {funcao}
                              <button
                                type="button"
                                onClick={() => {
                                  const novasFuncoes = field.value.filter((_: string, i: number) => i !== index);
                                  field.onChange(novasFuncoes);
                                }}
                                className="ml-1 hover:text-destructive"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="curriculo_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Currículo</FormLabel>
                  <FormControl>
                    <CurriculoUpload
                      currentDocumentUrl={field.value}
                      onDocumentChange={field.onChange}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4">Endereço</h3>
              
              <div className="grid grid-cols-3 gap-4">
                <FormField
                  control={form.control}
                  name="cep"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>CEP</FormLabel>
                      <FormControl>
                        <InputMask
                          mask="99999-999"
                          {...field}
                          onBlur={(e) => {
                            field.onBlur();
                            buscarCep(e.target.value);
                          }}
                        >
                          {(inputProps: any) => <Input {...inputProps} />}
                        </InputMask>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="logradouro"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Logradouro</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={cepLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <FormField
                  control={form.control}
                  name="bairro"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Bairro</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={cepLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="cidade"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cidade</FormLabel>
                      <FormControl>
                        <Input {...field} disabled={cepLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 mt-4">
                <FormField
                  control={form.control}
                  name="uf"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>UF</FormLabel>
                      <FormControl>
                        <Input {...field} maxLength={2} disabled={cepLoading} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="complemento"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Complemento</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

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
  );
}
