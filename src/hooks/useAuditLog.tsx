import { supabase } from '@/integrations/supabase/client';

const MAX_VALUE_LENGTH = 1000;

const truncateValue = (value: string | null): string | null => {
  if (value === null || value === undefined) return null;
  if (value.length > MAX_VALUE_LENGTH) {
    return value.substring(0, MAX_VALUE_LENGTH) + '...[truncado]';
  }
  return value;
};

interface AuditLogEntry {
  empresa_id: string;
  tabela: string;
  registro_id: string;
  campo: string;
  valor_anterior: string | null;
  valor_novo: string | null;
}

export function useAuditLog() {
  const logChanges = async (
    empresaId: string,
    tabela: string,
    registroId: string,
    oldData: Record<string, any>,
    newData: Record<string, any>,
    fieldsToTrack?: string[]
  ) => {
    try {
      // Buscar informações do usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Buscar nome do usuário
      const { data: profile } = await supabase
        .from('profiles')
        .select('nome')
        .eq('user_id', user.id)
        .single();

      const usuarioNome = profile?.nome || user.email || 'Usuário desconhecido';

      const logs: AuditLogEntry[] = [];
      const keysToCheck = fieldsToTrack || Object.keys(newData);

      for (const key of keysToCheck) {
        const oldValue = oldData[key];
        const newValue = newData[key];

        // Ignorar campos de sistema
        if (['id', 'created_at', 'updated_at', 'empresa_id'].includes(key)) continue;

        // Converter valores para string para comparação
        const oldStr = oldValue === null || oldValue === undefined ? null : String(oldValue);
        const newStr = newValue === null || newValue === undefined ? null : String(newValue);

        // Se houve mudança, registrar
        if (oldStr !== newStr) {
          logs.push({
            empresa_id: empresaId,
            tabela,
            registro_id: registroId,
            campo: key,
            valor_anterior: truncateValue(oldStr),
            valor_novo: truncateValue(newStr),
          });
        }
      }

      // Inserir logs se houver alterações
      if (logs.length > 0) {
        const logsWithUser = logs.map(log => ({
          ...log,
          usuario_id: user.id,
          usuario_nome: usuarioNome,
        }));

        const { error } = await supabase
          .from('audit_logs')
          .insert(logsWithUser);

        if (error) {
          console.error('Erro ao registrar logs de auditoria:', error);
        }
      }
    } catch (error) {
      console.error('Erro no hook useAuditLog:', error);
    }
  };

  const logSingleChange = async (
    empresaId: string,
    tabela: string,
    registroId: string,
    campo: string,
    valorAnterior: any,
    valorNovo: any
  ) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('nome')
        .eq('user_id', user.id)
        .single();

      const usuarioNome = profile?.nome || user.email || 'Usuário desconhecido';

      const { error } = await supabase
        .from('audit_logs')
        .insert({
          empresa_id: empresaId,
          tabela,
          registro_id: registroId,
          campo,
          valor_anterior: truncateValue(valorAnterior === null || valorAnterior === undefined ? null : String(valorAnterior)),
          valor_novo: truncateValue(valorNovo === null || valorNovo === undefined ? null : String(valorNovo)),
          usuario_id: user.id,
          usuario_nome: usuarioNome,
        });

      if (error) {
        console.error('Erro ao registrar log de auditoria:', error);
      }
    } catch (error) {
      console.error('Erro no hook useAuditLog:', error);
    }
  };

  return { logChanges, logSingleChange };
}
