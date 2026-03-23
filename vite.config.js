import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import https from 'node:https'

function imageProxyMiddleware() {
  const handler = async (req, res) => {
    try {
      const requestUrl = new URL(req.originalUrl || req.url || '', 'http://localhost')
      const target = requestUrl.searchParams.get('url')
      if (!target) {
        res.statusCode = 400
        res.end('Missing url')
        return
      }

      let parsed
      try {
        parsed = new URL(target)
      } catch {
        res.statusCode = 400
        res.end('Invalid url')
        return
      }

      if (parsed.protocol !== 'https:') {
        res.statusCode = 400
        res.end('Only https is allowed')
        return
      }

      const allowedHosts = new Set(['files.gifts.ru'])
      if (!allowedHosts.has(parsed.hostname)) {
        res.statusCode = 403
        res.end('Host not allowed')
        return
      }

      const fetchStream = (targetUrl, redirectsLeft) =>
        new Promise((resolve, reject) => {
          const request = https.request(
            targetUrl,
            {
              method: 'GET',
              headers: {
                'user-agent': 'primerch-front dev proxy',
                accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
              },
            },
            (upstream) => {
              const status = upstream.statusCode || 502
              const location = upstream.headers.location
              if (
                location &&
                [301, 302, 303, 307, 308].includes(status) &&
                redirectsLeft > 0
              ) {
                upstream.resume()
                let next
                try {
                  next = new URL(location, targetUrl).toString()
                } catch (error) {
                  reject(error)
                  return
                }
                fetchStream(next, redirectsLeft - 1).then(resolve, reject)
                return
              }

              resolve(upstream)
            },
          )
          request.on('error', reject)
          request.end()
        })

      const upstream = await fetchStream(parsed.toString(), 3)
      const status = upstream.statusCode || 502
      if (status >= 400) {
        res.statusCode = status
        res.end(`Upstream error: ${status}`)
        upstream.resume()
        return
      }

      const contentType = upstream.headers['content-type'] || 'application/octet-stream'
      const cacheControl = upstream.headers['cache-control'] || 'public, max-age=600'
      res.setHeader('content-type', contentType)
      res.setHeader('cache-control', cacheControl)
      upstream.pipe(res)
    } catch (error) {
      res.statusCode = 502
      res.end(`Proxy error: ${error?.message || 'unknown'}`)
    }
  }

  return {
    name: 'image-proxy',
    configureServer(server) {
      server.middlewares.use('/__imgproxy', handler)
    },
    configurePreviewServer(server) {
      server.middlewares.use('/__imgproxy', handler)
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), imageProxyMiddleware()],
  server: {
    host: '127.0.0.1',
    port: 5174,
    strictPort: true,
    proxy: {
      '/api': 'https://backendprimerch.pythonanywhere.com',
      '/shirt.png': 'https://backendprimerch.pythonanywhere.com',
      '/logo.png': 'https://backendprimerch.pythonanywhere.com',
    },
  },
})
