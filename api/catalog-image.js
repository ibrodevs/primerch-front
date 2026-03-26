import { Buffer } from 'node:buffer'

const ALLOWED_HOSTS = new Set(['files.gifts.ru'])

function readUrlParam(req) {
  const value = req.query?.url
  if (Array.isArray(value)) return value[0] || ''
  return String(value || '')
}

export default async function handler(req, res) {
  const target = readUrlParam(req)
  if (!target) {
    res.status(400).send('Missing url')
    return
  }

  let parsed
  try {
    parsed = new URL(target)
  } catch {
    res.status(400).send('Invalid url')
    return
  }

  if (parsed.protocol !== 'https:') {
    res.status(400).send('Only https is allowed')
    return
  }

  if (!ALLOWED_HOSTS.has(parsed.hostname)) {
    res.status(403).send('Host not allowed')
    return
  }

  try {
    const upstream = await fetch(parsed.toString(), {
      headers: {
        'user-agent': 'primerch-front image proxy',
        accept: 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
      redirect: 'follow',
    })

    if (!upstream.ok) {
      res.status(upstream.status).send(`Upstream error: ${upstream.status}`)
      return
    }

    const contentType = upstream.headers.get('content-type') || 'application/octet-stream'
    const cacheControl = upstream.headers.get('cache-control') || 'public, max-age=600'
    const buffer = Buffer.from(await upstream.arrayBuffer())

    res.setHeader('content-type', contentType)
    res.setHeader('cache-control', cacheControl)
    res.status(200).send(buffer)
  } catch (error) {
    res.status(502).send(`Proxy error: ${error?.message || 'unknown'}`)
  }
}
