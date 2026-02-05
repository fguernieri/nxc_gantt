import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  build: {
    outDir: '.',
    emptyOutDir: false,
    rollupOptions: {
      input: resolve(__dirname, 'src/main.js'),
      output: {
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
