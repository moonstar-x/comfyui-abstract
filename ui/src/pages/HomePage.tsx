import { useWebSocketHealth } from '@components/websocket/hooks/useWebSocketHealth';
import type { FC } from 'react';

const HomePage: FC = () => {
  const { online } = useWebSocketHealth();

  return (
    <div>
      <pre>
        {JSON.stringify(online)}
      </pre>
    </div>
  );
};

export default HomePage;
