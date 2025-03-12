import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { visualizer } from 'rollup-plugin-visualizer';

// Definindo as variáveis de ambiente diretamente
const supabaseUrl = 'https://mnucrulwdurskwofsgwp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1udWNydWx3ZHVyc2t3b2ZzZ3dwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDExNzg3ODksImV4cCI6MjA1Njc1NDc4OX0.39iA0f1vEH2K8ygEobuv6O_FR8Fm8H2UXHzPkAZmm60';

export default defineConfig(({ mode }) => {
  const plugins = [
    react(),
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
      })
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
      include: ['@radix-ui/react-popover']
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
      rollupOptions: {
        output: {
          manualChunks: {
            // Separa as bibliotecas em chunks para melhor cache
            vendor: [
              'react', 
              'react-dom', 
              'react-router-dom',
              '@radix-ui/react-dialog',
              '@radix-ui/react-popover',
              'date-fns'
            ],
            // Separa os componentes UI em um chunk separado
            ui: [
              'lucide-react',
              './src/components/ui'
            ]
          }
        }
      }
    },
    // Adicionando as variáveis de ambiente diretamente na configuração
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(supabaseUrl),
      'import.meta.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(supabaseAnonKey)
    },
    // Melhorar o desempenho do servidor de desenvolvimento
    server: {
      hmr: {
        overlay: false // Desativa o overlay de erro para melhor desempenho
      }
    }
  };
});