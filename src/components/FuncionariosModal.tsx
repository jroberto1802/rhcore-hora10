import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatDateForDisplay } from '@/lib/utils';

interface Funcionario {
  id: string;
  nome_completo: string;
  nome_abreviado?: string;
  cargo_atual?: string;
  empresa_id: string;
  data_admissao?: string;
  data_demissao?: string;
  foto_url?: string;
  codigo: string;
}

interface FuncionariosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  funcionarios: Funcionario[];
  loading: boolean;
}

export function FuncionariosModal({ 
  open, 
  onOpenChange, 
  title, 
  funcionarios, 
  loading 
}: FuncionariosModalProps) {
  const navigate = useNavigate();

  const handleViewFuncionario = (funcionarioId: string) => {
    navigate(`/funcionarios/${funcionarioId}`);
    onOpenChange(false);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(part => part.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        
        {loading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Carregando funcionários...</p>
          </div>
        ) : funcionarios.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Nenhum funcionário encontrado.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Funcionário</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead>Data Admissão</TableHead>
                {title.includes('Demissões') && <TableHead>Data Demissão</TableHead>}
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {funcionarios.map((funcionario) => (
                <TableRow key={funcionario.id}>
                  <TableCell>
                    <div className="flex items-center space-x-3">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={funcionario.foto_url} />
                        <AvatarFallback className="text-xs">
                          {getInitials(funcionario.nome_completo)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{funcionario.nome_completo}</div>
                        {funcionario.nome_abreviado && (
                          <div className="text-sm text-muted-foreground">
                            {funcionario.nome_abreviado}
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{funcionario.codigo}</Badge>
                  </TableCell>
                  <TableCell>
                    {funcionario.cargo_atual || '-'}
                  </TableCell>
                  <TableCell>
                    {funcionario.data_admissao 
                      ? formatDateForDisplay(funcionario.data_admissao)
                      : '-'
                    }
                  </TableCell>
                  {title.includes('Demissões') && (
                    <TableCell>
                      {funcionario.data_demissao 
                        ? formatDateForDisplay(funcionario.data_demissao)
                        : '-'
                      }
                    </TableCell>
                  )}
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleViewFuncionario(funcionario.id)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Ver Detalhes
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}