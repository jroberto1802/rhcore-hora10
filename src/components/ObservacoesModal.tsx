import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface ObservacoesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (observacoes: string) => void;
  observacoes: string;
  title?: string;
}

export function ObservacoesModal({ isOpen, onClose, onSave, observacoes, title = 'Observações' }: ObservacoesModalProps) {
  const [value, setValue] = useState(observacoes);

  useEffect(() => {
    setValue(observacoes);
  }, [observacoes, isOpen]);

  const handleSave = () => {
    onSave(value);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Digite as observações..."
              rows={6}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
