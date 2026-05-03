
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Função para converter data do banco para o formato de input date (YYYY-MM-DD)
export function formatDateForInput(dateString?: string | null): string {
  if (!dateString) return '';
  
  // Se a data já está no formato correto (YYYY-MM-DD), retorna como está
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateString;
  }
  
  // Para datas que vêm do banco no formato ISO, extrair apenas a parte da data
  if (dateString.includes('T')) {
    return dateString.split('T')[0];
  }
  
  // Retorna como está para outros casos
  return dateString;
}

// Função para converter data do input para salvar no banco
export function formatDateForDatabase(dateString?: string): string | null {
  if (!dateString) return null;
  
  // Se já está no formato correto, retorna como está
  if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateString;
  }
  
  // Retorna null para formatos inválidos
  return null;
}

// Função para formatar data para exibição (DD/MM/YYYY)
export function formatDateForDisplay(dateString?: string | null): string {
  if (!dateString) return '-';
  
  // Se a data contém 'T', extrair apenas a parte da data
  const dateOnly = dateString.includes('T') ? dateString.split('T')[0] : dateString;
  
  // Parse da data assumindo que está em formato YYYY-MM-DD
  const [year, month, day] = dateOnly.split('-');
  
  if (!year || !month || !day) {
    return '-';
  }
  
  return `${day}/${month}/${year}`;
}
