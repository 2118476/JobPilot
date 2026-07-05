import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vitest/config"
import { inspectAttr } from 'plugin-inspect-react-code'

// https://vite.dev/config/
export default defineConfig({
  plugins: [inspectAttr(), react()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    // Backend tests run in node; UI tests opt into jsdom per-file with
    // `// @vitest-environment jsdom`.
    environment: 'node',
    exclude: ['node_modules/**', 'dist/**', 'dist-deploy/**', 'extension/**'],
  },
});
