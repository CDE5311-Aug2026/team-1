/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional: where the EARTH ONLINE 3D Singapore page is served. Defaults to the bundled phone-friendly page /earth-online/sg/lite.html. */
  readonly VITE_EARTH_ONLINE_SG_URL?: string;
  /** 'hash' for static previews served from a sub-folder (see README). */
  readonly VITE_ROUTER?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
