const getRequired = (key: keyof ImportMetaEnv): string => {
  const value = import.meta.env[key];
  if (typeof value !== 'string' || value === '') {
    throw new Error(`Missing required environment variable ${key}.`);
  }

  return value;
};

export const API_URL: string = getRequired('VITE_API_URL');
