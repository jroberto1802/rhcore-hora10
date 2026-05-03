export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      advertencias: {
        Row: {
          created_at: string
          data_ocorrencia: string
          dias_penalidade: number | null
          empresa_id: string
          funcionario_id: string
          id: string
          motivo_penalidade: string
          observacoes: string | null
          tipo_ocorrencia: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_ocorrencia: string
          dias_penalidade?: number | null
          empresa_id: string
          funcionario_id: string
          id?: string
          motivo_penalidade: string
          observacoes?: string | null
          tipo_ocorrencia: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_ocorrencia?: string
          dias_penalidade?: number | null
          empresa_id?: string
          funcionario_id?: string
          id?: string
          motivo_penalidade?: string
          observacoes?: string | null
          tipo_ocorrencia?: string
          updated_at?: string
        }
        Relationships: []
      }
      alteracoes_salariais: {
        Row: {
          cargo_anterior: string | null
          created_at: string
          data_alteracao: string
          empresa_id: string
          funcionario_id: string
          id: string
          motivo: string
          novo_cargo: string | null
          novo_salario: number
          observacoes: string | null
          salario_anterior: number | null
          updated_at: string
        }
        Insert: {
          cargo_anterior?: string | null
          created_at?: string
          data_alteracao: string
          empresa_id: string
          funcionario_id: string
          id?: string
          motivo: string
          novo_cargo?: string | null
          novo_salario: number
          observacoes?: string | null
          salario_anterior?: number | null
          updated_at?: string
        }
        Update: {
          cargo_anterior?: string | null
          created_at?: string
          data_alteracao?: string
          empresa_id?: string
          funcionario_id?: string
          id?: string
          motivo?: string
          novo_cargo?: string | null
          novo_salario?: number
          observacoes?: string | null
          salario_anterior?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      asos: {
        Row: {
          clinica: string | null
          created_at: string
          crm_medico: string | null
          data_emissao: string
          data_validade: string | null
          empresa_id: string
          funcionario_id: string
          id: string
          medico_responsavel: string | null
          observacoes: string | null
          resultado: string | null
          status: string | null
          tipo_aso: string
          updated_at: string
        }
        Insert: {
          clinica?: string | null
          created_at?: string
          crm_medico?: string | null
          data_emissao: string
          data_validade?: string | null
          empresa_id: string
          funcionario_id: string
          id?: string
          medico_responsavel?: string | null
          observacoes?: string | null
          resultado?: string | null
          status?: string | null
          tipo_aso: string
          updated_at?: string
        }
        Update: {
          clinica?: string | null
          created_at?: string
          crm_medico?: string | null
          data_emissao?: string
          data_validade?: string | null
          empresa_id?: string
          funcionario_id?: string
          id?: string
          medico_responsavel?: string | null
          observacoes?: string | null
          resultado?: string | null
          status?: string | null
          tipo_aso?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "asos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asos_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "asos_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_limited"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_logs: {
        Row: {
          campo: string
          created_at: string
          empresa_id: string
          id: string
          registro_id: string
          tabela: string
          usuario_id: string | null
          usuario_nome: string | null
          valor_anterior: string | null
          valor_novo: string | null
        }
        Insert: {
          campo: string
          created_at?: string
          empresa_id: string
          id?: string
          registro_id: string
          tabela: string
          usuario_id?: string | null
          usuario_nome?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Update: {
          campo?: string
          created_at?: string
          empresa_id?: string
          id?: string
          registro_id?: string
          tabela?: string
          usuario_id?: string | null
          usuario_nome?: string | null
          valor_anterior?: string | null
          valor_novo?: string | null
        }
        Relationships: []
      }
      ausencias: {
        Row: {
          atestado_medico: boolean
          created_at: string
          data_fim: string | null
          data_inicio: string
          empresa_id: string
          funcionario_id: string
          id: string
          justificada: boolean
          observacoes: string | null
          tipo_ausencia: string
          updated_at: string
        }
        Insert: {
          atestado_medico?: boolean
          created_at?: string
          data_fim?: string | null
          data_inicio: string
          empresa_id: string
          funcionario_id: string
          id?: string
          justificada?: boolean
          observacoes?: string | null
          tipo_ausencia: string
          updated_at?: string
        }
        Update: {
          atestado_medico?: boolean
          created_at?: string
          data_fim?: string | null
          data_inicio?: string
          empresa_id?: string
          funcionario_id?: string
          id?: string
          justificada?: boolean
          observacoes?: string | null
          tipo_ausencia?: string
          updated_at?: string
        }
        Relationships: []
      }
      avaliacoes_desempenho: {
        Row: {
          avaliado_id: string
          avaliador_id: string
          cargo_avaliado: string
          created_at: string
          data_avaliacao: string
          desempenho_medio_ponderado: number | null
          empresa_id: string
          id: string
          potencial: Database["public"]["Enums"]["potencial_colaborador"]
          updated_at: string
        }
        Insert: {
          avaliado_id: string
          avaliador_id: string
          cargo_avaliado: string
          created_at?: string
          data_avaliacao: string
          desempenho_medio_ponderado?: number | null
          empresa_id: string
          id?: string
          potencial: Database["public"]["Enums"]["potencial_colaborador"]
          updated_at?: string
        }
        Update: {
          avaliado_id?: string
          avaliador_id?: string
          cargo_avaliado?: string
          created_at?: string
          data_avaliacao?: string
          desempenho_medio_ponderado?: number | null
          empresa_id?: string
          id?: string
          potencial?: Database["public"]["Enums"]["potencial_colaborador"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_avaliacoes_avaliado"
            columns: ["avaliado_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_avaliacoes_avaliado"
            columns: ["avaliado_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_limited"
            referencedColumns: ["id"]
          },
        ]
      }
      candidatos: {
        Row: {
          bairro: string | null
          cep: string | null
          cidade: string | null
          complemento: string | null
          contato_whatsapp: string | null
          cpf: string | null
          created_at: string
          curriculo_url: string | null
          empresa_id: string
          formacao: string | null
          funcoes: string[] | null
          id: string
          logradouro: string | null
          nome_completo: string
          uf: string | null
          updated_at: string
        }
        Insert: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          contato_whatsapp?: string | null
          cpf?: string | null
          created_at?: string
          curriculo_url?: string | null
          empresa_id: string
          formacao?: string | null
          funcoes?: string[] | null
          id?: string
          logradouro?: string | null
          nome_completo: string
          uf?: string | null
          updated_at?: string
        }
        Update: {
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          complemento?: string | null
          contato_whatsapp?: string | null
          cpf?: string | null
          created_at?: string
          curriculo_url?: string | null
          empresa_id?: string
          formacao?: string | null
          funcoes?: string[] | null
          id?: string
          logradouro?: string | null
          nome_completo?: string
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      cargos: {
        Row: {
          atividades_responsabilidades: string | null
          cbo: string | null
          competencias_exigidas: string | null
          created_at: string
          descricao_cargo: string | null
          empresa_id: string
          grau: string | null
          id: string
          nivel: string
          nome: string
          nome_completo_cargo: string
          posicao_hierarquica: string | null
          requisitos: string | null
          salario: number
          sistemas_acessos: string | null
          tipo_cargo: string
          updated_at: string
        }
        Insert: {
          atividades_responsabilidades?: string | null
          cbo?: string | null
          competencias_exigidas?: string | null
          created_at?: string
          descricao_cargo?: string | null
          empresa_id: string
          grau?: string | null
          id?: string
          nivel: string
          nome: string
          nome_completo_cargo: string
          posicao_hierarquica?: string | null
          requisitos?: string | null
          salario: number
          sistemas_acessos?: string | null
          tipo_cargo: string
          updated_at?: string
        }
        Update: {
          atividades_responsabilidades?: string | null
          cbo?: string | null
          competencias_exigidas?: string | null
          created_at?: string
          descricao_cargo?: string | null
          empresa_id?: string
          grau?: string | null
          id?: string
          nivel?: string
          nome?: string
          nome_completo_cargo?: string
          posicao_hierarquica?: string | null
          requisitos?: string | null
          salario?: number
          sistemas_acessos?: string | null
          tipo_cargo?: string
          updated_at?: string
        }
        Relationships: []
      }
      colaboradores_terceirizados: {
        Row: {
          area_atuacao: string | null
          bairro: string | null
          cargo: string | null
          cep: string | null
          cidade: string | null
          contato_emergencia_nome: string | null
          contato_emergencia_telefone: string | null
          cpf: string | null
          created_at: string
          data_nascimento: string | null
          email: string | null
          empresa_id: string
          endereco: string | null
          foto_url: string | null
          id: string
          nome_completo: string
          numero_endereco: string | null
          rg: string | null
          status: string
          supervisor_id: string | null
          telefone: string | null
          terceirizado_id: string
          uf: string | null
          updated_at: string
        }
        Insert: {
          area_atuacao?: string | null
          bairro?: string | null
          cargo?: string | null
          cep?: string | null
          cidade?: string | null
          contato_emergencia_nome?: string | null
          contato_emergencia_telefone?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          empresa_id: string
          endereco?: string | null
          foto_url?: string | null
          id?: string
          nome_completo: string
          numero_endereco?: string | null
          rg?: string | null
          status?: string
          supervisor_id?: string | null
          telefone?: string | null
          terceirizado_id: string
          uf?: string | null
          updated_at?: string
        }
        Update: {
          area_atuacao?: string | null
          bairro?: string | null
          cargo?: string | null
          cep?: string | null
          cidade?: string | null
          contato_emergencia_nome?: string | null
          contato_emergencia_telefone?: string | null
          cpf?: string | null
          created_at?: string
          data_nascimento?: string | null
          email?: string | null
          empresa_id?: string
          endereco?: string | null
          foto_url?: string | null
          id?: string
          nome_completo?: string
          numero_endereco?: string | null
          rg?: string | null
          status?: string
          supervisor_id?: string | null
          telefone?: string | null
          terceirizado_id?: string
          uf?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      competencias: {
        Row: {
          created_at: string
          descricao: string | null
          empresa_id: string
          id: string
          nome: string
          tipo: Database["public"]["Enums"]["tipo_competencia"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          empresa_id: string
          id?: string
          nome: string
          tipo: Database["public"]["Enums"]["tipo_competencia"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          tipo?: Database["public"]["Enums"]["tipo_competencia"]
          updated_at?: string
        }
        Relationships: []
      }
      competencias_avaliadas: {
        Row: {
          avaliacao_id: string
          competencia_id: string
          created_at: string
          id: string
          nivel_importancia: Database["public"]["Enums"]["nivel_importancia_enum"]
          nota: number
          observacao: string | null
          peso: number
          pontuacao_ponderada: number
          updated_at: string
        }
        Insert: {
          avaliacao_id: string
          competencia_id: string
          created_at?: string
          id?: string
          nivel_importancia: Database["public"]["Enums"]["nivel_importancia_enum"]
          nota: number
          observacao?: string | null
          peso: number
          pontuacao_ponderada: number
          updated_at?: string
        }
        Update: {
          avaliacao_id?: string
          competencia_id?: string
          created_at?: string
          id?: string
          nivel_importancia?: Database["public"]["Enums"]["nivel_importancia_enum"]
          nota?: number
          observacao?: string | null
          peso?: number
          pontuacao_ponderada?: number
          updated_at?: string
        }
        Relationships: []
      }
      criterios_evolucao: {
        Row: {
          competencia_id: string | null
          created_at: string
          descricao: string | null
          etapa_id: string
          id: string
          nota_minima: number | null
          tipo_criterio: string
          treinamento_id: string | null
        }
        Insert: {
          competencia_id?: string | null
          created_at?: string
          descricao?: string | null
          etapa_id: string
          id?: string
          nota_minima?: number | null
          tipo_criterio: string
          treinamento_id?: string | null
        }
        Update: {
          competencia_id?: string | null
          created_at?: string
          descricao?: string | null
          etapa_id?: string
          id?: string
          nota_minima?: number | null
          tipo_criterio?: string
          treinamento_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "criterios_evolucao_competencia_id_fkey"
            columns: ["competencia_id"]
            isOneToOne: false
            referencedRelation: "competencias"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "criterios_evolucao_etapa_id_fkey"
            columns: ["etapa_id"]
            isOneToOne: false
            referencedRelation: "trilha_carreira_etapas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "criterios_evolucao_treinamento_id_fkey"
            columns: ["treinamento_id"]
            isOneToOne: false
            referencedRelation: "treinamentos_cargo"
            referencedColumns: ["id"]
          },
        ]
      }
      demissoes: {
        Row: {
          created_at: string
          data_demissao: string
          documento_url: string | null
          empresa_id: string
          funcionario_id: string
          id: string
          motivo_desligamento: string
          observacoes: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_demissao: string
          documento_url?: string | null
          empresa_id: string
          funcionario_id: string
          id?: string
          motivo_desligamento: string
          observacoes?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_demissao?: string
          documento_url?: string | null
          empresa_id?: string
          funcionario_id?: string
          id?: string
          motivo_desligamento?: string
          observacoes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      documentos_colaboradores_terceirizados: {
        Row: {
          colaborador_id: string
          created_at: string
          data_vigencia_fim: string | null
          data_vigencia_inicio: string | null
          documento_url: string | null
          empresa_id: string
          id: string
          nome_documento: string
          observacao: string | null
          situacao: string
          status_valido: boolean
          tipo: string
          updated_at: string
        }
        Insert: {
          colaborador_id: string
          created_at?: string
          data_vigencia_fim?: string | null
          data_vigencia_inicio?: string | null
          documento_url?: string | null
          empresa_id: string
          id?: string
          nome_documento: string
          observacao?: string | null
          situacao?: string
          status_valido?: boolean
          tipo: string
          updated_at?: string
        }
        Update: {
          colaborador_id?: string
          created_at?: string
          data_vigencia_fim?: string | null
          data_vigencia_inicio?: string | null
          documento_url?: string | null
          empresa_id?: string
          id?: string
          nome_documento?: string
          observacao?: string | null
          situacao?: string
          status_valido?: boolean
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_documentos_colaboradores_terceirizados_colaborador"
            columns: ["colaborador_id"]
            isOneToOne: false
            referencedRelation: "colaboradores_terceirizados"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_exigidos_cargo: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome_documento: string
          seguranca_cargo_id: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome_documento: string
          seguranca_cargo_id: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome_documento?: string
          seguranca_cargo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_exigidos_cargo_seguranca_cargo_id_fkey"
            columns: ["seguranca_cargo_id"]
            isOneToOne: false
            referencedRelation: "seguranca_trabalho_cargo"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_padrao: {
        Row: {
          categoria: Database["public"]["Enums"]["documento_padrao_categoria"]
          created_at: string
          empresa_id: string
          id: string
          nome_documento: string
          observacao: string | null
          tipo: string
          tipo_aplicacao: Database["public"]["Enums"]["documento_padrao_tipo_aplicacao"]
          updated_at: string
        }
        Insert: {
          categoria: Database["public"]["Enums"]["documento_padrao_categoria"]
          created_at?: string
          empresa_id: string
          id?: string
          nome_documento: string
          observacao?: string | null
          tipo: string
          tipo_aplicacao: Database["public"]["Enums"]["documento_padrao_tipo_aplicacao"]
          updated_at?: string
        }
        Update: {
          categoria?: Database["public"]["Enums"]["documento_padrao_categoria"]
          created_at?: string
          empresa_id?: string
          id?: string
          nome_documento?: string
          observacao?: string | null
          tipo?: string
          tipo_aplicacao?: Database["public"]["Enums"]["documento_padrao_tipo_aplicacao"]
          updated_at?: string
        }
        Relationships: []
      }
      documentos_terceirizados: {
        Row: {
          created_at: string
          data_vigencia_fim: string | null
          data_vigencia_inicio: string | null
          documento_url: string | null
          empresa_id: string
          id: string
          nome_documento: string
          observacao: string | null
          situacao: string
          status_valido: boolean
          terceirizado_id: string
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_vigencia_fim?: string | null
          data_vigencia_inicio?: string | null
          documento_url?: string | null
          empresa_id: string
          id?: string
          nome_documento: string
          observacao?: string | null
          situacao?: string
          status_valido?: boolean
          terceirizado_id: string
          tipo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_vigencia_fim?: string | null
          data_vigencia_inicio?: string | null
          documento_url?: string | null
          empresa_id?: string
          id?: string
          nome_documento?: string
          observacao?: string | null
          situacao?: string
          status_valido?: boolean
          terceirizado_id?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      empresas: {
        Row: {
          ativo: boolean
          cnpj: string | null
          created_at: string
          fantasia: string
          grupo_empresarial_id: string
          id: string
          logo_url: string | null
          razao_social: string | null
          updated_at: string
        }
        Insert: {
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          fantasia: string
          grupo_empresarial_id: string
          id?: string
          logo_url?: string | null
          razao_social?: string | null
          updated_at?: string
        }
        Update: {
          ativo?: boolean
          cnpj?: string | null
          created_at?: string
          fantasia?: string
          grupo_empresarial_id?: string
          id?: string
          logo_url?: string | null
          razao_social?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "empresas_grupo_empresarial_id_fkey"
            columns: ["grupo_empresarial_id"]
            isOneToOne: false
            referencedRelation: "grupos_empresariais"
            referencedColumns: ["id"]
          },
        ]
      }
      entrevistas: {
        Row: {
          candidato_id: string
          created_at: string
          data_entrevista: string
          empresa_id: string
          id: string
          observacao: string | null
          processo_seletivo_id: string
          status: string
          updated_at: string
        }
        Insert: {
          candidato_id: string
          created_at?: string
          data_entrevista: string
          empresa_id: string
          id?: string
          observacao?: string | null
          processo_seletivo_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          candidato_id?: string
          created_at?: string
          data_entrevista?: string
          empresa_id?: string
          id?: string
          observacao?: string | null
          processo_seletivo_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "entrevistas_candidato_id_fkey"
            columns: ["candidato_id"]
            isOneToOne: false
            referencedRelation: "candidatos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "entrevistas_processo_seletivo_id_fkey"
            columns: ["processo_seletivo_id"]
            isOneToOne: false
            referencedRelation: "processos_seletivos"
            referencedColumns: ["id"]
          },
        ]
      }
      epis_cargo: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome_epi: string
          obrigatorio: boolean
          seguranca_cargo_id: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome_epi: string
          obrigatorio?: boolean
          seguranca_cargo_id: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome_epi?: string
          obrigatorio?: boolean
          seguranca_cargo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "epis_cargo_seguranca_cargo_id_fkey"
            columns: ["seguranca_cargo_id"]
            isOneToOne: false
            referencedRelation: "seguranca_trabalho_cargo"
            referencedColumns: ["id"]
          },
        ]
      }
      exames: {
        Row: {
          clinica: string | null
          created_at: string
          data_realizacao: string
          data_validade: string | null
          empresa_id: string
          funcionario_id: string
          id: string
          nome_exame: string
          observacoes: string | null
          renovado: boolean
          resultado: string | null
          updated_at: string
        }
        Insert: {
          clinica?: string | null
          created_at?: string
          data_realizacao: string
          data_validade?: string | null
          empresa_id: string
          funcionario_id: string
          id?: string
          nome_exame: string
          observacoes?: string | null
          renovado?: boolean
          resultado?: string | null
          updated_at?: string
        }
        Update: {
          clinica?: string | null
          created_at?: string
          data_realizacao?: string
          data_validade?: string | null
          empresa_id?: string
          funcionario_id?: string
          id?: string
          nome_exame?: string
          observacoes?: string | null
          renovado?: boolean
          resultado?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      exames_aso: {
        Row: {
          aso_id: string
          created_at: string
          data_realizacao: string
          data_validade: string | null
          empresa_id: string
          id: string
          nome_exame: string
          observacoes: string | null
          resultado: string | null
          updated_at: string
        }
        Insert: {
          aso_id: string
          created_at?: string
          data_realizacao: string
          data_validade?: string | null
          empresa_id: string
          id?: string
          nome_exame: string
          observacoes?: string | null
          resultado?: string | null
          updated_at?: string
        }
        Update: {
          aso_id?: string
          created_at?: string
          data_realizacao?: string
          data_validade?: string | null
          empresa_id?: string
          id?: string
          nome_exame?: string
          observacoes?: string | null
          resultado?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exames_aso_aso_id_fkey"
            columns: ["aso_id"]
            isOneToOne: false
            referencedRelation: "asos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exames_aso_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      exames_cargo: {
        Row: {
          cargo_id: string
          created_at: string
          empresa_id: string
          id: string
          nome_exame: string
          obrigatorio: boolean
          observacao: string | null
          periodicidade_meses: number
          updated_at: string
        }
        Insert: {
          cargo_id: string
          created_at?: string
          empresa_id: string
          id?: string
          nome_exame: string
          obrigatorio?: boolean
          observacao?: string | null
          periodicidade_meses?: number
          updated_at?: string
        }
        Update: {
          cargo_id?: string
          created_at?: string
          empresa_id?: string
          id?: string
          nome_exame?: string
          obrigatorio?: boolean
          observacao?: string | null
          periodicidade_meses?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "exames_cargo_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exames_cargo_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      exames_cargo_eventos: {
        Row: {
          created_at: string
          empresa_id: string
          exame_cargo_id: string
          id: string
          tipo_evento: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          exame_cargo_id: string
          id?: string
          tipo_evento: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          exame_cargo_id?: string
          id?: string
          tipo_evento?: string
        }
        Relationships: [
          {
            foreignKeyName: "exames_cargo_eventos_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "exames_cargo_eventos_exame_cargo_id_fkey"
            columns: ["exame_cargo_id"]
            isOneToOne: false
            referencedRelation: "exames_cargo"
            referencedColumns: ["id"]
          },
        ]
      }
      ferias: {
        Row: {
          created_at: string
          data_limite: string | null
          empresa_id: string
          ferias_concluidas: boolean
          funcionario_id: string
          id: string
          observacoes: string | null
          periodo_aquisitivo_fim: string | null
          periodo_aquisitivo_inicio: string | null
          previsao: boolean
          updated_at: string
          valor_ferias: number | null
        }
        Insert: {
          created_at?: string
          data_limite?: string | null
          empresa_id: string
          ferias_concluidas?: boolean
          funcionario_id: string
          id?: string
          observacoes?: string | null
          periodo_aquisitivo_fim?: string | null
          periodo_aquisitivo_inicio?: string | null
          previsao?: boolean
          updated_at?: string
          valor_ferias?: number | null
        }
        Update: {
          created_at?: string
          data_limite?: string | null
          empresa_id?: string
          ferias_concluidas?: boolean
          funcionario_id?: string
          id?: string
          observacoes?: string | null
          periodo_aquisitivo_fim?: string | null
          periodo_aquisitivo_inicio?: string | null
          previsao?: boolean
          updated_at?: string
          valor_ferias?: number | null
        }
        Relationships: []
      }
      folha_pagamento: {
        Row: {
          adicionais: number
          ajuda_custo: number
          ano: number
          auxilio_transporte: number
          cargo: string | null
          created_at: string
          empresa_id: string
          faltas: number
          funcionario_id: string
          horas_extras: number
          id: string
          mes: number
          observacoes: string | null
          produtividade: number
          salario_base: number
          total: number
          total_liquido: number | null
          updated_at: string
          vale_transporte: boolean
          valor_horas_extras: number
        }
        Insert: {
          adicionais?: number
          ajuda_custo?: number
          ano: number
          auxilio_transporte?: number
          cargo?: string | null
          created_at?: string
          empresa_id: string
          faltas?: number
          funcionario_id: string
          horas_extras?: number
          id?: string
          mes: number
          observacoes?: string | null
          produtividade?: number
          salario_base?: number
          total?: number
          total_liquido?: number | null
          updated_at?: string
          vale_transporte?: boolean
          valor_horas_extras?: number
        }
        Update: {
          adicionais?: number
          ajuda_custo?: number
          ano?: number
          auxilio_transporte?: number
          cargo?: string | null
          created_at?: string
          empresa_id?: string
          faltas?: number
          funcionario_id?: string
          horas_extras?: number
          id?: string
          mes?: number
          observacoes?: string | null
          produtividade?: number
          salario_base?: number
          total?: number
          total_liquido?: number | null
          updated_at?: string
          vale_transporte?: boolean
          valor_horas_extras?: number
        }
        Relationships: [
          {
            foreignKeyName: "folha_pagamento_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folha_pagamento_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "folha_pagamento_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_limited"
            referencedColumns: ["id"]
          },
        ]
      }
      fornecedores: {
        Row: {
          agencia: string | null
          banco: string | null
          chave_pix: string | null
          cnpj_cpf: string | null
          conta: string | null
          created_at: string
          email: string | null
          empresa_id: string
          id: string
          nome: string
          pessoa_contato: string | null
          telefone: string | null
          tipo_fornecedor: string
          updated_at: string
        }
        Insert: {
          agencia?: string | null
          banco?: string | null
          chave_pix?: string | null
          cnpj_cpf?: string | null
          conta?: string | null
          created_at?: string
          email?: string | null
          empresa_id: string
          id?: string
          nome: string
          pessoa_contato?: string | null
          telefone?: string | null
          tipo_fornecedor: string
          updated_at?: string
        }
        Update: {
          agencia?: string | null
          banco?: string | null
          chave_pix?: string | null
          cnpj_cpf?: string | null
          conta?: string | null
          created_at?: string
          email?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          pessoa_contato?: string | null
          telefone?: string | null
          tipo_fornecedor?: string
          updated_at?: string
        }
        Relationships: []
      }
      funcionarios: {
        Row: {
          agencia: string | null
          area_atuacao: string | null
          bairro: string | null
          banco: string | null
          cargo_atual: string | null
          cep: string | null
          chave_pix: string | null
          cidade: string | null
          codigo: string
          cpf: string | null
          created_at: string
          ctps: string | null
          data_admissao: string | null
          data_demissao: string | null
          data_nascimento: string | null
          email: string | null
          email_corporativo: string | null
          empresa_id: string
          endereco: string | null
          fardamento: string | null
          foto_url: string | null
          genero: string | null
          id: string
          nome_abreviado: string | null
          nome_completo: string
          nome_contato_emergencia: string | null
          numero_conta: string | null
          numero_endereco: string | null
          pcd: boolean | null
          pis: string | null
          recebe_vale_alimentacao: boolean | null
          recebe_vale_transporte: boolean | null
          rg: string | null
          salario_atual: number | null
          serie: string | null
          setor_atual: string | null
          telefone: string | null
          telefone_emergencia: string | null
          tipo_cargo: string | null
          tipo_conta: string | null
          tipo_contrato: string | null
          tipo_sanguineo: string | null
          uf: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          agencia?: string | null
          area_atuacao?: string | null
          bairro?: string | null
          banco?: string | null
          cargo_atual?: string | null
          cep?: string | null
          chave_pix?: string | null
          cidade?: string | null
          codigo: string
          cpf?: string | null
          created_at?: string
          ctps?: string | null
          data_admissao?: string | null
          data_demissao?: string | null
          data_nascimento?: string | null
          email?: string | null
          email_corporativo?: string | null
          empresa_id: string
          endereco?: string | null
          fardamento?: string | null
          foto_url?: string | null
          genero?: string | null
          id?: string
          nome_abreviado?: string | null
          nome_completo: string
          nome_contato_emergencia?: string | null
          numero_conta?: string | null
          numero_endereco?: string | null
          pcd?: boolean | null
          pis?: string | null
          recebe_vale_alimentacao?: boolean | null
          recebe_vale_transporte?: boolean | null
          rg?: string | null
          salario_atual?: number | null
          serie?: string | null
          setor_atual?: string | null
          telefone?: string | null
          telefone_emergencia?: string | null
          tipo_cargo?: string | null
          tipo_conta?: string | null
          tipo_contrato?: string | null
          tipo_sanguineo?: string | null
          uf?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          agencia?: string | null
          area_atuacao?: string | null
          bairro?: string | null
          banco?: string | null
          cargo_atual?: string | null
          cep?: string | null
          chave_pix?: string | null
          cidade?: string | null
          codigo?: string
          cpf?: string | null
          created_at?: string
          ctps?: string | null
          data_admissao?: string | null
          data_demissao?: string | null
          data_nascimento?: string | null
          email?: string | null
          email_corporativo?: string | null
          empresa_id?: string
          endereco?: string | null
          fardamento?: string | null
          foto_url?: string | null
          genero?: string | null
          id?: string
          nome_abreviado?: string | null
          nome_completo?: string
          nome_contato_emergencia?: string | null
          numero_conta?: string | null
          numero_endereco?: string | null
          pcd?: boolean | null
          pis?: string | null
          recebe_vale_alimentacao?: boolean | null
          recebe_vale_transporte?: boolean | null
          rg?: string | null
          salario_atual?: number | null
          serie?: string | null
          setor_atual?: string | null
          telefone?: string | null
          telefone_emergencia?: string | null
          tipo_cargo?: string | null
          tipo_conta?: string | null
          tipo_contrato?: string | null
          tipo_sanguineo?: string | null
          uf?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      grupos_empresariais: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          logo_url: string | null
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          updated_at?: string
        }
        Relationships: []
      }
      mapeamento_competencias_cargos: {
        Row: {
          cargo_id: string
          competencia_id: string
          created_at: string
          empresa_id: string
          id: string
          nivel_importancia: Database["public"]["Enums"]["nivel_importancia_enum"]
          peso: number
          updated_at: string
        }
        Insert: {
          cargo_id: string
          competencia_id: string
          created_at?: string
          empresa_id: string
          id?: string
          nivel_importancia: Database["public"]["Enums"]["nivel_importancia_enum"]
          peso: number
          updated_at?: string
        }
        Update: {
          cargo_id?: string
          competencia_id?: string
          created_at?: string
          empresa_id?: string
          id?: string
          nivel_importancia?: Database["public"]["Enums"]["nivel_importancia_enum"]
          peso?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_mapeamento_cargo"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_mapeamento_competencia"
            columns: ["competencia_id"]
            isOneToOne: false
            referencedRelation: "competencias"
            referencedColumns: ["id"]
          },
        ]
      }
      nrs_aplicaveis: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nr: string
          seguranca_cargo_id: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nr: string
          seguranca_cargo_id: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nr?: string
          seguranca_cargo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "nrs_aplicaveis_seguranca_cargo_id_fkey"
            columns: ["seguranca_cargo_id"]
            isOneToOne: false
            referencedRelation: "seguranca_trabalho_cargo"
            referencedColumns: ["id"]
          },
        ]
      }
      ocorrencias: {
        Row: {
          anexo_url: string | null
          created_at: string
          data_ocorrencia: string
          descricao: string
          empresa_id: string
          funcionario_id: string
          id: string
          tipo_ocorrencia: string
          updated_at: string
          usuario_responsavel_id: string
        }
        Insert: {
          anexo_url?: string | null
          created_at?: string
          data_ocorrencia: string
          descricao: string
          empresa_id: string
          funcionario_id: string
          id?: string
          tipo_ocorrencia: string
          updated_at?: string
          usuario_responsavel_id: string
        }
        Update: {
          anexo_url?: string | null
          created_at?: string
          data_ocorrencia?: string
          descricao?: string
          empresa_id?: string
          funcionario_id?: string
          id?: string
          tipo_ocorrencia?: string
          updated_at?: string
          usuario_responsavel_id?: string
        }
        Relationships: []
      }
      ocorrencias_gerais: {
        Row: {
          created_at: string
          criado_por_id: string | null
          criado_por_nome: string | null
          data: string
          descricao: string
          empresa_id: string
          id: string
          observacoes: string | null
          tipo_ocorrencia: string
          titulo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          criado_por_id?: string | null
          criado_por_nome?: string | null
          data: string
          descricao: string
          empresa_id: string
          id?: string
          observacoes?: string | null
          tipo_ocorrencia: string
          titulo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          criado_por_id?: string | null
          criado_por_nome?: string | null
          data?: string
          descricao?: string
          empresa_id?: string
          id?: string
          observacoes?: string | null
          tipo_ocorrencia?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ocorrencias_gerais_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      pagamentos_fornecedores: {
        Row: {
          competencia: string | null
          created_at: string
          custo_mao_obra: number | null
          custo_materiais: number | null
          data_emissao: string | null
          data_execucao: string | null
          data_vencimento: string | null
          descricao_servico: string | null
          empresa_id: string
          equipamento_area: string | null
          forma_pagamento: string | null
          fornecedor_id: string | null
          fornecedor_nome: string | null
          id: string
          nota_fiscal: boolean | null
          observacoes: string | null
          periodo_fornecimento_fim: string | null
          periodo_fornecimento_inicio: string | null
          periodo_referencia: string | null
          produto: string | null
          quantidade: number | null
          recibo_nome: string | null
          recibo_url: string | null
          status: string
          tipo_despesa: string | null
          tipo_pagamento: string | null
          tipo_servico: string | null
          updated_at: string
          valor_contratado: number | null
          valor_pago: number | null
          valor_total: number
          valor_unitario: number | null
        }
        Insert: {
          competencia?: string | null
          created_at?: string
          custo_mao_obra?: number | null
          custo_materiais?: number | null
          data_emissao?: string | null
          data_execucao?: string | null
          data_vencimento?: string | null
          descricao_servico?: string | null
          empresa_id: string
          equipamento_area?: string | null
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          fornecedor_nome?: string | null
          id?: string
          nota_fiscal?: boolean | null
          observacoes?: string | null
          periodo_fornecimento_fim?: string | null
          periodo_fornecimento_inicio?: string | null
          periodo_referencia?: string | null
          produto?: string | null
          quantidade?: number | null
          recibo_nome?: string | null
          recibo_url?: string | null
          status?: string
          tipo_despesa?: string | null
          tipo_pagamento?: string | null
          tipo_servico?: string | null
          updated_at?: string
          valor_contratado?: number | null
          valor_pago?: number | null
          valor_total?: number
          valor_unitario?: number | null
        }
        Update: {
          competencia?: string | null
          created_at?: string
          custo_mao_obra?: number | null
          custo_materiais?: number | null
          data_emissao?: string | null
          data_execucao?: string | null
          data_vencimento?: string | null
          descricao_servico?: string | null
          empresa_id?: string
          equipamento_area?: string | null
          forma_pagamento?: string | null
          fornecedor_id?: string | null
          fornecedor_nome?: string | null
          id?: string
          nota_fiscal?: boolean | null
          observacoes?: string | null
          periodo_fornecimento_fim?: string | null
          periodo_fornecimento_inicio?: string | null
          periodo_referencia?: string | null
          produto?: string | null
          quantidade?: number | null
          recibo_nome?: string | null
          recibo_url?: string | null
          status?: string
          tipo_despesa?: string | null
          tipo_pagamento?: string | null
          tipo_servico?: string | null
          updated_at?: string
          valor_contratado?: number | null
          valor_pago?: number | null
          valor_total?: number
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "pagamentos_fornecedores_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "fornecedores"
            referencedColumns: ["id"]
          },
        ]
      }
      perfis_acesso: {
        Row: {
          created_at: string
          descricao: string | null
          empresa_id: string
          id: string
          is_system: boolean
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          empresa_id: string
          id?: string
          is_system?: boolean
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          id?: string
          is_system?: boolean
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "perfis_acesso_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      periodos_gozo_ferias: {
        Row: {
          created_at: string
          data_fim: string
          data_inicio: string
          ferias_id: string
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_fim: string
          data_inicio: string
          ferias_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_fim?: string
          data_inicio?: string
          ferias_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "periodos_gozo_ferias_ferias_id_fkey"
            columns: ["ferias_id"]
            isOneToOne: false
            referencedRelation: "ferias"
            referencedColumns: ["id"]
          },
        ]
      }
      permissoes_perfil: {
        Row: {
          codigo_permissao: string
          created_at: string
          id: string
          perfil_id: string
        }
        Insert: {
          codigo_permissao: string
          created_at?: string
          id?: string
          perfil_id: string
        }
        Update: {
          codigo_permissao?: string
          created_at?: string
          id?: string
          perfil_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "permissoes_perfil_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis_acesso"
            referencedColumns: ["id"]
          },
        ]
      }
      planos_acao_desempenho: {
        Row: {
          avaliacao_id: string | null
          competencias: Json | null
          created_at: string
          empresa_id: string
          funcionario_id: string
          id: string
          observacoes: string | null
          prazo: string
          responsavel: string
          status: string
          updated_at: string
        }
        Insert: {
          avaliacao_id?: string | null
          competencias?: Json | null
          created_at?: string
          empresa_id: string
          funcionario_id: string
          id?: string
          observacoes?: string | null
          prazo: string
          responsavel: string
          status?: string
          updated_at?: string
        }
        Update: {
          avaliacao_id?: string | null
          competencias?: Json | null
          created_at?: string
          empresa_id?: string
          funcionario_id?: string
          id?: string
          observacoes?: string | null
          prazo?: string
          responsavel?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "planos_acao_desempenho_avaliacao_id_fkey"
            columns: ["avaliacao_id"]
            isOneToOne: false
            referencedRelation: "avaliacoes_desempenho"
            referencedColumns: ["id"]
          },
        ]
      }
      processos_seletivos: {
        Row: {
          beneficios: string | null
          cargo_id: string | null
          competencias_necessarias: string[] | null
          created_at: string
          data_final: string | null
          data_inicio: string
          descricao_vaga: string | null
          empresa_id: string
          faixa_salarial_maxima: number | null
          faixa_salarial_minima: number | null
          id: string
          nome_processo: string | null
          observacoes: string | null
          quantidade_vagas: number
          responsabilidades: string | null
          solicitante: string | null
          status: string | null
          tipo: string
          turno_vaga: string
          updated_at: string
        }
        Insert: {
          beneficios?: string | null
          cargo_id?: string | null
          competencias_necessarias?: string[] | null
          created_at?: string
          data_final?: string | null
          data_inicio: string
          descricao_vaga?: string | null
          empresa_id: string
          faixa_salarial_maxima?: number | null
          faixa_salarial_minima?: number | null
          id?: string
          nome_processo?: string | null
          observacoes?: string | null
          quantidade_vagas: number
          responsabilidades?: string | null
          solicitante?: string | null
          status?: string | null
          tipo: string
          turno_vaga: string
          updated_at?: string
        }
        Update: {
          beneficios?: string | null
          cargo_id?: string | null
          competencias_necessarias?: string[] | null
          created_at?: string
          data_final?: string | null
          data_inicio?: string
          descricao_vaga?: string | null
          empresa_id?: string
          faixa_salarial_maxima?: number | null
          faixa_salarial_minima?: number | null
          id?: string
          nome_processo?: string | null
          observacoes?: string | null
          quantidade_vagas?: number
          responsabilidades?: string | null
          solicitante?: string | null
          status?: string | null
          tipo?: string
          turno_vaga?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "processos_seletivos_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          id: string
          nome: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          nome: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          nome?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      riscos_ocupacionais: {
        Row: {
          created_at: string
          grupo: string
          id: string
          medidas_controle: string | null
          possiveis_lesoes: string | null
          risco: string
          seguranca_cargo_id: string
        }
        Insert: {
          created_at?: string
          grupo: string
          id?: string
          medidas_controle?: string | null
          possiveis_lesoes?: string | null
          risco: string
          seguranca_cargo_id: string
        }
        Update: {
          created_at?: string
          grupo?: string
          id?: string
          medidas_controle?: string | null
          possiveis_lesoes?: string | null
          risco?: string
          seguranca_cargo_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "riscos_ocupacionais_seguranca_cargo_id_fkey"
            columns: ["seguranca_cargo_id"]
            isOneToOne: false
            referencedRelation: "seguranca_trabalho_cargo"
            referencedColumns: ["id"]
          },
        ]
      }
      roteiros_entrevista: {
        Row: {
          created_at: string
          criador_id: string | null
          empresa_id: string
          id: string
          nome_roteiro: string
          perguntas: Json | null
          processo_seletivo_id: string
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          criador_id?: string | null
          empresa_id: string
          id?: string
          nome_roteiro: string
          perguntas?: Json | null
          processo_seletivo_id: string
          tipo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          criador_id?: string | null
          empresa_id?: string
          id?: string
          nome_roteiro?: string
          perguntas?: Json | null
          processo_seletivo_id?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "roteiros_entrevista_processo_seletivo_id_fkey"
            columns: ["processo_seletivo_id"]
            isOneToOne: false
            referencedRelation: "processos_seletivos"
            referencedColumns: ["id"]
          },
        ]
      }
      seguranca_trabalho_cargo: {
        Row: {
          cargo_id: string
          created_at: string
          empresa_id: string
          id: string
          updated_at: string
        }
        Insert: {
          cargo_id: string
          created_at?: string
          empresa_id: string
          id?: string
          updated_at?: string
        }
        Update: {
          cargo_id?: string
          created_at?: string
          empresa_id?: string
          id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seguranca_trabalho_cargo_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: true
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "seguranca_trabalho_cargo_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      terceirizados: {
        Row: {
          area_atuacao: string | null
          bairro: string | null
          cep: string | null
          cidade: string | null
          cnpj: string | null
          contato_responsavel_email: string | null
          contato_responsavel_nome: string | null
          contato_responsavel_telefone: string | null
          contato_rh_email: string | null
          contato_rh_nome: string | null
          contato_rh_telefone: string | null
          contrato_url: string | null
          created_at: string
          empresa_id: string
          endereco: string | null
          id: string
          logo_url: string | null
          nome_fantasia: string
          numero_endereco: string | null
          razao_social: string
          situacao: string
          uf: string | null
          updated_at: string
          vigencia_fim: string | null
          vigencia_inicio: string | null
        }
        Insert: {
          area_atuacao?: string | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          contato_responsavel_email?: string | null
          contato_responsavel_nome?: string | null
          contato_responsavel_telefone?: string | null
          contato_rh_email?: string | null
          contato_rh_nome?: string | null
          contato_rh_telefone?: string | null
          contrato_url?: string | null
          created_at?: string
          empresa_id: string
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nome_fantasia: string
          numero_endereco?: string | null
          razao_social: string
          situacao?: string
          uf?: string | null
          updated_at?: string
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Update: {
          area_atuacao?: string | null
          bairro?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string | null
          contato_responsavel_email?: string | null
          contato_responsavel_nome?: string | null
          contato_responsavel_telefone?: string | null
          contato_rh_email?: string | null
          contato_rh_nome?: string | null
          contato_rh_telefone?: string | null
          contrato_url?: string | null
          created_at?: string
          empresa_id?: string
          endereco?: string | null
          id?: string
          logo_url?: string | null
          nome_fantasia?: string
          numero_endereco?: string | null
          razao_social?: string
          situacao?: string
          uf?: string | null
          updated_at?: string
          vigencia_fim?: string | null
          vigencia_inicio?: string | null
        }
        Relationships: []
      }
      treinamentos: {
        Row: {
          created_at: string
          data_inicio: string | null
          data_termino: string | null
          duracao: number | null
          empresa_id: string
          fornecedor: string | null
          funcionario_id: string
          id: string
          investimento: number | null
          local: string | null
          observacoes: string | null
          renovado: boolean
          titulo_treinamento: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          data_inicio?: string | null
          data_termino?: string | null
          duracao?: number | null
          empresa_id: string
          fornecedor?: string | null
          funcionario_id: string
          id?: string
          investimento?: number | null
          local?: string | null
          observacoes?: string | null
          renovado?: boolean
          titulo_treinamento: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          data_inicio?: string | null
          data_termino?: string | null
          duracao?: number | null
          empresa_id?: string
          fornecedor?: string | null
          funcionario_id?: string
          id?: string
          investimento?: number | null
          local?: string | null
          observacoes?: string | null
          renovado?: boolean
          titulo_treinamento?: string
          updated_at?: string
        }
        Relationships: []
      }
      treinamentos_cargo: {
        Row: {
          cargo_id: string
          created_at: string
          empresa_id: string
          id: string
          nome_treinamento: string
          norma: string | null
          obrigatorio: boolean
          observacao: string | null
          periodicidade_meses: number
          updated_at: string
        }
        Insert: {
          cargo_id: string
          created_at?: string
          empresa_id: string
          id?: string
          nome_treinamento: string
          norma?: string | null
          obrigatorio?: boolean
          observacao?: string | null
          periodicidade_meses?: number
          updated_at?: string
        }
        Update: {
          cargo_id?: string
          created_at?: string
          empresa_id?: string
          id?: string
          nome_treinamento?: string
          norma?: string | null
          obrigatorio?: boolean
          observacao?: string | null
          periodicidade_meses?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treinamentos_cargo_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treinamentos_cargo_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      treinamentos_funcionario: {
        Row: {
          carga_horaria: number | null
          certificado_url: string | null
          created_at: string
          data_realizacao: string
          data_validade: string | null
          empresa_id: string
          funcionario_id: string
          id: string
          instrutor: string | null
          nome_treinamento: string
          norma: string | null
          observacoes: string | null
          status: string | null
          updated_at: string
        }
        Insert: {
          carga_horaria?: number | null
          certificado_url?: string | null
          created_at?: string
          data_realizacao: string
          data_validade?: string | null
          empresa_id: string
          funcionario_id: string
          id?: string
          instrutor?: string | null
          nome_treinamento: string
          norma?: string | null
          observacoes?: string | null
          status?: string | null
          updated_at?: string
        }
        Update: {
          carga_horaria?: number | null
          certificado_url?: string | null
          created_at?: string
          data_realizacao?: string
          data_validade?: string | null
          empresa_id?: string
          funcionario_id?: string
          id?: string
          instrutor?: string | null
          nome_treinamento?: string
          norma?: string | null
          observacoes?: string | null
          status?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "treinamentos_funcionario_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treinamentos_funcionario_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "treinamentos_funcionario_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_limited"
            referencedColumns: ["id"]
          },
        ]
      }
      trilha_carreira: {
        Row: {
          created_at: string
          descricao: string | null
          empresa_id: string
          id: string
          nome: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          empresa_id: string
          id?: string
          nome: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          empresa_id?: string
          id?: string
          nome?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trilha_carreira_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      trilha_carreira_etapas: {
        Row: {
          cargo_id: string
          created_at: string
          id: string
          ordem: number
          tempo_minimo_meses: number | null
          tipo_progressao: string
          trilha_id: string
        }
        Insert: {
          cargo_id: string
          created_at?: string
          id?: string
          ordem?: number
          tempo_minimo_meses?: number | null
          tipo_progressao?: string
          trilha_id: string
        }
        Update: {
          cargo_id?: string
          created_at?: string
          id?: string
          ordem?: number
          tempo_minimo_meses?: number | null
          tipo_progressao?: string
          trilha_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trilha_carreira_etapas_cargo_id_fkey"
            columns: ["cargo_id"]
            isOneToOne: false
            referencedRelation: "cargos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "trilha_carreira_etapas_trilha_id_fkey"
            columns: ["trilha_id"]
            isOneToOne: false
            referencedRelation: "trilha_carreira"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      usuarios_empresas: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_empresas_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      usuarios_perfis: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          perfil_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          perfil_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          perfil_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "usuarios_perfis_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "usuarios_perfis_perfil_id_fkey"
            columns: ["perfil_id"]
            isOneToOne: false
            referencedRelation: "perfis_acesso"
            referencedColumns: ["id"]
          },
        ]
      }
      vale_alimentacao: {
        Row: {
          ano: number
          created_at: string
          data_deposito: string | null
          empresa_id: string
          funcionario_id: string
          id: string
          mes: number
          numero_cartao: string | null
          observacoes: string | null
          updated_at: string
          valor: number
        }
        Insert: {
          ano: number
          created_at?: string
          data_deposito?: string | null
          empresa_id: string
          funcionario_id: string
          id?: string
          mes: number
          numero_cartao?: string | null
          observacoes?: string | null
          updated_at?: string
          valor?: number
        }
        Update: {
          ano?: number
          created_at?: string
          data_deposito?: string | null
          empresa_id?: string
          funcionario_id?: string
          id?: string
          mes?: number
          numero_cartao?: string | null
          observacoes?: string | null
          updated_at?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "vale_alimentacao_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vale_alimentacao_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vale_alimentacao_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_limited"
            referencedColumns: ["id"]
          },
        ]
      }
      vale_alimentacao_modelo_recibo: {
        Row: {
          created_at: string
          empresa_id: string
          id: string
          modelo_texto: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          empresa_id: string
          id?: string
          modelo_texto: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          empresa_id?: string
          id?: string
          modelo_texto?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "vale_alimentacao_modelo_recibo_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: true
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      vale_transporte: {
        Row: {
          ano: number
          cidade: string | null
          created_at: string
          dias_uteis: number
          empresa_id: string
          funcionario_id: string
          id: string
          is_recarga_adicional: boolean | null
          mes: number
          numero_cartao: string | null
          observacoes: string | null
          salario_base: number | null
          saldo_atual_cartao: number
          selecionado: boolean
          updated_at: string
          valor_dia: number
          valor_manual: boolean
          valor_recarregar_manual: number | null
        }
        Insert: {
          ano: number
          cidade?: string | null
          created_at?: string
          dias_uteis?: number
          empresa_id: string
          funcionario_id: string
          id?: string
          is_recarga_adicional?: boolean | null
          mes: number
          numero_cartao?: string | null
          observacoes?: string | null
          salario_base?: number | null
          saldo_atual_cartao?: number
          selecionado?: boolean
          updated_at?: string
          valor_dia?: number
          valor_manual?: boolean
          valor_recarregar_manual?: number | null
        }
        Update: {
          ano?: number
          cidade?: string | null
          created_at?: string
          dias_uteis?: number
          empresa_id?: string
          funcionario_id?: string
          id?: string
          is_recarga_adicional?: boolean | null
          mes?: number
          numero_cartao?: string | null
          observacoes?: string | null
          salario_base?: number | null
          saldo_atual_cartao?: number
          selecionado?: boolean
          updated_at?: string
          valor_dia?: number
          valor_manual?: boolean
          valor_recarregar_manual?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vale_transporte_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vale_transporte_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vale_transporte_funcionario_id_fkey"
            columns: ["funcionario_id"]
            isOneToOne: false
            referencedRelation: "funcionarios_limited"
            referencedColumns: ["id"]
          },
        ]
      }
      vale_transporte_cidades: {
        Row: {
          cidade: string
          created_at: string
          empresa_id: string
          id: string
          observacoes: string | null
          updated_at: string
          valor_diario: number
        }
        Insert: {
          cidade: string
          created_at?: string
          empresa_id: string
          id?: string
          observacoes?: string | null
          updated_at?: string
          valor_diario?: number
        }
        Update: {
          cidade?: string
          created_at?: string
          empresa_id?: string
          id?: string
          observacoes?: string | null
          updated_at?: string
          valor_diario?: number
        }
        Relationships: [
          {
            foreignKeyName: "vale_transporte_cidades_empresa_id_fkey"
            columns: ["empresa_id"]
            isOneToOne: false
            referencedRelation: "empresas"
            referencedColumns: ["id"]
          },
        ]
      }
      vale_transporte_observacoes_gerais: {
        Row: {
          ano: number
          created_at: string
          empresa_id: string
          id: string
          mes: number
          observacoes: string | null
          updated_at: string
        }
        Insert: {
          ano: number
          created_at?: string
          empresa_id: string
          id?: string
          mes: number
          observacoes?: string | null
          updated_at?: string
        }
        Update: {
          ano?: number
          created_at?: string
          empresa_id?: string
          id?: string
          mes?: number
          observacoes?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      funcionarios_limited: {
        Row: {
          agencia: string | null
          bairro: string | null
          banco: string | null
          cargo_atual: string | null
          cep: string | null
          chave_pix: string | null
          cidade: string | null
          codigo: string | null
          cpf: string | null
          created_at: string | null
          ctps: string | null
          data_admissao: string | null
          data_demissao: string | null
          data_nascimento: string | null
          email: string | null
          empresa_id: string | null
          endereco: string | null
          foto_url: string | null
          genero: string | null
          id: string | null
          nome_abreviado: string | null
          nome_completo: string | null
          nome_contato_emergencia: string | null
          numero_conta: string | null
          numero_endereco: string | null
          pcd: boolean | null
          pis: string | null
          rg: string | null
          salario_atual: number | null
          serie: string | null
          setor_atual: string | null
          telefone: string | null
          telefone_emergencia: string | null
          tipo_cargo: string | null
          tipo_conta: string | null
          tipo_contrato: string | null
          tipo_sanguineo: string | null
          uf: string | null
          updated_at: string | null
        }
        Insert: {
          agencia?: never
          bairro?: never
          banco?: never
          cargo_atual?: string | null
          cep?: never
          chave_pix?: never
          cidade?: never
          codigo?: string | null
          cpf?: never
          created_at?: string | null
          ctps?: never
          data_admissao?: string | null
          data_demissao?: string | null
          data_nascimento?: never
          email?: never
          empresa_id?: string | null
          endereco?: never
          foto_url?: string | null
          genero?: never
          id?: string | null
          nome_abreviado?: string | null
          nome_completo?: string | null
          nome_contato_emergencia?: never
          numero_conta?: never
          numero_endereco?: never
          pcd?: boolean | null
          pis?: never
          rg?: never
          salario_atual?: never
          serie?: never
          setor_atual?: string | null
          telefone?: never
          telefone_emergencia?: never
          tipo_cargo?: string | null
          tipo_conta?: never
          tipo_contrato?: string | null
          tipo_sanguineo?: never
          uf?: never
          updated_at?: string | null
        }
        Update: {
          agencia?: never
          bairro?: never
          banco?: never
          cargo_atual?: string | null
          cep?: never
          chave_pix?: never
          cidade?: never
          codigo?: string | null
          cpf?: never
          created_at?: string | null
          ctps?: never
          data_admissao?: string | null
          data_demissao?: string | null
          data_nascimento?: never
          email?: never
          empresa_id?: string | null
          endereco?: never
          foto_url?: string | null
          genero?: never
          id?: string | null
          nome_abreviado?: string | null
          nome_completo?: string | null
          nome_contato_emergencia?: never
          numero_conta?: never
          numero_endereco?: never
          pcd?: boolean | null
          pis?: never
          rg?: never
          salario_atual?: never
          serie?: never
          setor_atual?: string | null
          telefone?: never
          telefone_emergencia?: never
          tipo_cargo?: string | null
          tipo_conta?: never
          tipo_contrato?: string | null
          tipo_sanguineo?: never
          uf?: never
          updated_at?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      can_view_sensitive_data: {
        Args: { _empresa_id: string; _user_id: string }
        Returns: boolean
      }
      funcionarios_safe: {
        Args: never
        Returns: {
          agencia: string
          area_atuacao: string
          bairro: string
          banco: string
          cargo_atual: string
          cep: string
          chave_pix: string
          cidade: string
          codigo: string
          cpf: string
          created_at: string
          ctps: string
          data_admissao: string
          data_demissao: string
          data_nascimento: string
          email: string
          email_corporativo: string
          empresa_id: string
          endereco: string
          fardamento: string
          foto_url: string
          genero: string
          id: string
          nome_abreviado: string
          nome_completo: string
          nome_contato_emergencia: string
          numero_conta: string
          numero_endereco: string
          pcd: boolean
          pis: string
          recebe_vale_alimentacao: boolean
          recebe_vale_transporte: boolean
          rg: string
          salario_atual: number
          serie: string
          setor_atual: string
          telefone: string
          telefone_emergencia: string
          tipo_cargo: string
          tipo_conta: string
          tipo_contrato: string
          tipo_sanguineo: string
          uf: string
          updated_at: string
        }[]
      }
      get_user_permissions: {
        Args: { _empresa_id: string; _user_id: string }
        Returns: {
          codigo_permissao: string
        }[]
      }
      has_permission: {
        Args: {
          _codigo_permissao: string
          _empresa_id: string
          _user_id: string
        }
        Returns: boolean
      }
      has_role: {
        Args: {
          _empresa_id: string
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_super_admin: {
        Args: { _empresa_id: string; _user_id: string }
        Returns: boolean
      }
      limpar_audit_logs_antigos: { Args: never; Returns: undefined }
    }
    Enums: {
      app_role: "admin" | "hr_manager" | "employee"
      documento_padrao_categoria: "Geral" | "Anual" | "Mensal"
      documento_padrao_tipo_aplicacao: "terceirizado" | "colaborador"
      nivel_importancia_enum: "Baixa" | "Média" | "Alta" | "Muito Alta"
      potencial_colaborador: "Alto" | "Médio" | "Baixo"
      tipo_competencia: "Individual" | "Equipe" | "Organizacional"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "hr_manager", "employee"],
      documento_padrao_categoria: ["Geral", "Anual", "Mensal"],
      documento_padrao_tipo_aplicacao: ["terceirizado", "colaborador"],
      nivel_importancia_enum: ["Baixa", "Média", "Alta", "Muito Alta"],
      potencial_colaborador: ["Alto", "Médio", "Baixo"],
      tipo_competencia: ["Individual", "Equipe", "Organizacional"],
    },
  },
} as const
