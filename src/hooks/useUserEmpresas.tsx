import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

export interface Empresa {
  id: string;
  fantasia: string;
  razao_social: string | null;
  cnpj: string | null;
  logo_url: string | null;
  ativo: boolean;
  grupo_empresarial: {
    id: string;
    nome: string;
    descricao: string | null;
    logo_url: string | null;
  };
}

export const useUserEmpresas = () => {
  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    if (!user) {
      setEmpresas([]);
      setLoading(false);
      return;
    }

    const fetchEmpresas = async () => {
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
          .eq('user_id', user.id);

        if (error) {
          throw error;
        }

        const empresasFormatted = data?.map((item: any) => ({
          id: item.empresas.id,
          fantasia: item.empresas.fantasia,
          razao_social: item.empresas.razao_social,
          cnpj: item.empresas.cnpj,
          logo_url: item.empresas.logo_url,
          ativo: item.empresas.ativo,
          grupo_empresarial: {
            id: item.empresas.grupos_empresariais.id,
            nome: item.empresas.grupos_empresariais.nome,
            descricao: item.empresas.grupos_empresariais.descricao,
            logo_url: item.empresas.grupos_empresariais.logo_url,
          }
        }))
        .filter((empresa: Empresa) => empresa.ativo) || [];

        setEmpresas(empresasFormatted);
        setError(null);
      } catch (err) {
        console.error('Erro ao buscar empresas:', err);
        setError('Erro ao carregar empresas');
        setEmpresas([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEmpresas();
  }, [user]);

  return { empresas, loading, error };
};