import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import runtimeErrorOverlay from "@replit/vite-plugin-runtime-error-modal";
import tsconfigPaths from "vite-tsconfig-paths";
import { cartographer } from "@replit/vite-plugin-cartographer";

export default defineConfig({
  plugins: [
    react(),
    runtimeErrorOverlay(),
    tsconfigPaths(),
    ...(process.env.NODE_ENV !== "production" && process.env.REPL_ID
      ? [cartographer()]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "client", "src"),
      "@shared": path.resolve(__dirname, "shared"),
      "@assets": path.resolve(__dirname, "attached_assets"),
    },
  },
  root: "client",
  build: {
    outDir: path.resolve(__dirname, "dist/public"),
    emptyOutDir: true,
  },
  optimizeDeps: {
    include: ["@shared/schema"],
  },
});
