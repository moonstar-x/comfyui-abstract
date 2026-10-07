import { ComfyUiQueueStatus } from '@components/comfyui/ComfyUiQueueStatus';
import { ComfyUiStatusButton } from '@components/comfyui/ComfyUiStatusButton';
import { ComfyUiUsageStats } from '@components/comfyui/ComfyUiUsageStats';
import { useWebSocketQueue } from '@components/websocket/hooks/useWebSocketQueue';
import { useWebSocketStatus } from '@components/websocket/hooks/useWebSocketStatus';
import { useCallback } from 'react';
import type { FC } from 'react';

export const ComfyUiStatus: FC = () => {
  const { online, usage, refresh: refreshStatus } = useWebSocketStatus();
  const { queue, refresh: refreshQueue } = useWebSocketQueue();

  const handleRefresh = useCallback(() => {
    refreshStatus();
    refreshQueue();
  }, [refreshStatus, refreshQueue]);

  return (
    <div className="flex items-center gap-2">
      {online === true && usage !== null && <ComfyUiUsageStats usage={usage} />}
      {online === true && queue !== null && <ComfyUiQueueStatus queue={queue} onRefresh={refreshQueue} />}
      <ComfyUiStatusButton online={online} onRefresh={handleRefresh} />
    </div>
  );
};
