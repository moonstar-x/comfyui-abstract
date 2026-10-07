import { ComfyUiStatusButton } from '@components/comfyui/ComfyUiStatusButton';
import { ComfyUiUsageStats } from '@components/comfyui/ComfyUiUsageStats';
import { useWebSocketStatus } from '@components/websocket/hooks/useWebSocketStatus';
import type { FC } from 'react';

export const ComfyUiStatus: FC = () => {
  const { online, usage, refresh } = useWebSocketStatus();

  return (
    <div className="flex items-center gap-3">
      {online === true && usage !== null && <ComfyUiUsageStats usage={usage} />}
      <ComfyUiStatusButton online={online} onRefresh={refresh} />
    </div>
  );
};
