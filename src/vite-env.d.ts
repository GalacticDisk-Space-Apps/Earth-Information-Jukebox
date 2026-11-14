/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_FAKE_DATA?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
