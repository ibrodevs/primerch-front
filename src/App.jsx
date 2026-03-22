import { useEffect, useRef, useState } from 'react'

const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '')

const REGION_OPTIONS = [
  { value: 'auto', label: 'Авто' },
  { value: 'chest', label: 'Грудь' },
  { value: 'abdomen', label: 'Живот' },
  { value: 'back', label: 'Спина' },
  { value: 'left_sleeve', label: 'Левый рукав' },
  { value: 'right_sleeve', label: 'Правый рукав' },
]

const MODE_OPTIONS = [
  { value: 'print', label: 'Print' },
  { value: 'embroidery', label: 'Embroidery' },
]

const PRINT_CONTROLS = [
  { key: 'cylindrical_strength', label: 'Curvature', min: 0, max: 0.25, step: 0.005 },
  { key: 'displacement_strength', label: 'Warp', min: 0, max: 6, step: 0.05 },
  { key: 'shade_strength', label: 'Shading', min: 0, max: 1, step: 0.01 },
  { key: 'texture_strength', label: 'Texture', min: 0, max: 0.6, step: 0.01 },
  { key: 'absorption_blur', label: 'Absorption', min: 0, max: 1.5, step: 0.02 },
  { key: 'edge_soften', label: 'Edge soften', min: 0, max: 1.2, step: 0.02 },
  { key: 'ink_bleed', label: 'Ink bleed', min: 0, max: 0.45, step: 0.01 },
  { key: 'dye_strength', label: 'Dye', min: 0, max: 1, step: 0.01 },
]

const EMBROIDERY_CONTROLS = [
  { key: 'embroidery_depth', label: 'Depth', min: 0, max: 1, step: 0.01 },
  { key: 'stitch_density', label: 'Stitch density', min: 0, max: 1, step: 0.01 },
  { key: 'thread_shine', label: 'Thread shine', min: 0, max: 1, step: 0.01 },
  { key: 'edge_raised', label: 'Raised edge', min: 0, max: 1, step: 0.01 },
  { key: 'fabric_influence', label: 'Fabric influence', min: 0, max: 1, step: 0.01 },
  { key: 'thread_texture_strength', label: 'Thread texture', min: 0, max: 1, step: 0.01 },
]

const DEFAULT_APP_STATE = {
  garment: { w: 600, h: 600 },
  print_bounds: { x: 0, y: 0, w: 600, h: 600 },
  region_bounds: {},
  placement: { x: 220, y: 520, width: 180, height: 120, rotation: 0 },
  size_ref: { w: 180, h: 120 },
  scale: 1,
  lock_region: true,
  session_id: null,
  mode: 'print',
  region: 'auto',
  downscale: 1,
  overlay_type: 'logo',
  text: '',
  text_color: '#080808',
  logo_color_enabled: false,
  logo_color: '#111111',
  print_params: {
    opacity: 0.85,
    blend_mode: 'normal',
    displacement_strength: 2.75,
    cylindrical_strength: 0.11,
    ink_strength: 0.85,
    absorption_blur: 0.55,
    absorption_alpha_soften: 0.965,
    shade_strength: 0.9,
    texture_strength: 0.22,
    edge_soften: 0.35,
    ink_bleed: 0.12,
    preserve_texture: 0.3,
    dye_strength: 0,
  },
  embroidery_params: {
    embroidery_depth: 0.35,
    stitch_density: 0.7,
    thread_shine: 0.2,
    edge_raised: 0.25,
    fabric_influence: 0.35,
    thread_texture_strength: 0.6,
  },
}

function num(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function normalizeHexColor(value, fallback = '#111111') {
  if (typeof value !== 'string') return fallback
  let text = value.trim().toLowerCase()
  if (!text) return fallback
  if (text.startsWith('#')) text = text.slice(1)
  if (text.length === 3 && /^[0-9a-f]{3}$/i.test(text)) {
    text = `${text[0]}${text[0]}${text[1]}${text[1]}${text[2]}${text[2]}`
  }
  if (!/^[0-9a-f]{6}$/i.test(text)) return fallback
  return `#${text}`
}

function normalizeRotationDeg(value) {
  const raw = Number.isFinite(value) ? value : 0
  let angle = raw % 360
  if (angle > 180) angle -= 360
  if (angle < -180) angle += 360
  return Math.abs(angle) < 1e-6 ? 0 : angle
}

function rectFromBounds(bounds, xa, ya, xb, yb) {
  const x1 = num(bounds?.x, 0)
  const y1 = num(bounds?.y, 0)
  const w = Math.max(1, num(bounds?.w, 1))
  const h = Math.max(1, num(bounds?.h, 1))
  const rx1 = Math.round(x1 + w * xa)
  const ry1 = Math.round(y1 + h * ya)
  const rx2 = Math.round(x1 + w * xb)
  const ry2 = Math.round(y1 + h * yb)
  return { x: rx1, y: ry1, w: Math.max(1, rx2 - rx1), h: Math.max(1, ry2 - ry1) }
}

function getPrintBounds(app) {
  const bounds = app.print_bounds || {}
  return {
    x: num(bounds.x, 0),
    y: num(bounds.y, 0),
    w: Math.max(1, num(bounds.w, app.garment.w)),
    h: Math.max(1, num(bounds.h, app.garment.h)),
  }
}

function getStoredRegionBounds(app, region) {
  const printBounds = getPrintBounds(app)
  const raw = app.region_bounds?.[String(region || 'auto')]
  if (!raw || typeof raw !== 'object') return null

  const x = clamp(Math.round(num(raw.x, printBounds.x)), printBounds.x, printBounds.x + printBounds.w - 1)
  const y = clamp(Math.round(num(raw.y, printBounds.y)), printBounds.y, printBounds.y + printBounds.h - 1)
  const maxW = Math.max(1, printBounds.x + printBounds.w - x)
  const maxH = Math.max(1, printBounds.y + printBounds.h - y)
  return {
    x,
    y,
    w: clamp(Math.round(num(raw.w, printBounds.w)), 1, maxW),
    h: clamp(Math.round(num(raw.h, printBounds.h)), 1, maxH),
  }
}

function regionBoundsFromPrintBounds(printBounds, region) {
  const rects = {
    chest: () => rectFromBounds(printBounds, 0.3, 0.22, 0.7, 0.42),
    abdomen: () => rectFromBounds(printBounds, 0.3, 0.48, 0.7, 0.72),
    back: () => rectFromBounds(printBounds, 0.26, 0.2, 0.74, 0.58),
    left_sleeve: () => rectFromBounds(printBounds, 0.06, 0.18, 0.32, 0.38),
    right_sleeve: () => rectFromBounds(printBounds, 0.68, 0.18, 0.94, 0.38),
  }
  const factory = rects[String(region || 'auto')]
  return factory ? factory() : printBounds
}

function getActiveBounds(app) {
  const printBounds = getPrintBounds(app)
  if (!app.lock_region) return printBounds
  if (String(app.region || 'auto') === 'auto') return printBounds
  return getStoredRegionBounds(app, app.region) || regionBoundsFromPrintBounds(printBounds, app.region)
}

function normalizeAppState(input) {
  const app = {
    ...input,
    garment: { ...input.garment },
    print_bounds: { ...input.print_bounds },
    region_bounds: { ...(input.region_bounds || {}) },
    placement: { ...input.placement },
    size_ref: { ...input.size_ref },
    print_params: { ...input.print_params },
    embroidery_params: { ...input.embroidery_params },
  }
  const bounds = getActiveBounds(app)
  app.scale = clamp(num(app.scale, 1), 0.2, 3)
  app.placement.width = clamp(Math.round(num(app.placement.width, app.size_ref.w)), 1, bounds.w)
  app.placement.height = clamp(Math.round(num(app.placement.height, app.size_ref.h)), 1, bounds.h)
  app.placement.x = clamp(Math.round(num(app.placement.x, bounds.x)), bounds.x, bounds.x + bounds.w - app.placement.width)
  app.placement.y = clamp(Math.round(num(app.placement.y, bounds.y)), bounds.y, bounds.y + bounds.h - app.placement.height)
  app.placement.rotation = normalizeRotationDeg(num(app.placement.rotation, 0))
  app.text_color = normalizeHexColor(app.text_color, '#080808')
  app.logo_color = normalizeHexColor(app.logo_color, '#111111')
  return app
}

function applyScaleToPlacement(input) {
  const app = normalizeAppState(input)
  const bounds = getActiveBounds(app)
  const refW = clamp(num(app.size_ref?.w, app.placement.width), 1, bounds.w)
  const refH = clamp(num(app.size_ref?.h, app.placement.height), 1, bounds.h)
  const width = clamp(Math.round(refW * num(app.scale, 1)), 1, bounds.w)
  const height = clamp(Math.round(refH * num(app.scale, 1)), 1, bounds.h)
  const scaleW = width / Math.max(1, refW)
  const scaleH = height / Math.max(1, refH)

  return normalizeAppState({
    ...app,
    placement: { ...app.placement, width, height },
    scale: clamp(Math.min(scaleW, scaleH), 0.2, 3),
  })
}

function setSizeReferenceFromPlacement(app) {
  return normalizeAppState({
    ...app,
    size_ref: {
      w: Math.max(1, Math.round(num(app.placement.width, app.size_ref.w))),
      h: Math.max(1, Math.round(num(app.placement.height, app.size_ref.h))),
    },
    scale: 1,
  })
}

function applyStateData(current, data) {
  const modeRaw = String(data.render_mode || data.mode || current.mode || 'print').toLowerCase()
  const next = {
    ...current,
    garment: { ...current.garment, ...(data.garment || {}) },
    print_bounds: { ...current.print_bounds, ...(data.print_bounds || {}) },
    region_bounds:
      data.region_bounds && typeof data.region_bounds === 'object' ? { ...data.region_bounds } : current.region_bounds,
    placement: { ...current.placement, ...(data.placement || {}) },
    mode: modeRaw === 'embroidery' ? 'embroidery' : 'print',
    region: data.region || current.region,
    overlay_type: data.overlay_type || current.overlay_type,
    text: typeof data.text === 'string' ? data.text : current.text,
    text_color: typeof data.text_color === 'string' ? normalizeHexColor(data.text_color, current.text_color) : current.text_color,
    logo_color_enabled:
      typeof data.logo_color_enabled === 'boolean' ? data.logo_color_enabled : current.logo_color_enabled,
    logo_color: typeof data.logo_color === 'string' ? normalizeHexColor(data.logo_color, current.logo_color) : current.logo_color,
    print_params: { ...current.print_params, ...(data.print_params || {}) },
    embroidery_params: { ...current.embroidery_params, ...(data.embroidery_params || {}) },
    downscale: 1,
  }

  if (Number.isFinite(num(data.opacity, Number.NaN))) next.print_params.opacity = num(data.opacity, next.print_params.opacity)
  if (data.blend_mode) next.print_params.blend_mode = String(data.blend_mode)
  if (Number.isFinite(num(data.distortion, Number.NaN))) {
    next.print_params.displacement_strength = num(data.distortion, 0.6) / 0.18
  }
  if (Number.isFinite(num(data.lighting, Number.NaN))) {
    next.print_params.shade_strength = num(data.lighting, next.print_params.shade_strength)
  }
  if (Number.isFinite(num(data.texture, Number.NaN))) {
    next.print_params.texture_strength = num(data.texture, 0.5) / 1.6
  }

  ;[
    'embroidery_depth',
    'stitch_density',
    'thread_shine',
    'edge_raised',
    'fabric_influence',
    'thread_texture_strength',
  ].forEach((key) => {
    if (Number.isFinite(num(data[key], Number.NaN))) {
      next.embroidery_params[key] = num(data[key], next.embroidery_params[key])
    }
  })

  return setSizeReferenceFromPlacement(next)
}

function apiPath(app, endpoint) {
  const clean = String(endpoint || '').replace(/^\/+/, '')
  const path = app.session_id
    ? `/api/session/${encodeURIComponent(app.session_id)}/${clean}`
    : `/api/${clean}`
  return assetUrl(path)
}

function assetUrl(path) {
  const normalized = String(path || '')
  const baseUrl = currentApiBaseUrl()
  if (!baseUrl || baseUrl === frontendUrl()) return normalized
  return `${baseUrl}${normalized.startsWith('/') ? normalized : `/${normalized}`}`
}

function frontendUrl() {
  return window.location.origin
}

function publicSessionUrl(sessionId) {
  const url = new URL(window.location.href)
  const backendBase = API_BASE_URL || readBackendBaseFromUrl()
  if (!sessionId) {
    url.searchParams.delete('session')
    return url
  }
  url.searchParams.set('session', sessionId)
  if (backendBase) {
    url.searchParams.set('backend', backendBase)
  } else {
    url.searchParams.delete('backend')
  }
  return url
}

function readBackendBaseFromUrl() {
  const value = new URL(window.location.href).searchParams.get('backend')
  return String(value || '').trim().replace(/\/+$/, '')
}

function currentApiBaseUrl() {
  return API_BASE_URL || readBackendBaseFromUrl() || frontendUrl()
}

function apiRootPath(path) {
  return assetUrl(path)
}

function apiPathForSession(sessionId, endpoint) {
  const clean = String(endpoint || '').replace(/^\/+/, '')
  return assetUrl(`/api/session/${encodeURIComponent(sessionId)}/${clean}`)
}

function statePath(sessionId) {
  return sessionId ? apiPathForSession(sessionId, 'state') : apiRootPath('/api/state')
}

function sessionCreatePath() {
  return apiRootPath('/api/session')
}

function garmentImagePath(sessionId, version) {
  const path = sessionId
    ? `/api/session/${encodeURIComponent(sessionId)}/garment.png?v=${version}`
    : `/shirt.png?v=${version}`
  return assetUrl(path)
}

function apiHealthLabel() {
  const origin = currentApiBaseUrl()
  return origin === frontendUrl() ? 'same-origin' : origin
}

function renderPayload(app) {
  const print = app.print_params
  const embroidery = app.embroidery_params

  return {
    x: app.placement.x,
    y: app.placement.y,
    width: app.placement.width,
    height: app.placement.height,
    rotation: app.placement.rotation,
    mode: app.mode,
    render_mode: app.mode,
    downscale: app.downscale,
    overlay_type: app.overlay_type,
    text: app.text,
    text_color: app.text_color,
    logo_color_enabled: Boolean(app.logo_color_enabled),
    logo_color: app.logo_color_enabled && app.overlay_type !== 'text' ? app.logo_color : null,
    opacity: num(print.opacity, 0.85),
    blend_mode: String(print.blend_mode || 'normal'),
    distortion_strength: num(print.displacement_strength, 2.75) * 0.18,
    lighting_strength: num(print.shade_strength, 0.9),
    texture_strength: num(print.texture_strength, 0.22) * 1.6,
    brightness_strength: num(print.ink_strength, 0.85),
    edge_softness: num(print.edge_soften, 0.35),
    bleed_strength: num(print.ink_bleed, 0.12) * 2,
    color_strength: num(print.dye_strength, 0),
    embroidery_depth: num(embroidery.embroidery_depth, 0.35),
    stitch_density: num(embroidery.stitch_density, 0.7),
    thread_shine: num(embroidery.thread_shine, 0.2),
    edge_raised: num(embroidery.edge_raised, 0.25),
    fabric_influence: num(embroidery.fabric_influence, 0.35),
    thread_texture_strength: num(embroidery.thread_texture_strength, 0.6),
    print_params: print,
    embroidery_params: embroidery,
  }
}

function computeCanvasViewport(canvas, garment) {
  if (!canvas) return null

  const width = canvas.clientWidth
  const height = canvas.clientHeight
  if (!width || !height) return null

  const garmentWidth = Math.max(1, num(garment?.w, 1))
  const garmentHeight = Math.max(1, num(garment?.h, 1))
  const scale = Math.min(width / garmentWidth, height / garmentHeight)
  const renderWidth = garmentWidth * scale
  const renderHeight = garmentHeight * scale
  const left = (width - renderWidth) / 2
  const top = (height - renderHeight) / 2

  return {
    left,
    top,
    width: renderWidth,
    height: renderHeight,
    sx: garmentWidth / renderWidth,
    sy: garmentHeight / renderHeight,
  }
}

function Section({ title, eyebrow, children }) {
  return (
    <section className="surface-panel space-y-4 p-5">
      <div className="space-y-1">
        <div className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[var(--muted-strong)]">
          {eyebrow}
        </div>
        <h2 className="text-lg font-semibold text-[var(--ink)]">{title}</h2>
      </div>
      {children}
    </section>
  )
}

function SliderField({ label, value, min, max, step, onChange }) {
  return (
    <label className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-[var(--ink)]">{label}</span>
        <span className="rounded-full bg-[var(--chip)] px-2.5 py-1 text-xs font-semibold text-[var(--muted-strong)]">
          {Number(value).toFixed(2)}
        </span>
      </div>
      <input
        className="studio-range"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

function SelectField({ label, value, options, onChange }) {
  return (
    <label className="space-y-2">
      <span className="text-sm font-medium text-[var(--ink)]">{label}</span>
      <select className="studio-input" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

function Metric({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/70 px-3 py-2 shadow-[0_12px_28px_rgba(15,23,42,0.06)]">
      <div className="text-[0.65rem] uppercase tracking-[0.22em] text-[var(--muted)]">{label}</div>
      <div className="mt-1 text-sm font-semibold text-[var(--ink)]">{value}</div>
    </div>
  )
}

function App() {
  const [app, setApp] = useState(DEFAULT_APP_STATE)
  const [status, setStatus] = useState('Загрузка...')
  const [previewUrl, setPreviewUrl] = useState('')
  const [templateFile, setTemplateFile] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [booted, setBooted] = useState(false)
  const [baseImageVersion, setBaseImageVersion] = useState(Date.now())
  const [canvasViewport, setCanvasViewport] = useState(null)

  const appRef = useRef(DEFAULT_APP_STATE)
  const previewUrlRef = useRef('')
  const renderTimeoutRef = useRef(null)
  const renderAbortRef = useRef(null)
  const renderCounterRef = useRef(0)
  const canvasRef = useRef(null)
  const dragRef = useRef({ active: false, dx: 0, dy: 0 })

  function commitApp(nextOrUpdater) {
    const next =
      typeof nextOrUpdater === 'function' ? nextOrUpdater(appRef.current) : nextOrUpdater
    const normalized = normalizeAppState(next)
    appRef.current = normalized
    setApp(normalized)
    return normalized
  }

  function refreshBaseImage() {
    setBaseImageVersion(Date.now())
  }

  async function renderPreview() {
    const snapshot = appRef.current
    const requestId = ++renderCounterRef.current
    renderAbortRef.current?.abort()
    const controller = new AbortController()
    renderAbortRef.current = controller
    setStatus('Рендер...')

    try {
      const response = await fetch(apiPath(snapshot, 'render'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(renderPayload(snapshot)),
        signal: controller.signal,
      })

      if (!response.ok) throw new Error(`${response.status}`)

      const blob = await response.blob()
      if (requestId !== renderCounterRef.current || controller.signal.aborted) return

      const nextUrl = URL.createObjectURL(blob)
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
      previewUrlRef.current = nextUrl
      setPreviewUrl(nextUrl)
      setStatus('Готово')
    } catch (error) {
      if (controller.signal.aborted || error?.name === 'AbortError') return
      if (requestId === renderCounterRef.current) setStatus('Ошибка рендера')
    } finally {
      if (renderAbortRef.current === controller) {
        renderAbortRef.current = null
      }
    }
  }

  function queueRender(delay = 120) {
    if (!booted) return
    window.clearTimeout(renderTimeoutRef.current)
    renderTimeoutRef.current = window.setTimeout(() => {
      renderPreview()
    }, delay)
  }

  async function apiJson(path, payload) {
    const response = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!response.ok) throw new Error(`${response.status}`)
    return response.json()
  }

  async function handleAutoplace({ silent = false } = {}) {
    const snapshot = appRef.current
    if (!silent) setStatus('Размещаем...')

    try {
      const result = await apiJson(apiPath(snapshot, 'autoplace'), {
        region: String(snapshot.region || 'auto'),
        fill: 0.72,
      })

      commitApp((current) =>
        setSizeReferenceFromPlacement({
          ...current,
          print_bounds: result.print_bounds || current.print_bounds,
          region_bounds:
            result.region_bounds && typeof result.region_bounds === 'object'
              ? { ...result.region_bounds }
              : current.region_bounds,
          placement: { ...current.placement, ...(result.placement || {}) },
          region: result.region || current.region,
        }),
      )

      setStatus(silent ? 'Зона обновлена' : 'Размещение готово')
      await renderPreview()
    } catch {
      if (!silent) setStatus('Не удалось разместить')
    }
  }

  function currentCanvasViewport() {
    const canvas = canvasRef.current
    const rect = canvas?.getBoundingClientRect()
    const viewport = computeCanvasViewport(canvas, appRef.current.garment)
    if (!rect || !viewport) return null
    return { rect, ...viewport }
  }

  function pointerToImagePosition(event) {
    const viewport = currentCanvasViewport()
    if (!viewport) return null
    return {
      x: (event.clientX - viewport.rect.left - viewport.left) * viewport.sx,
      y: (event.clientY - viewport.rect.top - viewport.top) * viewport.sy,
    }
  }

  function handlePointerDown(event) {
    const point = pointerToImagePosition(event)
    if (!point) return

    event.preventDefault()
    canvasRef.current?.setPointerCapture?.(event.pointerId)
    dragRef.current = {
      active: true,
      dx: point.x - appRef.current.placement.x,
      dy: point.y - appRef.current.placement.y,
    }
  }

  function handlePointerMove(event) {
    if (!dragRef.current.active) return
    const point = pointerToImagePosition(event)
    if (!point) return

    event.preventDefault()
    commitApp((current) => ({
      ...current,
      placement: {
        ...current.placement,
        x: Math.round(point.x - dragRef.current.dx),
        y: Math.round(point.y - dragRef.current.dy),
      },
    }))
    queueRender(90)
  }

  function handlePointerUp(event) {
    if (!dragRef.current.active) return
    event.preventDefault()
    dragRef.current.active = false
    queueRender(40)
  }

  function handleWheel(event) {
    if (!event.altKey) return
    event.preventDefault()
    const delta = event.deltaY > 0 ? -0.04 : 0.04
    commitApp((current) =>
      applyScaleToPlacement({
        ...current,
        scale: clamp(num(current.scale, 1) + delta, 0.2, 3),
      }),
    )
    queueRender(60)
  }

  async function handleUploadSession() {
    if (!templateFile || !logoFile) {
      setStatus('Выберите template и logo')
      return
    }

    const form = new FormData()
    form.append('template', templateFile)
    form.append('logo', logoFile)

    setStatus('Загрузка файлов...')

    try {
      const response = await fetch(sessionCreatePath(), { method: 'POST', body: form })
      if (!response.ok) throw new Error(`${response.status}`)
      const result = await response.json()

      commitApp((current) =>
        applyStateData(
          {
            ...current,
            session_id: result.session_id || null,
            overlay_type: 'logo',
            text: '',
          },
          result.state || {},
        ),
      )

      refreshBaseImage()
      setStatus('Сессия загружена')
      await renderPreview()
    } catch {
      setStatus('Ошибка загрузки')
    }
  }

  async function handleDownload() {
    if (!previewUrlRef.current) {
      await renderPreview()
    }
    if (!previewUrlRef.current) {
      setStatus('Нечего скачивать')
      return
    }

    const link = document.createElement('a')
    link.href = previewUrlRef.current
    link.download = appRef.current.overlay_type === 'text' ? 'text-render.png' : 'logo-render.png'
    document.body.appendChild(link)
    link.click()
    link.remove()
    setStatus('PNG сохранен')
  }

  useEffect(() => {
    appRef.current = app
  }, [app])

  useEffect(() => {
    let mounted = true

    async function boot() {
      setStatus('Загрузка...')
      const url = new URL(window.location.href)
      const sessionId = url.searchParams.get('session')
      let nextState = DEFAULT_APP_STATE

      try {
        if (sessionId) {
          const response = await fetch(statePath(sessionId))
          if (response.ok) {
            const data = await response.json()
            nextState = applyStateData({ ...DEFAULT_APP_STATE, session_id: sessionId }, data)
          } else {
            url.searchParams.delete('session')
            window.history.replaceState({}, '', url)
          }
        }

        if (!sessionId || !nextState.session_id) {
          const response = await fetch(statePath(null))
          const data = await response.json()
          nextState = applyStateData(DEFAULT_APP_STATE, data)
        }

        if (!mounted) return
        commitApp(nextState)
        refreshBaseImage()
        setBooted(true)
      } catch {
        if (!mounted) return
        commitApp(DEFAULT_APP_STATE)
        setBooted(true)
        setStatus('Не удалось загрузить backend')
      }
    }

    boot()

    return () => {
      mounted = false
      window.clearTimeout(renderTimeoutRef.current)
      renderAbortRef.current?.abort()
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [])

  useEffect(() => {
    if (!booted) return
    const url = publicSessionUrl(app.session_id)
    window.history.replaceState({}, '', url)
  }, [app.session_id, booted])

  useEffect(() => {
    if (!booted) return
    renderPreview()
  }, [booted])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const syncViewport = () => {
      setCanvasViewport(computeCanvasViewport(canvas, appRef.current.garment))
    }

    syncViewport()

    const observer = new ResizeObserver(() => {
      syncViewport()
    })

    observer.observe(canvas)
    window.addEventListener('resize', syncViewport)

    return () => {
      observer.disconnect()
      window.removeEventListener('resize', syncViewport)
    }
  }, [app.garment.w, app.garment.h])

  const bounds = getActiveBounds(app)
  const viewport = canvasViewport || {
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  }
  const scaleX = viewport.width / Math.max(1, app.garment.w)
  const scaleY = viewport.height / Math.max(1, app.garment.h)
  const boxStyle = {
    left: `${viewport.left + app.placement.x * scaleX}px`,
    top: `${viewport.top + app.placement.y * scaleY}px`,
    width: `${app.placement.width * scaleX}px`,
    height: `${app.placement.height * scaleY}px`,
    transform: `rotate(${app.placement.rotation}deg)`,
  }
  const regionStyle = {
    display: app.lock_region && app.region !== 'auto' ? 'block' : 'none',
    left: `${viewport.left + bounds.x * scaleX}px`,
    top: `${viewport.top + bounds.y * scaleY}px`,
    width: `${bounds.w * scaleX}px`,
    height: `${bounds.h * scaleY}px`,
  }

  const baseImageSrc = garmentImagePath(app.session_id, baseImageVersion)

  return (
    <div className="min-h-screen px-4 py-5 text-[var(--ink)] sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1680px] flex-col gap-5">
        <header className="surface-panel overflow-hidden p-6 sm:p-7">
          <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[var(--muted-strong)]">
                Primerch Studio
              </div>
              <div className="max-w-3xl space-y-3">
                <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)] sm:text-4xl lg:text-[3.35rem]">
                  Современный конструктор принта
                </h1>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-1">
              <Metric label="Статус" value={status} />
              <Metric label="Сессия" value={app.session_id ? app.session_id.slice(0, 12) : 'default'} />
              <Metric label="Overlay" value={app.overlay_type === 'text' ? 'Text' : 'Logo'} />
            </div>
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <Section eyebrow="Session" title="Файлы и подключение">
              <div className="grid gap-3">
                <label className="space-y-2">
                  <span className="text-sm font-medium text-[var(--ink)]">Template image</span>
                  <input
                    className="studio-input file:mr-3 file:rounded-full file:border-0 file:bg-[var(--ink)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                    type="file"
                    accept="image/*"
                    onChange={(event) => setTemplateFile(event.target.files?.[0] || null)}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-[var(--ink)]">Logo image</span>
                  <input
                    className="studio-input file:mr-3 file:rounded-full file:border-0 file:bg-[var(--ink)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                    type="file"
                    accept="image/*"
                    onChange={(event) => setLogoFile(event.target.files?.[0] || null)}
                  />
                </label>

                <button className="studio-button studio-button-primary" onClick={handleUploadSession}>
                  Upload template + logo
                </button>
              </div>
            </Section>

            <Section eyebrow="Placement" title="Положение и режим">
              <div className="grid gap-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <SelectField
                    label="Mode"
                    value={app.mode}
                    options={MODE_OPTIONS}
                    onChange={(value) => {
                      commitApp((current) => ({ ...current, mode: value === 'embroidery' ? 'embroidery' : 'print' }))
                      queueRender(70)
                    }}
                  />
                  <SelectField
                    label="Print zone"
                    value={app.region}
                    options={REGION_OPTIONS}
                    onChange={(value) => {
                      commitApp((current) => ({ ...current, region: value || 'auto' }))
                      if (appRef.current.lock_region && value !== 'auto') {
                        handleAutoplace({ silent: true })
                      } else {
                        queueRender(80)
                      }
                    }}
                  />
                </div>

                <label className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3">
                  <span>
                    <div className="text-sm font-medium text-[var(--ink)]">Lock to zone</div>
                    <div className="text-xs text-[var(--muted)]">Ограничивает объект активной областью печати.</div>
                  </span>
                  <input
                    className="h-5 w-5 accent-[var(--accent)]"
                    type="checkbox"
                    checked={app.lock_region}
                    onChange={(event) => {
                      const checked = event.target.checked
                      commitApp((current) => ({ ...current, lock_region: checked }))
                      if (checked && appRef.current.region !== 'auto') {
                        handleAutoplace({ silent: true })
                      } else {
                        queueRender(80)
                      }
                    }}
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button className="studio-button" onClick={() => handleAutoplace()}>
                    Place in selected zone
                  </button>
                  <button className="studio-button" onClick={handleDownload}>
                    Download PNG
                  </button>
                </div>

                <SliderField
                  label="Scale"
                  value={app.scale}
                  min={0.2}
                  max={3}
                  step={0.01}
                  onChange={(value) => {
                    commitApp((current) => applyScaleToPlacement({ ...current, scale: value }))
                    queueRender(90)
                  }}
                />

                <SliderField
                  label="Rotation"
                  value={app.placement.rotation}
                  min={-180}
                  max={180}
                  step={1}
                  onChange={(value) => {
                    commitApp((current) => ({
                      ...current,
                      placement: { ...current.placement, rotation: value },
                    }))
                    queueRender(90)
                  }}
                />

                <SelectField
                  label="Preview scale"
                  value={String(app.downscale)}
                  options={[
                    { value: '1', label: '1.0x' },
                    { value: '0.75', label: '0.75x' },
                    { value: '0.5', label: '0.5x' },
                  ]}
                  onChange={(value) => {
                    commitApp((current) => ({ ...current, downscale: Number(value) }))
                    queueRender(60)
                  }}
                />
              </div>
            </Section>

            <Section eyebrow="Overlay" title="Текст, цвет и лого">
              <div className="grid gap-4">
                <div className="inline-flex rounded-full border border-[var(--line)] bg-[var(--chip)] p-1">
                  {[
                    { value: 'logo', label: 'Logo' },
                    { value: 'text', label: 'Text' },
                  ].map((option) => (
                    <button
                      key={option.value}
                      className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                        app.overlay_type === option.value
                          ? 'bg-[var(--ink)] text-white shadow-[0_10px_28px_rgba(15,23,42,0.16)]'
                          : 'text-[var(--muted-strong)]'
                      }`}
                      onClick={() => {
                        commitApp((current) => ({
                          ...current,
                          overlay_type: option.value,
                          text: option.value === 'text' && !current.text ? 'Studio Line' : current.text,
                        }))
                        queueRender(30)
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-[var(--ink)]">Overlay text</span>
                  <textarea
                    className="studio-input min-h-28 resize-none"
                    placeholder="Например: SUMMER DROP"
                    value={app.text}
                    onChange={(event) => {
                      commitApp((current) => ({
                        ...current,
                        text: event.target.value.slice(0, 160),
                        overlay_type: current.overlay_type === 'logo' ? 'logo' : 'text',
                      }))
                      if (appRef.current.overlay_type === 'text') queueRender(120)
                    }}
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="space-y-2">
                    <span className="text-sm font-medium text-[var(--ink)]">Text color</span>
                    <input
                      className="studio-color"
                      type="color"
                      value={app.text_color}
                      onChange={(event) => {
                        commitApp((current) => ({ ...current, text_color: event.target.value || '#080808' }))
                        if (appRef.current.overlay_type === 'text') queueRender(40)
                      }}
                    />
                  </label>

                  <label className="space-y-2">
                    <span className="text-sm font-medium text-[var(--ink)]">Logo color</span>
                    <input
                      className="studio-color"
                      type="color"
                      value={app.logo_color}
                      disabled={!app.logo_color_enabled || app.overlay_type === 'text'}
                      onChange={(event) => {
                        commitApp((current) => ({
                          ...current,
                          logo_color: normalizeHexColor(event.target.value, current.logo_color),
                          logo_color_enabled: current.overlay_type === 'text' ? current.logo_color_enabled : true,
                        }))
                        if (appRef.current.overlay_type !== 'text') queueRender(40)
                      }}
                    />
                  </label>
                </div>

                <label className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3">
                  <span>
                    <div className="text-sm font-medium text-[var(--ink)]">Recolor logo</div>
                    <div className="text-xs text-[var(--muted)]">Активирует tint для logo render.</div>
                  </span>
                  <input
                    className="h-5 w-5 accent-[var(--accent)]"
                    type="checkbox"
                    checked={app.logo_color_enabled}
                    onChange={(event) => {
                      commitApp((current) => ({ ...current, logo_color_enabled: event.target.checked }))
                      queueRender(40)
                    }}
                  />
                </label>
              </div>
            </Section>

            <Section
              eyebrow={app.mode === 'print' ? 'Print realism' : 'Embroidery'}
              title={app.mode === 'print' ? 'Параметры материала' : 'Параметры вышивки'}
            >
              <div className="grid gap-4">
                {(app.mode === 'print' ? PRINT_CONTROLS : EMBROIDERY_CONTROLS).map((control) => (
                  <SliderField
                    key={control.key}
                    label={control.label}
                    value={
                      app.mode === 'print'
                        ? app.print_params[control.key]
                        : app.embroidery_params[control.key]
                    }
                    min={control.min}
                    max={control.max}
                    step={control.step}
                    onChange={(value) => {
                      if (app.mode === 'print') {
                        commitApp((current) => ({
                          ...current,
                          print_params: { ...current.print_params, [control.key]: value },
                        }))
                      } else {
                        commitApp((current) => ({
                          ...current,
                          embroidery_params: { ...current.embroidery_params, [control.key]: value },
                        }))
                      }
                      queueRender(80)
                    }}
                  />
                ))}
              </div>
            </Section>
          </aside>

          <main className="space-y-5">
            <section className="surface-panel overflow-hidden p-4 sm:p-5 lg:p-6">
              <div className="mb-4 flex flex-col gap-3 border-b border-[var(--line)] pb-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <div className="text-[0.68rem] font-semibold uppercase tracking-[0.28em] text-[var(--muted-strong)]">
                    Live Preview
                  </div>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
                    Canvas для drag, scale и render цикла
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <Metric label="X" value={app.placement.x} />
                  <Metric label="Y" value={app.placement.y} />
                  <Metric label="W" value={app.placement.width} />
                  <Metric label="H" value={app.placement.height} />
                  <Metric label="Rotate" value={`${Math.round(app.placement.rotation)}deg`} />
                </div>
              </div>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="space-y-3">
                  <div
                    ref={canvasRef}
                    className="relative aspect-square overflow-hidden rounded-[30px] border border-white/70 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.92),_rgba(238,243,248,0.9)_55%,_rgba(227,232,240,0.95))] shadow-[0_36px_90px_rgba(15,23,42,0.12)]"
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    onWheel={handleWheel}
                  >
                    <img
                      className="absolute inset-0 h-full w-full object-contain"
                      src={baseImageSrc}
                      alt="Garment"
                      draggable="false"
                    />
                    {previewUrl ? (
                      <img
                        className="absolute inset-0 h-full w-full object-contain"
                        src={previewUrl}
                        alt="Render preview"
                        draggable="false"
                      />
                    ) : null}

                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_38%,_rgba(15,23,42,0.06)_100%)]" />

                    <div
                      className="pointer-events-none absolute rounded-[20px] border border-dashed border-[rgba(73,107,255,0.4)] bg-[rgba(73,107,255,0.08)]"
                      style={regionStyle}
                    />

                    <div
                      className="pointer-events-none absolute rounded-[22px] border-2 border-[rgba(32,69,246,0.8)] shadow-[0_0_0_999px_rgba(9,14,26,0.08)_inset]"
                      style={boxStyle}
                    />

                    <div className="pointer-events-none absolute bottom-4 left-4 rounded-full border border-white/80 bg-white/80 px-3 py-2 text-xs font-semibold tracking-[0.14em] text-[var(--muted-strong)] backdrop-blur">
                      Drag to move. Alt + scroll to scale.
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-3xl border border-[var(--line)] bg-white/75 p-4">
                      <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Режим</div>
                      <div className="mt-2 text-lg font-semibold text-[var(--ink)]">{app.mode}</div>
                    </div>
                    <div className="rounded-3xl border border-[var(--line)] bg-white/75 p-4">
                      <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Зона</div>
                      <div className="mt-2 text-lg font-semibold text-[var(--ink)]">{app.region}</div>
                    </div>
                    <div className="rounded-3xl border border-[var(--line)] bg-white/75 p-4">
                      <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Preview scale</div>
                      <div className="mt-2 text-lg font-semibold text-[var(--ink)]">{app.downscale}x</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[28px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(17,24,39,0.96),rgba(31,41,55,0.96))] p-5 text-white shadow-[0_28px_70px_rgba(15,23,42,0.18)]">
                    <div className="text-[0.68rem] uppercase tracking-[0.28em] text-white/60">Workflow</div>
                    <div className="mt-3 space-y-3 text-sm text-white/78">
                      <p>1. Загрузи template и logo, если нужен новый товар.</p>
                      <p>2. Выбери зону и режим, потом жми autoplace или двигай вручную.</p>
                      <p>3. Настрой realism / embroidery и скачай итоговый PNG.</p>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-[var(--line)] bg-white/75 p-5">
                    <div className="text-[0.68rem] uppercase tracking-[0.28em] text-[var(--muted-strong)]">
                      Render bounds
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <Metric label="Bound X" value={bounds.x} />
                      <Metric label="Bound Y" value={bounds.y} />
                      <Metric label="Bound W" value={bounds.w} />
                      <Metric label="Bound H" value={bounds.h} />
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      </div>
    </div>
  )
}

export default App
