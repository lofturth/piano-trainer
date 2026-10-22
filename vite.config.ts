import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { execFileSync } from 'node:child_process'

import { cloudflare } from '@cloudflare/vite-plugin'
import pkg from './package.json' with { type: 'json' }
import { hostname } from 'node:os'

function localHostname() {
  if (process.platform === 'darwin') {
    try { return `${execFileSync('scutil', ['--get', 'LocalHostName'], { encoding: 'utf8' }).trim()}.local` } catch { /* Use OS hostname below. */ }
  }
  return hostname()
}
const lanHostname = localHostname().toLowerCase()

function getGitCommit() {
  try {
    return execFileSync('git', ['rev-parse', '--short', 'HEAD'], {
      encoding: 'utf8',
    }).trim()
  } catch {
    return 'unknown'
  }
}

// https://vite.dev/config/
export default defineConfig({
  server: {
    host: '0.0.0.0',
    allowedHosts: ['lofturs-macbook-air.local', lanHostname],
    port: 5173,
    strictPort: true,
    hmr: false,
    ws: false,
  },
  plugins: [
    react(),
    {
      name: 'controller-address',
      configureServer(server) {
        server.httpServer?.once('listening', () => {
          console.log(`\n  iPhone: http://${lanHostname}:${server.config.server.port}/controller`)
          console.log('  Save this URL to the iPhone Home Screen; it survives IP changes.\n')
        })
      },
    },
    ...(process.env.CLOUDFLARE_ENV ? [cloudflare()] : []),
  ],
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __GIT_COMMIT__: JSON.stringify(getGitCommit()),
    __DEPLOY_ENV__: JSON.stringify(process.env.DEPLOY_ENV || 'LOCAL'),
  },
})
