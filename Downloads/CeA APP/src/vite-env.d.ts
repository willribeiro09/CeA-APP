/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module 'date-fns';
declare module 'date-fns/locale';
declare module '@radix-ui/react-dialog';
declare module 'react-day-picker';
declare module '@radix-ui/react-popover';
declare module 'clsx';
declare module 'tailwind-merge'; 