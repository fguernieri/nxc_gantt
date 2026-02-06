import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  define: {
    appName: JSON.stringify('nxc_gantt'),
    appVersion: JSON.stringify('0.1.1'),
  },

  build: {
    outDir: '.',
    emptyOutDir: false,
    minify: true,
    rollupOptions: {
      input: resolve(__dirname, 'src/main.js'),
      output: {
        format: 'iife',
        name: 'NXCGantt',
        entryFileNames: 'js/nxc_gantt.js',
        assetFileNames: (assetInfo) => {
          if (assetInfo.name === 'style.css') return 'css/main.css';
          return `css/[name][extname]`;
        },
        chunkFileNames: 'js/[name].js',
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
})
