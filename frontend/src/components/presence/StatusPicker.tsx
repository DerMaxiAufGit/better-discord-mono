import { useState } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { usePresenceStore } from '@/stores/presenceStore';
import type { PresenceStatus } from '@/lib/api';
import { Circle, Moon, MinusCircle, Eye, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const statusConfig: Record<PresenceStatus, {
  label: string;
  icon: typeof Circle;
  color: string;
  description: string;
}> = {
  online: {
    label: 'Online',
    icon: Circle,
    color: 'text-green-500 fill-green-500',
    description: 'You appear online to everyone',
  },
  away: {
    label: 'Away',
    icon: Moon,
    color: 'text-yellow-500 fill-yellow-500',
    description: 'You appear away',
  },
  dnd: {
    label: 'Do Not Disturb',
    icon: MinusCircle,
    color: 'text-red-500 fill-red-500',
    description: 'No notifications or sounds',
  },
  invisible: {
    label: 'Invisible',
    icon: Eye,
    color: 'text-gray-400',
    description: 'Appear offline to others',
  },
};

interface StatusPickerProps {
  className?: string;
  showLabel?: boolean;
  onStatusChange?: (status: PresenceStatus) => void;
}

export function StatusPicker({
  className,
  showLabel = true,
  onStatusChange,
}: StatusPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { myStatus, setMyStatus } = usePresenceStore();

  const currentConfig = statusConfig[myStatus];
  const Icon = currentConfig.icon;

  const handleSelect = async (status: PresenceStatus) => {
    setIsOpen(false);
    await setMyStatus(status);
    onStatusChange?.(status);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className={cn('gap-2', className)}>
          <Icon className={cn('h-3 w-3', currentConfig.color)} />
          {showLabel && <span>{currentConfig.label}</span>}
          <ChevronDown className="h-3 w-3 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {(Object.keys(statusConfig) as PresenceStatus[]).map((status) => {
          const config = statusConfig[status];
          const StatusIcon = config.icon;
          const isSelected = status === myStatus;

          return (
            <DropdownMenuItem
              key={status}
              onClick={() => handleSelect(status)}
              className={cn('flex flex-col items-start gap-1 py-2', isSelected && 'bg-muted')}
            >
              <div className="flex items-center gap-2">
                <StatusIcon className={cn('h-3 w-3', config.color)} />
                <span className="font-medium">{config.label}</span>
              </div>
              <span className="text-xs text-muted-foreground ml-5">
                {config.description}
              </span>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-xs text-muted-foreground">
          Manage visibility in Settings
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
