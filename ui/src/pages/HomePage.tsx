import { useWebSocketHealth } from '@components/websocket/hooks/useWebSocketHealth';
import type { FC } from 'react';

const HomePage: FC = () => {
  const { online } = useWebSocketHealth();

  return (
    <div className="bg-red-500">
      <pre>
        {JSON.stringify(online)}
      </pre>
    </div>
  );
};

export default HomePage;
