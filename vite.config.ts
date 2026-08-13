import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  // GitHub Pages のプロジェクトページ(https://<user>.github.io/word-learning/)配信前提
  base: '/word-learning/',
})
