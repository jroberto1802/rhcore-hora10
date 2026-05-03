import { useState } from 'react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { LogOut, Settings, User, Bell } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

interface HeaderProps {
  title: string;
  currentEmpresa?: { fantasia: string } | null;
  isGroupView?: boolean;
  currentGroupName?: string | null;
}

export const Header = ({ title, currentEmpresa, isGroupView, currentGroupName }: HeaderProps) => {
  const { user, signOut } = useAuth();
  
  const formatDate = () => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    };
    return new Intl.DateTimeFormat('pt-BR', options).format(now);
  };

  const getUserInitials = () => {
    if (!user?.user_metadata?.nome) return 'U';
    const names = user.user_metadata.nome.split(' ');
    if (names.length === 1) return names[0].charAt(0).toUpperCase();
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };

  return (
    <header className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            {isGroupView 
              ? currentGroupName || '' 
              : currentEmpresa?.fantasia || title
            }
          </h1>
          <p className="text-sm text-muted-foreground capitalize">
            {formatDate()}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 h-3 w-3 bg-destructive rounded-full text-xs text-destructive-foreground flex items-center justify-center">
                  3
                </span>
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="end">
              <div className="space-y-4">
                <h4 className="font-semibold text-sm">Notificações e Ações Pendentes</h4>
                <div className="space-y-3">
                  <div className="p-3 bg-muted/50 rounded-md">
                    <p className="text-sm font-medium">Documentos pendentes</p>
                    <p className="text-xs text-muted-foreground">3 funcionários com documentação incompleta</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-md">
                    <p className="text-sm font-medium">Férias vencendo</p>
                    <p className="text-xs text-muted-foreground">2 funcionários com período aquisitivo próximo do vencimento</p>
                  </div>
                  <div className="p-3 bg-muted/50 rounded-md">
                    <p className="text-sm font-medium">Treinamentos agendados</p>
                    <p className="text-xs text-muted-foreground">Treinamento de segurança marcado para próxima semana</p>
                  </div>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="relative h-10 w-10 rounded-full">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {getUserInitials()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <div className="flex flex-col space-y-1 p-2">
              <p className="text-sm font-medium leading-none">
                {user?.user_metadata?.nome || 'Usuário'}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {user?.email}
              </p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="mr-2 h-4 w-4" />
              <span>Configurações</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={signOut}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sair</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>
      </div>
    </header>
  );
};