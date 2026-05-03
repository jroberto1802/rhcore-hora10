import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { useState } from 'react';

interface EventosPopoverProps {
  eventos: string[];
  maxVisible?: number;
}

export function EventosPopover({ eventos, maxVisible = 2 }: EventosPopoverProps) {
  const [open, setOpen] = useState(false);

  if (eventos.length === 0) {
    return <span className="text-muted-foreground">-</span>;
  }

  const visibleEventos = eventos.slice(0, maxVisible);
  const remainingCount = eventos.length - maxVisible;

  if (eventos.length <= maxVisible) {
    return (
      <div className="flex flex-wrap gap-1">
        {eventos.map((evento) => (
          <Badge key={evento} variant="outline" className="text-xs">
            {evento}
          </Badge>
        ))}
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="flex flex-wrap gap-1 items-center cursor-pointer hover:opacity-80">
          {visibleEventos.map((evento) => (
            <Badge key={evento} variant="outline" className="text-xs">
              {evento}
            </Badge>
          ))}
          <Badge variant="secondary" className="text-xs cursor-pointer">
            +{remainingCount}
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-0" align="start">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <span className="text-sm font-medium">Eventos Vinculados</span>
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => setOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="p-3">
          <div className="flex flex-wrap gap-1">
            {eventos.map((evento) => (
              <Badge key={evento} variant="outline" className="text-xs">
                {evento}
              </Badge>
            ))}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
