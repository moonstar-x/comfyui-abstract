const getString = (key: keyof ImportMetaEnv, defaultValue: string): string => {
  const value = import.meta.env[key];
  return typeof value === 'string' && value !== '' ? value : defaultValue;
};

const getDefaultWsUrl = (): string => {
  const url = new URL('/ws', location.origin);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  return url.href;
};

// Default to the page's own origin for when the API serves the UI itself.
export const API_URL: string = getString('VITE_API_URL', location.origin);
export const WS_URL: string = getString('VITE_WS_URL', getDefaultWsUrl());
