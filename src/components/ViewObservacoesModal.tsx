import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ViewObservacoesModalProps {
  isOpen: boolean;
  onClose: () => void;
  observacoes: string | null;
  title?: string;
}

export function ViewObservacoesModal({ 
  isOpen, 
  onClose, 
  observacoes, 
  title = 'Observações' 
}: ViewObservacoesModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[300px]">
          <div className="py-4">
            {observacoes ? (
              <p className="text-sm whitespace-pre-wrap">{observacoes}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">Nenhuma observação cadastrada.</p>
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
