import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: { exclude: ["@tezgah/shared", "@tezgah/templates"] },
  server: {
    port: 5173,
    proxy: {
      "/api": "http://127.0.0.1:3001",
      "/assets": "http://127.0.0.1:3001",
      "/exports": "http://127.0.0.1:3001",
      "/fonts": "http://127.0.0.1:3001", // FAZ5 §7: kullanıcı fontları print (5173) origininden de erişilir
    },
  },
});
