import { defineConfig, loadEnv } from "vite";
import { fileURLToPath, URL } from "node:url";

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  const env = loadEnv(mode, process.cwd(), "");

  const webPort = parseInt(env.WEB_PORT || "5173");
  const apiPort = parseInt(env.API_PORT || "3001");

  return {
    root: "web",
    build: {
      outDir: "../dist/web",
      emptyOutDir: true,
    },
    server: {
      port: webPort,
      proxy: {
        "/api": {
          target: `http://localhost:${apiPort}`,
          changeOrigin: true,
        },
      },
    },
    resolve: {
      alias: {
        "@": fileURLToPath(new URL("./web", import.meta.url)),
      },
    },
  };
});
