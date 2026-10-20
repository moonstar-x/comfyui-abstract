import { Button } from '@components/ui/third-party/shadcn/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@components/ui/third-party/shadcn/dropdown-menu';
import { useFreeComfyUiMemory } from '@components/websocket/hooks/useFreeComfyUiMemory';
import { useAppWebSocket } from '@components/websocket/WebSocketContext';
import type { Nullable } from '@core/utils/types';
import { cn } from 'cn';
import { ChevronDown, CircleCheck, LoaderCircle, MemoryStick, RefreshCw } from 'lucide-react';
import type { FC } from 'react';
import { ReadyState } from 'react-use-websocket/dist/lib/constants';

type ComfyUIStatus = 'connecting' | 'offline' | 'online';

interface StatusMeta {
  buttonClassName: string;
  description: string;
  dotClassName: string;
  label: string;
}

const STATUS_META: Record<ComfyUIStatus, StatusMeta> = {
  connecting: {
    buttonClassName: 'border-status-connecting/35 bg-status-connecting/10 text-status-connecting-foreground hover:bg-status-connecting/15 hover:text-status-connecting-foreground dark:border-status-connecting/35 dark:bg-status-connecting/10 dark:hover:bg-status-connecting/20',
    description: 'Waiting for the ComfyUI Abstract server.',
    dotClassName: 'bg-status-connecting animate-pulse',
    label: 'Connecting…'
  },
  offline: {
    buttonClassName: 'border-status-offline/35 bg-status-offline/10 text-status-offline-foreground hover:bg-status-offline/15 hover:text-status-offline-foreground dark:border-status-offline/35 dark:bg-status-offline/10 dark:hover:bg-status-offline/20',
    description: 'ComfyUI is not reachable.',
    dotClassName: 'bg-status-offline ring-3 ring-status-offline/25',
    label: 'ComfyUI offline'
  },
  online: {
    buttonClassName: 'border-status-online/35 bg-status-online/10 text-status-online-foreground hover:bg-status-online/15 hover:text-status-online-foreground dark:border-status-online/35 dark:bg-status-online/10 dark:hover:bg-status-online/20',
    description: 'ComfyUI is online.',
    dotClassName: 'bg-status-online ring-3 ring-status-online/25',
    label: 'ComfyUI online'
  }
};

const resolveStatus = (readyState: ReadyState, online: Nullable<boolean>): ComfyUIStatus => {
  if (readyState === ReadyState.CONNECTING) {
    return 'connecting';
  }

  if (readyState !== ReadyState.OPEN) {
    return 'offline';
  }

  if (online === null) {
    return 'connecting';
  }

  return online ? 'online' : 'offline';
};

const getFreeMemoryLabel = (isFreeing: boolean, isFreed: boolean): string => {
  if (isFreeing) {
    return 'Freeing up memory…';
  }

  return isFreed ? 'Memory freed' : 'Free up memory';
};

export interface ComfyUiStatusButtonProps {
  online: Nullable<boolean>;
  onRefresh: () => void;
}

/**
 * ComfyUI status badge, with ComfyUI actions in a dropdown.
 */
export const ComfyUiStatusButton: FC<ComfyUiStatusButtonProps> = ({ online, onRefresh }) => {
  const { readyState } = useAppWebSocket();
  const status = resolveStatus(readyState, online);
  const meta = STATUS_META[status];
  // Freeing memory changes the reported usage, so refresh it right away.
  const { error, free, isFreed, isFreeing } = useFreeComfyUiMemory(onRefresh);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={(
          <Button
            aria-label={`ComfyUI status: ${status}`}
            className={cn('cursor-pointer rounded-full px-3', meta.buttonClassName)}
            variant="outline"
          />
        )}
      >
        <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', meta.dotClassName)} />
        <span aria-live="polite">{meta.label}</span>
        <ChevronDown aria-hidden="true" className="size-3.5 opacity-70" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="max-w-64 whitespace-normal">{meta.description}</DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={onRefresh}>
          <RefreshCw />
          Check online status
        </DropdownMenuItem>
        <DropdownMenuItem
          closeOnClick={false}
          disabled={status !== 'online' || isFreeing}
          onClick={free}
        >
          {isFreeing ? <LoaderCircle className="animate-spin" /> : (isFreed ? <CircleCheck /> : <MemoryStick />)}
          <span aria-live="polite">{getFreeMemoryLabel(isFreeing, isFreed)}</span>
        </DropdownMenuItem>
        {error !== null && (
          <DropdownMenuLabel className="max-w-64 whitespace-normal text-destructive" role="alert">{error}</DropdownMenuLabel>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
