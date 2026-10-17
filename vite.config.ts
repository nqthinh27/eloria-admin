import { execSync } from "child_process"
import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig, loadEnv, type Plugin } from "vite"

/**
 * Mã phiên bản của lần build này — git SHA ngắn; không có git (build trong Docker: `.dockerignore`
 * loại `.git`) ⇒ lùi về timestamp base36. Mỗi build ra một mã khác nhau là đủ để phát hiện "có bản mới".
 */
function resolveAppVersion(): string {
  try {
    const sha = execSync("git rev-parse --short HEAD", { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim()
    if (sha) return `${sha}-${Date.now().toString(36)}`
  } catch {
    // Không có git — dùng timestamp.
  }
  return Date.now().toString(36)
}

/** Sinh `version.json` cạnh `index.html` — app so với `__APP_VERSION__` (src/lib/app-version.ts). */
function versionFilePlugin(version: string): Plugin {
  return {
    name: "eloria-version-file",
    apply: "build",
    generateBundle() {
      this.emitFile({
        type: "asset",
        fileName: "version.json",
        source: JSON.stringify({ version }),
      })
    },
  }
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd())

  // Cookie `refresh_token` của backend là HttpOnly, path=/v1.0/api/refresh, không Secure/SameSite
  // ⇒ chỉ hoạt động khi FE và BE cùng origin. Dev server proxy /v1.0 sang backend để giữ same-origin.
  const proxyTarget = env.VITE_API_PROXY_TARGET ?? "http://localhost:8080"

  const appVersion = resolveAppVersion()

  return {
    base: env.VITE_BASE_URL ?? "/",
    plugins: [react(), tailwindcss(), versionFilePlugin(appVersion)],
    define: {
      __APP_VERSION__: JSON.stringify(appVersion),
    },
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
          ws: true, // WebSocket STOMP `/v1.0/websocket/websocket` (Phase 25)
        },
      },
    },
    // `npm run preview` chạy bản build thật — cũng cần proxy y hệt dev, nếu không mọi lời gọi API
    // đều 404 và không kiểm chứng được bản production trước khi deploy.
    preview: {
      proxy: {
        "/v1.0": {
          target: proxyTarget,
          changeOrigin: true,
          ws: true, // WebSocket STOMP `/v1.0/websocket/websocket` (Phase 25)
        },
      },
    },
  }
})
