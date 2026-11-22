/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_ENABLE_TEST_CLOCK?: string;
}

interface Navigator {
  /** Safari: lets Web Audio play even when the iPhone ring/silent switch is on. */
  audioSession?: { type: string };
}
