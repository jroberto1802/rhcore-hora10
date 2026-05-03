import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ViewObservacaoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  observacao: string | null;
}

export function ViewObservacaoModal({ open, onOpenChange, title, observacao }: ViewObservacaoModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="max-h-[300px]">
          <div className="py-4">
            {observacao ? (
              <p className="text-sm whitespace-pre-wrap">{observacao}</p>
            ) : (
              <p className="text-sm text-muted-foreground italic">Nenhuma observação cadastrada.</p>
            )}
          </div>
        </ScrollArea>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
