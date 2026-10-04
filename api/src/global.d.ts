declare namespace NodeJS {
  interface ProcessEnv {
    COMFYUI_URL?: string;
    PORT?: string;

    POSTGRES_DATABASE?: string;
    POSTGRES_HOST?: string;
    POSTGRES_MAX_CONNECTIONS?: string;
    POSTGRES_PASSWORD?: string;
    POSTGRES_PORT?: string;
    POSTGRES_USER?: string;
  }
}
