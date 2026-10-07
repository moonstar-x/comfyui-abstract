import { Button } from '@components/ui/third-party/shadcn/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@components/ui/third-party/shadcn/tooltip';
import { useAppWebSocket } from '@components/websocket/WebSocketContext';
import type { Nullable } from '@core/utils/types';
import { cn } from 'cn';
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
    description: 'ComfyUI is not reachable. Click to check again.',
    dotClassName: 'bg-status-offline ring-3 ring-status-offline/25',
    label: 'ComfyUI offline'
  },
  online: {
    buttonClassName: 'border-status-online/35 bg-status-online/10 text-status-online-foreground hover:bg-status-online/15 hover:text-status-online-foreground dark:border-status-online/35 dark:bg-status-online/10 dark:hover:bg-status-online/20',
    description: 'ComfyUI is online. Click to check again.',
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

export interface ComfyUiStatusButtonProps {
  online: Nullable<boolean>;
  onRefresh: () => void;
}

export const ComfyUiStatusButton: FC<ComfyUiStatusButtonProps> = ({ online, onRefresh }) => {
  const { readyState } = useAppWebSocket();
  const status = resolveStatus(readyState, online);
  const meta = STATUS_META[status];

  return (
    <Tooltip>
      <TooltipTrigger
        render={(
          <Button
            aria-label={`ComfyUI status: ${status}`}
            className={cn('rounded-full px-3', meta.buttonClassName)}
            variant="outline"
            onClick={onRefresh}
          />
        )}
      >
        <span aria-hidden="true" className={cn('size-2 shrink-0 rounded-full', meta.dotClassName)} />
        <span aria-live="polite">{meta.label}</span>
      </TooltipTrigger>
      <TooltipContent align="end" side="bottom">{meta.description}</TooltipContent>
    </Tooltip>
  );
};
