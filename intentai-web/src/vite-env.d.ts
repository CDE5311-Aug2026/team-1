/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional: where the EARTH ONLINE 3D Singapore page is served. Defaults to the bundled /earth-online/sg/index.html. */
  readonly VITE_EARTH_ONLINE_SG_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
