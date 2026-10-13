declare namespace NodeJS {
  interface ProcessEnv {
    COMFYUI_URL?: string;
    ENABLE_SIGNUP?: string;
    JWT_EXPIRATION?: string;
    JWT_SECRET?: string;
    MAX_AUDIO_UPLOAD_MB?: string;
    MAX_IMAGE_UPLOAD_MB?: string;
    PORT?: string;

    POSTGRES_DATABASE?: string;
    POSTGRES_HOST?: string;
    POSTGRES_MAX_CONNECTIONS?: string;
    POSTGRES_PASSWORD?: string;
    POSTGRES_PORT?: string;
    POSTGRES_USER?: string;

    PUBLIC_DIRECTORY?: string;
  }
}
