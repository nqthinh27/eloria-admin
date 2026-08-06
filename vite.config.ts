import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv } from "vite"

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  // Cookie `refresh_token` của backend là HttpOnly, path=/v1.0/api/refresh, không Secure/SameSite
  // ⇒ chỉ hoạt động khi FE và BE cùng origin. Dev server proxy /v1.0 sang backend để giữ same-origin.
  const proxyTarget = env.VITE_API_PROXY_TARGET ?? "http://localhost:8080"

  return {
    base: env.VITE_BASE_URL ?? "/",
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      proxy: {
        "/v1.0": {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  }
})
