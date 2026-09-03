/// <reference types="vite/client" />

import type { StyleCraftApi } from "./types/stylecraft-api";

declare global {
  interface Window {
    stylecraft: StyleCraftApi;
  }
}

export {};
