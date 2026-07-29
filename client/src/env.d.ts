/// <reference types="vite/client" />

// ★ Vite 环境变量必须以 VITE_ 开头才会在编译期内联进 bundle
// ★ 类型扩展让 import.meta.env.VITE_API_BASE_URL 有完整类型提示
interface ImportMetaEnv {
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue';
  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>;
  export default component;
}