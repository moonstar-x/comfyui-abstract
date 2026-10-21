interface ViteTypeOptions {
  strictImportMetaEnv: unknown;
}

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_WS_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

// @dnd-kit still types its components with the global JSX namespace, which @types/react 19 no longer declares.
declare namespace JSX {
  type Element = React.JSX.Element;
  type IntrinsicElements = React.JSX.IntrinsicElements;
}
