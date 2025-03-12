import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

// Definindo as variáveis de ambiente diretamente
const supabaseUrl = 'https://mnucrulwdurskwofsgwp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1udWNydWx3ZHVyc2t3b2ZzZ3dwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDExNzg3ODksImV4cCI6MjA1Njc1NDc4OX0.39iA0f1vEH2K8ygEobuv6O_FR8Fm8H2UXHzPkAZmm60';

export default defineConfig(({ mode }) => {
  const isProduction = mode === 'production' || mode === 'analyze';
  
  const plugins = [
    react({
      // Garantir que o React esteja em modo de produção durante a build
      babel: {
        plugins: isProduction ? ['transform-remove-console'] : []
      }
    }),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'apple-touch-icon.png', 'mask-icon.svg'],
      manifest: {
        name: 'EXPENSES',
        short_name: 'EXPENSES',
        theme_color: '#073763',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          }
        ]
      },
      // Otimizações adicionais para PWA
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,jpg,jpeg,gif,webp}'],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/mnucrulwdurskwofsgwp\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 // 24 horas
              }
            }
          }
        ]
      }
    })
  ];

  // Adiciona o visualizador de bundle apenas no modo de análise
  if (mode === 'analyze') {
    plugins.push(
      visualizer({
        open: true,
        filename: 'dist/stats.html',
        gzipSize: true,
        brotliSize: true,
      }) as any
    );
  }

  return {
    plugins,
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src')
      }
    },
    optimizeDeps: {
      exclude: ['lucide-react'],
      // Pré-bundling de dependências comuns para melhorar o tempo de inicialização
      entries: ['./src/**/*.tsx', './src/**/*.ts'],
      esbuildOptions: {
        target: 'esnext'
      }
    },
    build: {
      commonjsOptions: {
        include: [/node_modules/],
        transformMixedEsModules: true
      },
      // Otimizações para melhorar o desempenho
      target: 'esnext', // Otimiza para navegadores modernos
      minify: 'terser', // Usa terser para melhor minificação
      cssCodeSplit: true, // Divide o CSS para melhor carregamento
      chunkSizeWarningLimit: 1000, // Aumenta o limite de aviso para chunks grandes
      terserOptions: {
        // Configurações avançadas do Terser para melhor minificação
        compress: {
          drop_console: isProduction, // Remove console.log em produção
          drop_debugger: isProduction, // Remove debugger em produção
          pure_funcs: isProduction ? ['console.log', 'console.info', 'console.debug'] : []
        }
      },
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            // Abordagem mais segura para dividir chunks
            if (id.includes('node_modules')) {
              if (id.includes('react') || 
                  id.includes('@radix-ui') || 
                  id.includes('date-fns')) {
                return 'vendor';
              }
              
              if (id.includes('lucide-react')) {
                return 'ui';
              }
            }
            
            if (id.includes('src/components/ui')) {
              return 'ui';
            }
            
            return undefined;
          }
        }
      },
      // Ativa a compressão Brotli para arquivos estáticos
      brotliSize: true,
      // Gera sourcemaps apenas em desenvolvimento
      sourcemap: mode !== 'production'
    },
    // Adicionando as variáveis de ambiente diretamente na configuração
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey),
      // Forçar modo de produção para React
      'process.env.NODE_ENV': JSON.stringify(isProduction ? 'production' : 'development')
    },
    // Melhorar o desempenho do servidor de desenvolvimento
    server: {
      hmr: {
        overlay: false // Desativa o overlay de erro para melhor desempenho
      },
      // Otimizações para o servidor de desenvolvimento
      watch: {
        usePolling: false, // Desativa polling para melhor desempenho
        ignored: ['**/node_modules/**', '**/dist/**'] // Ignora diretórios grandes
      }
    },
    // Otimizações para o preview
    preview: {
      port: 5173,
      strictPort: false,
      open: true
    }
  };
});