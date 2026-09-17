import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8080",
        // Keep the original Host so the backend builds its Google OAuth
        // redirect URI from the browser-facing development port.
        changeOrigin: false,
      },
      "/api/ws": {
        ws: true,
        target: "ws://localhost:8080/",
      },
    },
  },
});
