import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: { exclude: ["@tezgah/shared"] },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:3001",
      "/assets": "http://127.0.0.1:3001",
    },
  },
});
