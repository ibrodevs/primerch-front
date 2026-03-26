import { useEffect, useEffectEvent, useRef, useState } from 'react'
import baseCatalog from './base.json'

const API_BASE_URL = String(import.meta.env.VITE_API_BASE_URL || '').trim().replace(/\/+$/, '')
const BOOT_REQUEST_TIMEOUT_MS = 8000
const API_REQUEST_TIMEOUT_MS = 12000
const RENDER_REQUEST_TIMEOUT_MS = 20000
const WARMUP_REQUEST_TIMEOUT_MS = 65000
const SESSION_CREATE_TIMEOUT_MS = 90000
const BACKEND_READY_TTL_MS = 120000
const TEMPLATE_UPLOAD_MAX_EDGE = 2200
const LOGO_UPLOAD_MAX_EDGE = 1400

const REGION_OPTIONS = [
  { value: 'auto', label: 'Авто' },
  { value: 'chest', label: 'Грудь' },
  { value: 'abdomen', label: 'Живот' },
  { value: 'back', label: 'Спина' },
  { value: 'left_sleeve', label: 'Левый рукав' },
  { value: 'right_sleeve', label: 'Правый рукав' },
]

const MODE_LABELS = {
  print: 'Принт',
  embroidery: 'Вышивка',
  screen_print: 'Шелкография',
  dtf: 'DTF',
  dtg: 'DTG',
  heat_transfer: 'Термотрансфер',
  sublimation: 'Сублимация',
  flex: 'Флекс',
  flock: 'Флок',
  puff: 'Пухлый принт',
  high_density: 'Высокая плотность',
  reflective: 'Светоотражающий',
  foil: 'Фольга',
  glitter: 'Глиттер',
  neon: 'Неон',
  glow: 'Свечение',
  rubber_print: 'Резиновый принт',
  water_based: 'Водная краска',
  plastisol: 'Пластизоль',
}

const MODE_DESCRIPTIONS = {
  print: 'Базовый принт с реалистичным впитыванием и влиянием ткани.',
  embroidery: 'Вышивка с рельефом, нитяной текстурой и тенями по краю.',
  screen_print: 'Плотная шелкография: ярко, плоско, с минимальной текстурой ткани.',
  dtf: 'Пленочный перенос: слегка отделяется от ткани, есть мягкая подложка и пластик.',
  dtg: 'Прямая печать по ткани: мягкие края, ниже контраст, сильнее впитывание.',
  heat_transfer: 'Термотрансфер: гладкая наклейка с легким глянцем.',
  sublimation: 'Сублимация: почти без границ, максимально интегрирована в ткань.',
  flex: 'Ровная пленка с четким контуром и почти без текстуры ткани.',
  flock: 'Бархатистая поверхность с мягким ворсом и глубиной.',
  puff: 'Вспененный объемный принт с расширенным силуэтом и рельефом.',
  high_density: 'Плотный высокий принт с жестким краем и направленным светом.',
  reflective: 'Светоотражающий материал с сильными бликами в ярких областях.',
  foil: 'Металлизированная фольга с зеркальными градиентами и сдвигом цвета.',
  glitter: 'Блестки с искрами, шумом и яркими отражающими точками.',
  neon: 'Кислотный яркий цвет с внешним свечением.',
  glow: 'Фосфоресцентный эффект с мягким ореолом по краю.',
  rubber_print: 'Плотный резиновый слой с мягким краем и умеренной толщиной.',
  water_based: 'Мягкий водный принт с сильной интеграцией в ткань.',
  plastisol: 'Яркий плотный слой с высоким контрастом и насыщенностью.',
}

const MODE_OPTIONS = Object.entries(MODE_LABELS).map(([value, label]) => ({ value, label }))

const MODE_PRESETS = {
  print: {
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
  },
  embroidery: {
    embroidery_params: {
      embroidery_depth: 0.35,
      stitch_density: 0.7,
      thread_shine: 0.2,
      edge_raised: 0.25,
      fabric_influence: 0.35,
      thread_texture_strength: 0.6,
    },
  },
  screen_print: { material_params: { intensity: 0.78, texture_strength: 0.12, depth: 0.22, gloss: 0.14 } },
  dtf: { material_params: { intensity: 0.78, texture_strength: 0.26, depth: 0.46, gloss: 0.4 } },
  dtg: { material_params: { intensity: 0.62, texture_strength: 0.82, depth: 0.14, gloss: 0.08 } },
  heat_transfer: { material_params: { intensity: 0.74, texture_strength: 0.16, depth: 0.3, gloss: 0.46 } },
  sublimation: { material_params: { intensity: 0.58, texture_strength: 0.94, depth: 0.04, gloss: 0.02 } },
  flex: { material_params: { intensity: 0.72, texture_strength: 0.05, depth: 0.24, gloss: 0.28 } },
  flock: { material_params: { intensity: 0.68, texture_strength: 0.32, depth: 0.54, gloss: 0.08 } },
  puff: { material_params: { intensity: 0.8, texture_strength: 0.14, depth: 0.86, gloss: 0.22 } },
  high_density: { material_params: { intensity: 0.82, texture_strength: 0.12, depth: 0.92, gloss: 0.34 } },
  reflective: { material_params: { intensity: 0.82, texture_strength: 0.18, depth: 0.36, gloss: 0.92 } },
  foil: { material_params: { intensity: 0.88, texture_strength: 0.08, depth: 0.34, gloss: 0.96 } },
  glitter: { material_params: { intensity: 0.86, texture_strength: 0.14, depth: 0.28, gloss: 0.8 } },
  neon: { material_params: { intensity: 0.9, texture_strength: 0.12, depth: 0.16, gloss: 0.56 } },
  glow: { material_params: { intensity: 0.82, texture_strength: 0.18, depth: 0.12, gloss: 0.68 } },
  rubber_print: { material_params: { intensity: 0.74, texture_strength: 0.24, depth: 0.46, gloss: 0.24 } },
  water_based: { material_params: { intensity: 0.56, texture_strength: 0.84, depth: 0.08, gloss: 0.04 } },
  plastisol: { material_params: { intensity: 0.84, texture_strength: 0.14, depth: 0.42, gloss: 0.38 } },
}

const PRINT_CONTROLS = [
  { key: 'cylindrical_strength', label: 'Кривизна', min: 0, max: 0.25, step: 0.005 },
  { key: 'displacement_strength', label: 'Деформация', min: 0, max: 6, step: 0.05 },
  { key: 'shade_strength', label: 'Затенение', min: 0, max: 1, step: 0.01 },
  { key: 'texture_strength', label: 'Текстура', min: 0, max: 0.6, step: 0.01 },
  { key: 'absorption_blur', label: 'Впитывание', min: 0, max: 1.5, step: 0.02 },
  { key: 'edge_soften', label: 'Смягчение краев', min: 0, max: 1.2, step: 0.02 },
  { key: 'ink_bleed', label: 'Растекание краски', min: 0, max: 0.45, step: 0.01 },
  { key: 'dye_strength', label: 'Краситель', min: 0, max: 1, step: 0.01 },
]

const EMBROIDERY_CONTROLS = [
  { key: 'embroidery_depth', label: 'Глубина', min: 0, max: 1, step: 0.01 },
  { key: 'stitch_density', label: 'Плотность стежка', min: 0, max: 1, step: 0.01 },
  { key: 'thread_shine', label: 'Блеск нити', min: 0, max: 1, step: 0.01 },
  { key: 'edge_raised', label: 'Поднятый край', min: 0, max: 1, step: 0.01 },
  { key: 'fabric_influence', label: 'Влияние ткани', min: 0, max: 1, step: 0.01 },
  { key: 'thread_texture_strength', label: 'Текстура нити', min: 0, max: 1, step: 0.01 },
]

const MATERIAL_CONTROLS = [
  { key: 'intensity', label: 'Интенсивность', min: 0, max: 1, step: 0.01 },
  { key: 'texture_strength', label: 'Передача текстуры', min: 0, max: 1, step: 0.01 },
  { key: 'depth', label: 'Глубина', min: 0, max: 1, step: 0.01 },
  { key: 'gloss', label: 'Глянец', min: 0, max: 1, step: 0.01 },
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
  supported_render_modes: MODE_OPTIONS.map((option) => option.value),
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
  material_params: {
    intensity: 0.65,
    texture_strength: 0.5,
    depth: 0.35,
    gloss: 0.25,
  },
}

const PREVIEW_STATE_META = {
  loading: {
    label: 'Загрузка',
    badgeClass:
      'border-blue-200/80 bg-white/90 text-blue-700 shadow-[0_18px_40px_rgba(32,69,246,0.12)]',
    dotClass: 'bg-blue-500',
  },
  ready: {
    label: 'Готово',
    badgeClass:
      'border-emerald-200/80 bg-white/90 text-emerald-700 shadow-[0_18px_40px_rgba(34,197,94,0.12)]',
    dotClass: 'bg-emerald-500',
  },
  error: {
    label: 'Ошибка',
    badgeClass:
      'border-rose-200/80 bg-white/90 text-rose-700 shadow-[0_18px_40px_rgba(244,63,94,0.14)]',
    dotClass: 'bg-rose-500',
  },
}

const GIFTS_HOSTNAME = 'files.gifts.ru'
const CATALOG_IMAGE_PROXY_PATH = '/catalog-image'
const CATALOG_PRODUCT_PRIORITY = [
  'Футболка T-bolka 140',
  'Худи Kirenga 2.0',
  'Свитшот Toima 2.0',
  'Толстовка на молнии с капюшоном Siverga 2.0',
  'Рубашка поло мужская Virma Light',
  'Фартук Neat',
  'Панама Challenge',
  'Бандана Overhead',
]

const catalogProductsByName = new Map(
  baseCatalog.map((item, index) => [String(item?.product_name || `catalog-product-${index}`), { item, index }]),
)

const CATALOG_PRODUCTS = CATALOG_PRODUCT_PRIORITY.map((name) => catalogProductsByName.get(name))
  .filter(Boolean)
  .map((item, index) => {
    const product = item.item
    const photos = Array.isArray(product?.photos)
      ? product.photos.filter((photo) => {
          try {
            return new URL(String(photo || '')).hostname === GIFTS_HOSTNAME
          } catch {
            return false
          }
        })
      : []

    if (!photos.length) return null

    const variants = Array.isArray(product?.variants)
      ? product.variants.filter((variant) => {
          const article = String(variant?.article || '').trim()
          const price = String(variant?.price || '').trim()
          return article && price && price !== '1' && !price.endsWith('.')
        })
      : []

    return {
      id: String(product?.product_url || `catalog-product-${index}`),
      name: String(product?.product_name || 'Товар'),
      url: String(product?.product_url || ''),
      description: String(product?.description || '').trim(),
      article: String(variants[0]?.article || product?.article || '').trim(),
      price: String(variants[0]?.price || '').replace(/[^\d.,]/g, '').replace(/,$/, ''),
      photos,
      variants,
    }
  })
  .filter(Boolean)

const DEFAULT_PRODUCT_ID = CATALOG_PRODUCTS[0]?.id || ''

function num(value, fallback = 0) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function shortText(value, maxLength = 160) {
  const text = String(value || '').replace(/\s+/g, ' ').trim()
  if (!text) return ''
  if (text.length <= maxLength) return text
  return `${text.slice(0, Math.max(0, maxLength - 1)).trimEnd()}…`
}

function formatPrice(value) {
  const numeric = Number.parseFloat(String(value || '').replace(',', '.'))
  if (!Number.isFinite(numeric) || numeric <= 0) return 'Цена по запросу'
  return `от ${Math.round(numeric)} ₽`
}

function catalogImageProxyUrl(url) {
  if (!url) return ''
  return `${CATALOG_IMAGE_PROXY_PATH}?url=${encodeURIComponent(url)}`
}

function remoteImageFetchCandidates(url) {
  const source = String(url || '').trim()
  if (!source) return []

  const candidates = []

  try {
    if (new URL(source).hostname === GIFTS_HOSTNAME) {
      candidates.push(catalogImageProxyUrl(source))
    }
  } catch {
    return []
  }

  candidates.push(source)
  return [...new Set(candidates)]
}

function fileNameFromUrl(url, fallback = 'catalog-template') {
  try {
    const pathname = new URL(String(url || '')).pathname
    const raw = pathname.split('/').pop() || fallback
    return raw.includes('.') ? raw : `${raw}.png`
  } catch {
    return `${fallback}.png`
  }
}

function fileSignature(file, fallbackLabel) {
  if (!file) return `${fallbackLabel}:none`
  return `${fallbackLabel}:${file.name}:${file.size}:${file.lastModified}`
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

function isEmbroideryMode(mode) {
  return String(mode || '').toLowerCase() === 'embroidery'
}

function isPrintMode(mode) {
  return String(mode || '').toLowerCase() === 'print'
}

function isMaterialMode(mode) {
  return !isPrintMode(mode) && !isEmbroideryMode(mode)
}

function buildModeOptions(modes) {
  const raw = Array.isArray(modes) && modes.length ? modes : MODE_OPTIONS.map((option) => option.value)
  return raw.map((value) => ({
    value,
    label: MODE_LABELS[value] || String(value || '').replace(/_/g, ' '),
  }))
}

function modeLabel(mode) {
  return MODE_LABELS[String(mode || '').toLowerCase()] || String(mode || '').replace(/_/g, ' ')
}

function modeDescription(mode) {
  return MODE_DESCRIPTIONS[String(mode || '').toLowerCase()] || 'Параметры зависят от выбранной технологии нанесения.'
}

function regionLabel(region) {
  return REGION_OPTIONS.find((option) => option.value === String(region || 'auto'))?.label || 'Авто'
}

function applyModePreset(app, mode) {
  const normalizedMode = String(mode || 'print').toLowerCase()
  const preset = MODE_PRESETS[normalizedMode] || {}
  return normalizeAppState({
    ...app,
    mode: normalizedMode,
    print_params: { ...app.print_params, ...(preset.print_params || {}) },
    embroidery_params: { ...app.embroidery_params, ...(preset.embroidery_params || {}) },
    material_params: { ...app.material_params, ...(preset.material_params || {}) },
  })
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

function getSelectedBounds(app) {
  const printBounds = getPrintBounds(app)
  if (String(app.region || 'auto') === 'auto') return printBounds
  return getStoredRegionBounds(app, app.region) || printBounds
}

function getActiveBounds(app) {
  return getSelectedBounds(app)
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
    material_params: { ...input.material_params },
    supported_render_modes: Array.isArray(input.supported_render_modes)
      ? [...input.supported_render_modes]
      : MODE_OPTIONS.map((option) => option.value),
  }
  const bounds = getActiveBounds(app)
  app.scale = clamp(num(app.scale, 1), 0.2, 3)
  app.placement.width = clamp(Math.round(num(app.placement.width, app.size_ref.w)), 1, bounds.w)
  app.placement.height = clamp(Math.round(num(app.placement.height, app.size_ref.h)), 1, bounds.h)
  app.placement.x = clamp(Math.round(num(app.placement.x, bounds.x)), bounds.x, bounds.x + bounds.w - app.placement.width)
  app.placement.y = clamp(Math.round(num(app.placement.y, bounds.y)), bounds.y, bounds.y + bounds.h - app.placement.height)
  app.placement.rotation = normalizeRotationDeg(num(app.placement.rotation, 0))
  app.downscale = clamp(num(app.downscale, DEFAULT_APP_STATE.downscale), 0.25, 1)
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
    mode: modeRaw || 'print',
    supported_render_modes: Array.isArray(data.supported_render_modes)
      ? [...data.supported_render_modes]
      : current.supported_render_modes,
    region: data.region || current.region,
    overlay_type: data.overlay_type || current.overlay_type,
    text: typeof data.text === 'string' ? data.text : current.text,
    text_color: typeof data.text_color === 'string' ? normalizeHexColor(data.text_color, current.text_color) : current.text_color,
    logo_color_enabled:
      typeof data.logo_color_enabled === 'boolean' ? data.logo_color_enabled : current.logo_color_enabled,
    logo_color: typeof data.logo_color === 'string' ? normalizeHexColor(data.logo_color, current.logo_color) : current.logo_color,
    print_params: { ...current.print_params, ...(data.print_params || {}) },
    embroidery_params: { ...current.embroidery_params, ...(data.embroidery_params || {}) },
    material_params: { ...current.material_params, ...(data.material_params || {}) },
    downscale: current.downscale,
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
  if (Number.isFinite(num(data.intensity, Number.NaN))) next.material_params.intensity = num(data.intensity, next.material_params.intensity)
  if (Number.isFinite(num(data.depth, Number.NaN))) next.material_params.depth = num(data.depth, next.material_params.depth)
  if (Number.isFinite(num(data.gloss, Number.NaN))) next.material_params.gloss = num(data.gloss, next.material_params.gloss)
  if (Number.isFinite(num(data.texture_strength, Number.NaN)) && !Number.isFinite(num(data.texture, Number.NaN))) {
    next.material_params.texture_strength = num(data.texture_strength, next.material_params.texture_strength)
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

function isLocalFrontendOrigin(origin) {
  try {
    const { hostname } = new URL(origin)
    return hostname === 'localhost' || hostname === '127.0.0.1'
  } catch {
    return false
  }
}

function shouldUseSameOriginProxy(baseUrl) {
  if (!import.meta.env.PROD || !baseUrl) return false
  const origin = frontendUrl()
  if (isLocalFrontendOrigin(origin)) return false

  try {
    return new URL(baseUrl).origin !== origin
  } catch {
    return false
  }
}

function publicSessionUrl(sessionId) {
  const url = new URL(window.location.href)
  const backendBase = readBackendBaseFromUrl() || configuredApiBaseUrl()
  if (!sessionId) {
    url.searchParams.delete('session')
  } else {
    url.searchParams.set('session', sessionId)
  }
  if (backendBase) url.searchParams.set('backend', backendBase)
  else url.searchParams.delete('backend')
  return url
}

function readBackendBaseFromUrl() {
  const value = String(new URL(window.location.href).searchParams.get('backend') || '')
    .trim()
    .replace(/\/+$/, '')
  if (shouldUseSameOriginProxy(API_BASE_URL) && value === API_BASE_URL) return ''
  return value
}

function configuredApiBaseUrl() {
  if (!API_BASE_URL || shouldUseSameOriginProxy(API_BASE_URL)) return ''
  return API_BASE_URL
}

function currentApiBaseUrl() {
  const backendBase = readBackendBaseFromUrl()
  if (backendBase) return backendBase
  return configuredApiBaseUrl() || frontendUrl()
}

function createTimedRequestSignal(timeoutMs, externalSignal) {
  const controller = new AbortController()
  let timedOut = false
  let externalAbortHandler = null

  const timeoutId =
    timeoutMs > 0
      ? window.setTimeout(() => {
          timedOut = true
          controller.abort()
        }, timeoutMs)
      : null

  if (externalSignal) {
    externalAbortHandler = () => controller.abort()
    if (externalSignal.aborted) {
      externalAbortHandler()
    } else {
      externalSignal.addEventListener('abort', externalAbortHandler, { once: true })
    }
  }

  return {
    signal: controller.signal,
    didTimeout() {
      return timedOut
    },
    cleanup() {
      if (timeoutId !== null) window.clearTimeout(timeoutId)
      if (externalSignal && externalAbortHandler) {
        externalSignal.removeEventListener('abort', externalAbortHandler)
      }
    },
  }
}

async function fetchWithTimeout(input, init = {}, timeoutMs = API_REQUEST_TIMEOUT_MS) {
  const request = createTimedRequestSignal(timeoutMs, init.signal)

  try {
    return await fetch(input, { ...init, signal: request.signal })
  } catch (error) {
    const nextError = error instanceof Error ? error : new Error(String(error))
    nextError.requestTimedOut = request.didTimeout()
    throw nextError
  } finally {
    request.cleanup()
  }
}

function isTimedOutRequest(error) {
  return Boolean(error?.requestTimedOut)
}

function waitForMs(delayMs) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, delayMs)
  })
}

function fileExtensionForMimeType(mimeType) {
  if (mimeType === 'image/jpeg') return 'jpg'
  if (mimeType === 'image/webp') return 'webp'
  return 'png'
}

function replaceFileExtension(filename, nextExtension) {
  const base = String(filename || 'upload').replace(/\.[^.]+$/, '')
  return `${base}.${nextExtension}`
}

function canvasToBlob(canvas, mimeType, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Не удалось подготовить изображение'))
          return
        }
        resolve(blob)
      },
      mimeType,
      quality,
    )
  })
}

async function decodeUploadImage(file) {
  if (typeof createImageBitmap === 'function') {
    try {
      const bitmap = await createImageBitmap(file)
      return {
        width: bitmap.width,
        height: bitmap.height,
        draw(context, width, height) {
          context.drawImage(bitmap, 0, 0, width, height)
        },
        close() {
          bitmap.close?.()
        },
      }
    } catch {
      // Fall through to <img> decoding below.
    }
  }

  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await new Promise((resolve, reject) => {
      const element = new window.Image()
      element.onload = () => resolve(element)
      element.onerror = () => reject(new Error('Не удалось декодировать изображение'))
      element.src = objectUrl
    })
    return {
      width: image.naturalWidth || image.width,
      height: image.naturalHeight || image.height,
      draw(context, width, height) {
        context.drawImage(image, 0, 0, width, height)
      },
      close() {},
    }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function prepareUploadImage(file, { maxEdge, mimeType = 'image/png', quality = 0.92 }) {
  if (!file || !String(file.type || '').startsWith('image/')) return file

  const source = await decodeUploadImage(file)
  try {
    const longest = Math.max(source.width, source.height)
    if (!Number.isFinite(longest) || longest <= maxEdge) return file

    const scale = maxEdge / longest
    const targetWidth = Math.max(1, Math.round(source.width * scale))
    const targetHeight = Math.max(1, Math.round(source.height * scale))
    const canvas = document.createElement('canvas')
    canvas.width = targetWidth
    canvas.height = targetHeight

    const context = canvas.getContext('2d', { alpha: true })
    if (!context) return file

    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    source.draw(context, targetWidth, targetHeight)

    const blob = await canvasToBlob(canvas, mimeType, quality)
    return new File([blob], replaceFileExtension(file.name, fileExtensionForMimeType(mimeType)), {
      type: mimeType,
      lastModified: Date.now(),
    })
  } finally {
    source.close()
  }
}

async function fetchRemoteImageAsFile(url, fallbackName = 'catalog-template') {
  let lastError = null

  for (const candidate of remoteImageFetchCandidates(url)) {
    try {
      const response = await fetchWithTimeout(candidate, {}, API_REQUEST_TIMEOUT_MS)
      if (!response.ok) throw new Error(`${response.status}`)

      const blob = await response.blob()
      if (!blob.size) throw new Error('Пустой ответ изображения')

      return new File([blob], fileNameFromUrl(url, fallbackName), {
        type: blob.type || 'image/png',
        lastModified: Date.now(),
      })
    } catch (error) {
      lastError = error
    }
  }

  throw lastError || new Error('Не удалось загрузить изображение товара')
}

function apiRootPath(path) {
  return assetUrl(path)
}

function apiPathForSession(sessionId, endpoint) {
  const clean = String(endpoint || '').replace(/^\/+/, '')
  return assetUrl(`/api/session/${encodeURIComponent(sessionId)}/${clean}`)
}

function controlsForMode(mode) {
  if (isEmbroideryMode(mode)) {
    return {
      eyebrow: 'Вышивка',
      title: 'Параметры вышивки',
      controls: EMBROIDERY_CONTROLS,
      source: 'embroidery_params',
    }
  }
  if (isPrintMode(mode)) {
    return {
      eyebrow: 'Реализм принта',
      title: 'Параметры принта',
      controls: PRINT_CONTROLS,
      source: 'print_params',
    }
  }
  return {
    eyebrow: `Материал: ${modeLabel(mode)}`,
    title: `Параметры ${modeLabel(mode)}`,
    controls: MATERIAL_CONTROLS,
    source: 'material_params',
  }
}

function statePath(sessionId) {
  return sessionId ? apiPathForSession(sessionId, 'state') : apiRootPath('/api/state')
}

function sessionCreatePath() {
  return apiRootPath('/api/session')
}

function healthPath() {
  return apiRootPath('/health')
}

function garmentImagePath(sessionId, version) {
  const path = sessionId
    ? `/api/session/${encodeURIComponent(sessionId)}/garment.png?v=${version}`
    : `/shirt.png?v=${version}`
  return assetUrl(path)
}

function renderPayload(app) {
  const print = app.print_params
  const embroidery = app.embroidery_params
  const material = app.material_params
  const textureStrength = isMaterialMode(app.mode)
    ? num(material.texture_strength, 0.5)
    : num(print.texture_strength, 0.22) * 1.6

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
    texture_strength: textureStrength,
    brightness_strength: num(print.ink_strength, 0.85),
    edge_softness: num(print.edge_soften, 0.35),
    bleed_strength: num(print.ink_bleed, 0.12) * 2,
    color_strength: num(print.dye_strength, 0),
    intensity: num(material.intensity, 0.65),
    depth: num(material.depth, 0.35),
    gloss: num(material.gloss, 0.25),
    embroidery_depth: num(embroidery.embroidery_depth, 0.35),
    stitch_density: num(embroidery.stitch_density, 0.7),
    thread_shine: num(embroidery.thread_shine, 0.2),
    edge_raised: num(embroidery.edge_raised, 0.25),
    fabric_influence: num(embroidery.fabric_influence, 0.35),
    thread_texture_strength: num(embroidery.thread_texture_strength, 0.6),
    print_params: print,
    embroidery_params: embroidery,
    material_params: material,
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

function uploadSourceKey({ templateFile, logoFile, selectedProduct, selectedProductPhoto, selectedProductPhotoIndex }) {
  if (!logoFile) return ''

  const templateKey = templateFile ? fileSignature(templateFile, 'template') : ''
  const productKey = templateKey
    ? templateKey
    : `catalog:${selectedProduct?.id || 'none'}:${selectedProductPhotoIndex}:${selectedProductPhoto || 'none'}`

  return `${productKey}|${fileSignature(logoFile, 'logo')}`
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
  const [previewState, setPreviewState] = useState('loading')
  const [previewUrl, setPreviewUrl] = useState('')
  const [selectedProductId, setSelectedProductId] = useState(DEFAULT_PRODUCT_ID)
  const [selectedProductPhotoIndex, setSelectedProductPhotoIndex] = useState(0)
  const [templateFile, setTemplateFile] = useState(null)
  const [logoFile, setLogoFile] = useState(null)
  const [booted, setBooted] = useState(false)
  const [backendUnavailable, setBackendUnavailable] = useState(false)
  const [baseImageVersion, setBaseImageVersion] = useState(Date.now())
  const [canvasViewport, setCanvasViewport] = useState(null)

  const appRef = useRef(DEFAULT_APP_STATE)
  const previewUrlRef = useRef('')
  const renderTimeoutRef = useRef(null)
  const renderAbortRef = useRef(null)
  const renderInFlightRef = useRef(false)
  const renderQueuedRef = useRef(false)
  const lastRequestedRenderRef = useRef(null)
  const canvasRef = useRef(null)
  const dragRef = useRef({ active: false, dx: 0, dy: 0 })
  const backendWarmupPromiseRef = useRef(null)
  const backendReadyAtRef = useRef(0)
  const uploadInFlightRef = useRef(false)
  const lastAnalyzedSourceRef = useRef('')
  const modeOptions = buildModeOptions(app.supported_render_modes)
  const modeControlGroup = controlsForMode(app.mode)
  const selectedProduct = CATALOG_PRODUCTS.find((product) => product.id === selectedProductId) || CATALOG_PRODUCTS[0] || null
  const selectedProductPhotos = selectedProduct?.photos || []
  const selectedProductPhoto =
    selectedProductPhotos[selectedProductPhotoIndex] || selectedProductPhotos[0] || ''
  const selectedProductPhotoPreviewUrl = catalogImageProxyUrl(selectedProductPhoto)
  const currentUploadSourceKey = uploadSourceKey({
    templateFile,
    logoFile,
    selectedProduct,
    selectedProductPhoto,
    selectedProductPhotoIndex,
  })
  const templateSourceLabel = templateFile
    ? templateFile.name
    : selectedProduct
      ? `${selectedProduct.name} · фото ${Math.min(selectedProductPhotoIndex + 1, selectedProductPhotos.length)}`
      : 'Не выбран'

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

  function markBackendReady() {
    backendReadyAtRef.current = Date.now()
    setBackendUnavailable(false)
  }

  async function ensureBackendReady({ silent = false, force = false, statusText = 'Запускаем сервер...' } = {}) {
    const readyAt = backendReadyAtRef.current
    if (!force && readyAt > 0 && Date.now() - readyAt < BACKEND_READY_TTL_MS) return true
    if (backendWarmupPromiseRef.current) return backendWarmupPromiseRef.current

    if (!silent && statusText) setStatus(statusText)

    const warmupPromise = (async () => {
      let lastError = null

      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const response = await fetchWithTimeout(healthPath(), {}, WARMUP_REQUEST_TIMEOUT_MS)
          if (!response.ok) throw new Error(`${response.status}`)
          markBackendReady()
          return true
        } catch (error) {
          lastError = error
          if (attempt < 1) await waitForMs(1200)
        }
      }

      throw lastError || new Error('Не удалось запустить сервер')
    })()

    backendWarmupPromiseRef.current = warmupPromise
    try {
      return await warmupPromise
    } finally {
      if (backendWarmupPromiseRef.current === warmupPromise) {
        backendWarmupPromiseRef.current = null
      }
    }
  }

  async function fetchRenderBlob(snapshot, overrides = {}, signal = undefined) {
    const response = await fetchWithTimeout(
      apiPath(snapshot, 'render'),
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...renderPayload(snapshot), ...overrides }),
        signal,
      },
      RENDER_REQUEST_TIMEOUT_MS,
    )
    if (!response.ok) throw new Error(`${response.status}`)
    return response.blob()
  }

  async function renderPreview(snapshotOverride = null) {
    lastRequestedRenderRef.current = snapshotOverride ? normalizeAppState(snapshotOverride) : appRef.current
    if (renderInFlightRef.current) {
      renderQueuedRef.current = true
      setPreviewState('loading')
      return false
    }

    renderInFlightRef.current = true
    try {
      do {
        renderQueuedRef.current = false
        const snapshot = lastRequestedRenderRef.current || appRef.current
        const controller = new AbortController()
        renderAbortRef.current = controller
        setPreviewState('loading')
        setStatus('Рендер...')

        try {
          const blob = await fetchRenderBlob(snapshot, {}, controller.signal)
          if (controller.signal.aborted) return false

          const nextUrl = URL.createObjectURL(blob)
          if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
          previewUrlRef.current = nextUrl
          setPreviewUrl(nextUrl)
          setPreviewState('ready')
          markBackendReady()
          setStatus('Готово')
        } catch (error) {
          if ((controller.signal.aborted || error?.name === 'AbortError') && !isTimedOutRequest(error)) {
            return false
          }
          setPreviewState('error')
          setBackendUnavailable(true)
          setStatus(isTimedOutRequest(error) ? 'Сервер отвечает слишком долго' : 'Ошибка рендера')
        } finally {
          if (renderAbortRef.current === controller) {
            renderAbortRef.current = null
          }
        }
      } while (renderQueuedRef.current)
    } finally {
      renderInFlightRef.current = false
    }
    return true
  }

  function queueRender(delay = 120) {
    if (!booted) return
    setPreviewState('loading')
    window.clearTimeout(renderTimeoutRef.current)
    renderTimeoutRef.current = window.setTimeout(() => {
      renderPreview()
    }, delay)
  }

  async function apiJson(path, payload) {
    const response = await fetchWithTimeout(
      path,
      {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      },
      API_REQUEST_TIMEOUT_MS,
    )
    if (!response.ok) throw new Error(`${response.status}`)
    return response.json()
  }

  async function handleAutoplace({ silent = false } = {}) {
    const snapshot = appRef.current
    if (!silent) setStatus('Размещаем...')

    try {
      const result = await apiJson(apiPath(snapshot, 'autoplace'), {
        region: String(snapshot.region || 'auto'),
        fill: 0.92,
      })
      markBackendReady()

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

  async function handleUploadSession({ reason = 'manual', sourceKey = currentUploadSourceKey } = {}) {
    if (uploadInFlightRef.current) return

    if (!logoFile) {
      setStatus('Выберите логотип')
      return
    }

    if (!templateFile && !selectedProductPhoto) {
      setStatus('Загрузите шаблон или выберите товар')
      return
    }

    setPreviewState('loading')
    setStatus(reason === 'source-change' ? 'Анализируем товар...' : 'Подготавливаем изображения...')
    uploadInFlightRef.current = true
    try {
      await ensureBackendReady({
        silent: false,
        statusText: backendUnavailable ? 'Запускаем сервер...' : 'Проверяем сервер...',
      })

      const templateSource = templateFile
        ? templateFile
        : await fetchRemoteImageAsFile(selectedProductPhoto, selectedProduct?.article || 'gifts-product')
      const preparedTemplate = await prepareUploadImage(templateSource, { maxEdge: TEMPLATE_UPLOAD_MAX_EDGE })
      const preparedLogo = await prepareUploadImage(logoFile, { maxEdge: LOGO_UPLOAD_MAX_EDGE })
      const form = new FormData()
      form.append('template', preparedTemplate)
      form.append('logo', preparedLogo)

      setStatus('Загрузка...')
      const response = await fetchWithTimeout(
        sessionCreatePath(),
        { method: 'POST', body: form },
        SESSION_CREATE_TIMEOUT_MS,
      )
      if (!response.ok) throw new Error(`${response.status}`)
      const result = await response.json()
      markBackendReady()
      lastAnalyzedSourceRef.current = sourceKey

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
      setBackendUnavailable(false)
      setStatus('Сессия загружена')
      await renderPreview()
    } catch (error) {
      setPreviewState('error')
      setBackendUnavailable(true)
      setStatus(isTimedOutRequest(error) ? 'Сервер отвечает слишком долго' : 'Ошибка загрузки')
    } finally {
      uploadInFlightRef.current = false
    }
  }

  const syncSelectedSource = useEffectEvent((sourceKey) => {
    handleUploadSession({ reason: 'source-change', sourceKey })
  })

  async function handleDownload() {
    setStatus('Готовим PNG...')
    try {
      const blob = await fetchRenderBlob(appRef.current, { downscale: 1 })
      const downloadUrl = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = downloadUrl
      link.download = appRef.current.overlay_type === 'text' ? 'render-tekst.png' : 'render-logotip.png'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(downloadUrl), 0)
      setStatus('PNG сохранен')
    } catch (error) {
      setStatus(isTimedOutRequest(error) ? 'Сервер отвечает слишком долго' : 'Не удалось скачать PNG')
    }
  }

  useEffect(() => {
    appRef.current = app
  }, [app])

  useEffect(() => {
    let mounted = true

    async function boot() {
      setPreviewState('loading')
      setStatus('Загрузка...')
      const url = new URL(window.location.href)
      const sessionId = url.searchParams.get('session')
      let nextState = DEFAULT_APP_STATE

      try {
        if (sessionId) {
          const response = await fetchWithTimeout(statePath(sessionId), {}, BOOT_REQUEST_TIMEOUT_MS)
          if (response.ok) {
            const data = await response.json()
            nextState = applyStateData({ ...DEFAULT_APP_STATE, session_id: sessionId }, data)
            backendReadyAtRef.current = Date.now()
          } else {
            url.searchParams.delete('session')
            window.history.replaceState({}, '', url)
          }
        }

        if (!sessionId || !nextState.session_id) {
          const response = await fetchWithTimeout(statePath(null), {}, BOOT_REQUEST_TIMEOUT_MS)
          const data = await response.json()
          nextState = applyStateData(DEFAULT_APP_STATE, data)
          backendReadyAtRef.current = Date.now()
        }

        if (!mounted) return
        commitApp(nextState)
        refreshBaseImage()
        setBackendUnavailable(false)
        setBooted(true)
      } catch (error) {
        if (!mounted) return
        commitApp(DEFAULT_APP_STATE)
        setBooted(true)
        setBackendUnavailable(true)
        setPreviewState('error')
        setStatus(isTimedOutRequest(error) ? 'Сервер недоступен' : 'Не удалось загрузить сервер')
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
    ensureBackendReady({ silent: true }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!templateFile && !logoFile) return
    ensureBackendReady({ silent: true }).catch(() => {})
  }, [templateFile, logoFile])

  useEffect(() => {
    if (!booted || !currentUploadSourceKey) return
    if (lastAnalyzedSourceRef.current === currentUploadSourceKey) return

    syncSelectedSource(currentUploadSourceKey)
  }, [booted, currentUploadSourceKey])

  useEffect(() => {
    if (!booted || backendUnavailable) return
    renderPreview()
  }, [backendUnavailable, booted])

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
  const selectedBounds = getSelectedBounds(app)
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
    display: app.region !== 'auto' ? 'block' : 'none',
    left: `${viewport.left + selectedBounds.x * scaleX}px`,
    top: `${viewport.top + selectedBounds.y * scaleY}px`,
    width: `${selectedBounds.w * scaleX}px`,
    height: `${selectedBounds.h * scaleY}px`,
  }

  const baseImageSrc = garmentImagePath(app.session_id, baseImageVersion)
  const previewMeta = PREVIEW_STATE_META[previewState] || PREVIEW_STATE_META.loading
  const isPreviewBusy = previewState === 'loading'

  return (
    <div className="min-h-screen px-4 py-5 text-[var(--ink)] sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-[1680px] flex-col gap-5">
        <header className="surface-panel overflow-hidden p-6 sm:p-7">
          <div className="grid gap-5 xl:grid-cols-[1.3fr_0.7fr]">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.22em] text-[var(--muted-strong)]">
                Студия Primerch
              </div>
              <div className="max-w-3xl space-y-3">
                <h1 className="text-3xl font-semibold tracking-[-0.04em] text-[var(--ink)] sm:text-4xl lg:text-[3.35rem]">
                  Современный конструктор принта
                </h1>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              <Metric label="Сессия" value={app.session_id ? app.session_id.slice(0, 12) : 'По умолчанию'} />
              <Metric label="Наложение" value={app.overlay_type === 'text' ? 'Текст' : 'Логотип'} />
            </div>
          </div>
        </header>

        <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <Section eyebrow="Сессия" title="Файлы и подключение">
              <div className="grid gap-3">
                {selectedProduct ? (
                  <div className="rounded-2xl border border-[var(--line)] bg-white/70 p-4">
                    <div className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-[var(--muted-strong)]">
                      Каталог gifts.ru
                    </div>
                    <div className="mt-3 grid gap-3">
                      <SelectField
                        label="Разные товары для теста"
                        value={selectedProduct.id}
                        options={CATALOG_PRODUCTS.map((product) => ({
                          value: product.id,
                          label: product.name,
                        }))}
                        onChange={(value) => {
                          setSelectedProductId(value)
                          setSelectedProductPhotoIndex(0)
                        }}
                      />

                      <img
                        className="h-48 w-full rounded-2xl border border-[var(--line)] bg-white object-contain"
                        src={selectedProductPhotoPreviewUrl}
                        alt={selectedProduct.name}
                        loading="lazy"
                      />

                      <div className="grid grid-cols-4 gap-2">
                        {selectedProductPhotos.slice(0, 4).map((photo, index) => (
                          <button
                            key={`${selectedProduct.id}-${photo}`}
                            type="button"
                            className={`overflow-hidden rounded-2xl border transition ${
                              index === selectedProductPhotoIndex
                                ? 'border-[var(--accent)] shadow-[0_12px_28px_rgba(32,69,246,0.18)]'
                                : 'border-[var(--line)] bg-white/70'
                            }`}
                            onClick={() => setSelectedProductPhotoIndex(index)}
                          >
                            <img
                              className="h-18 w-full bg-white object-cover"
                              src={catalogImageProxyUrl(photo)}
                              alt={`${selectedProduct.name} ${index + 1}`}
                              loading="lazy"
                            />
                          </button>
                        ))}
                      </div>

                      <div className="rounded-2xl border border-[var(--line)] bg-[var(--chip)] px-4 py-3">
                        <div className="text-sm font-semibold text-[var(--ink)]">{selectedProduct.name}</div>
                        <div className="mt-1 text-xs text-[var(--muted)]">
                          {formatPrice(selectedProduct.price)} · {selectedProduct.variants.length} вариантов
                        </div>
                        <p className="mt-2 text-xs leading-5 text-[var(--muted)]">
                          {shortText(selectedProduct.description, 180)}
                        </p>
                        {selectedProduct.url ? (
                          <a
                            className="mt-3 inline-flex text-xs font-semibold text-[var(--accent)] underline-offset-4 hover:underline"
                            href={selectedProduct.url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            Открыть товар на gifts.ru
                          </a>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ) : null}

                <label className="space-y-2">
                  <span className="text-sm font-medium text-[var(--ink)]">Изображение шаблона</span>
                  <input
                    className="studio-input file:mr-3 file:rounded-full file:border-0 file:bg-[var(--ink)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                    type="file"
                    accept="image/*"
                    onChange={(event) => setTemplateFile(event.target.files?.[0] || null)}
                  />
                </label>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-[var(--ink)]">Изображение логотипа</span>
                  <input
                    className="studio-input file:mr-3 file:rounded-full file:border-0 file:bg-[var(--ink)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
                    type="file"
                    accept="image/*"
                    onChange={(event) => setLogoFile(event.target.files?.[0] || null)}
                  />
                </label>

                <div className="rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3">
                  <div className="text-sm font-medium text-[var(--ink)]">Источник шаблона</div>
                  <div className="mt-1 text-sm text-[var(--muted-strong)]">{templateSourceLabel}</div>
                  <div className="mt-1 text-xs leading-5 text-[var(--muted)]">
                    Если файл шаблона не загружен, в backend отправится выбранное фото товара из каталога.
                  </div>
                </div>

                <button className="studio-button studio-button-primary" onClick={handleUploadSession}>
                  Создать сессию
                </button>
              </div>
            </Section>

            <Section eyebrow="Размещение" title="Положение и режим">
              <div className="grid gap-4">
                <div className="grid gap-3 sm:grid-cols-2">
                  <SelectField
                    label="Режим"
                    value={app.mode}
                    options={modeOptions}
                    onChange={(value) => {
                      commitApp((current) => applyModePreset(current, value || 'print'))
                      queueRender(70)
                    }}
                  />
                  <SelectField
                    label="Зона печати"
                    value={app.region}
                    options={REGION_OPTIONS}
                    onChange={(value) => {
                      commitApp((current) => ({
                        ...current,
                        region: value || 'auto',
                        lock_region: (value || 'auto') !== 'auto',
                      }))
                      if (value !== 'auto') {
                        handleAutoplace({ silent: true })
                      } else {
                        queueRender(80)
                      }
                    }}
                  />
                </div>

                <div className="rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3">
                  <div className="text-sm font-medium text-[var(--ink)]">{modeLabel(app.mode)}</div>
                  <div className="mt-1 text-xs leading-5 text-[var(--muted)]">{modeDescription(app.mode)}</div>
                </div>

                <label className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--line)] bg-white/70 px-4 py-3">
                  <span>
                    <div className="text-sm font-medium text-[var(--ink)]">Привязать к зоне</div>
                    <div className="text-xs text-[var(--muted)]">Ограничивает объект активной областью печати.</div>
                  </span>
                  <input
                    className="h-5 w-5 accent-[var(--accent)]"
                    type="checkbox"
                    checked={app.lock_region}
                    onChange={(event) => {
                      const checked = event.target.checked
                      if (checked) {
                        const nextRegion = appRef.current.region !== 'auto' ? appRef.current.region : 'chest'
                        commitApp((current) => ({
                          ...current,
                          lock_region: true,
                          region: nextRegion,
                        }))
                        handleAutoplace({ silent: true })
                      } else {
                        commitApp((current) => ({
                          ...current,
                          lock_region: false,
                          region: 'auto',
                        }))
                        queueRender(80)
                      }
                    }}
                  />
                </label>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button className="studio-button" onClick={() => handleAutoplace()}>
                    Разместить в выбранной зоне
                  </button>
                  <button className="studio-button" onClick={handleDownload}>
                    Скачать PNG
                  </button>
                </div>

                <SliderField
                  label="Масштаб"
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
                  label="Поворот"
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
                  label="Масштаб превью"
                  value={String(app.downscale)}
                  options={[
                    { value: '1', label: '1.0x качество' },
                    { value: '0.75', label: '0.75x быстрее' },
                    { value: '0.5', label: '0.5x максимально быстро' },
                  ]}
                  onChange={(value) => {
                    commitApp((current) => ({ ...current, downscale: Number(value) }))
                    queueRender(60)
                  }}
                />
              </div>
            </Section>

            <Section eyebrow="Наложение" title="Текст, цвет и логотип">
              <div className="grid gap-4">
                <div className="inline-flex rounded-full border border-[var(--line)] bg-[var(--chip)] p-1">
                  {[
                    { value: 'logo', label: 'Логотип' },
                    { value: 'text', label: 'Текст' },
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
                          text: option.value === 'text' && !current.text ? 'Новая коллекция' : current.text,
                        }))
                        queueRender(30)
                      }}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>

                <label className="space-y-2">
                  <span className="text-sm font-medium text-[var(--ink)]">Текст наложения</span>
                  <textarea
                    className="studio-input min-h-28 resize-none"
                    placeholder="Например: ЛЕТНЯЯ КОЛЛЕКЦИЯ"
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
                    <span className="text-sm font-medium text-[var(--ink)]">Цвет текста</span>
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
                    <span className="text-sm font-medium text-[var(--ink)]">Цвет логотипа</span>
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
                    <div className="text-sm font-medium text-[var(--ink)]">Перекрасить логотип</div>
                    <div className="text-xs text-[var(--muted)]">Включает тонирование логотипа на рендере.</div>
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
              eyebrow={modeControlGroup.eyebrow}
              title={modeControlGroup.title}
            >
              <div className="grid gap-4">
                {modeControlGroup.controls.map((control) => (
                  <SliderField
                    key={control.key}
                    label={control.label}
                    value={app[modeControlGroup.source][control.key]}
                    min={control.min}
                    max={control.max}
                    step={control.step}
                    onChange={(value) => {
                      commitApp((current) => ({
                        ...current,
                        [modeControlGroup.source]: {
                          ...current[modeControlGroup.source],
                          [control.key]: value,
                        },
                      }))
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
                    Живое превью
                  </div>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-[var(--ink)]">
                    Холст для перетаскивания, масштаба и рендера
                  </h2>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <Metric label="X" value={app.placement.x} />
                  <Metric label="Y" value={app.placement.y} />
                  <Metric label="Ширина" value={app.placement.width} />
                  <Metric label="Высота" value={app.placement.height} />
                  <Metric label="Поворот" value={`${Math.round(app.placement.rotation)}°`} />
                </div>
              </div>

              <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
                <div className="space-y-3">
                  <div
                    ref={canvasRef}
                    className="relative aspect-square overflow-hidden rounded-[30px] border border-white/70 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.92),_rgba(238,243,248,0.9)_55%,_rgba(227,232,240,0.95))] shadow-[0_36px_90px_rgba(15,23,42,0.12)]"
                    aria-busy={isPreviewBusy}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerLeave={handlePointerUp}
                    onWheel={handleWheel}
                  >
                    <img
                      className="absolute inset-0 h-full w-full object-contain"
                      src={baseImageSrc}
                      alt="Изделие"
                      draggable="false"
                    />
                    {previewUrl ? (
                      <img
                        className="absolute inset-0 h-full w-full object-contain"
                        src={previewUrl}
                        alt="Превью рендера"
                        draggable="false"
                      />
                    ) : null}

                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_38%,_rgba(15,23,42,0.06)_100%)]" />

                    <div
                      className={`pointer-events-none absolute right-4 top-4 z-20 inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] backdrop-blur ${previewMeta.badgeClass}`}
                    >
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${previewMeta.dotClass} ${isPreviewBusy ? 'animate-pulse' : ''}`}
                      />
                      {status}
                    </div>

                    <div
                      className="pointer-events-none absolute rounded-[20px] border border-dashed border-[rgba(73,107,255,0.4)] bg-[rgba(73,107,255,0.08)]"
                      style={regionStyle}
                    />

                    <div
                      className="pointer-events-none absolute rounded-[22px] border-2 border-[rgba(32,69,246,0.8)] shadow-[0_0_0_999px_rgba(9,14,26,0.08)_inset]"
                      style={boxStyle}
                    />

                    <div className="pointer-events-none absolute bottom-4 left-4 rounded-full border border-white/80 bg-white/80 px-3 py-2 text-xs font-semibold tracking-[0.14em] text-[var(--muted-strong)] backdrop-blur">
                      Перетаскивайте для перемещения. `Alt` + колесо для масштаба.
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-3xl border border-[var(--line)] bg-white/75 p-4">
                      <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Режим</div>
                      <div className="mt-2 text-lg font-semibold text-[var(--ink)]">{modeLabel(app.mode)}</div>
                    </div>
                    <div className="rounded-3xl border border-[var(--line)] bg-white/75 p-4">
                      <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Зона</div>
                      <div className="mt-2 text-lg font-semibold text-[var(--ink)]">{regionLabel(app.region)}</div>
                    </div>
                    <div className="rounded-3xl border border-[var(--line)] bg-white/75 p-4">
                      <div className="text-xs uppercase tracking-[0.22em] text-[var(--muted)]">Масштаб превью</div>
                      <div className="mt-2 text-lg font-semibold text-[var(--ink)]">{app.downscale}x</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[28px] border border-[var(--line)] bg-[linear-gradient(180deg,rgba(17,24,39,0.96),rgba(31,41,55,0.96))] p-5 text-white shadow-[0_28px_70px_rgba(15,23,42,0.18)]">
                    <div className="text-[0.68rem] uppercase tracking-[0.28em] text-white/60">Сценарий работы</div>
                    <div className="mt-3 space-y-3 text-sm text-white/78">
                      <p>1. Загрузите шаблон и логотип для нового товара.</p>
                      <p>2. Выберите зону и режим, затем нажмите авторазмещение или двигайте вручную.</p>
                      <p>3. Для выбранного режима настройте параметры материала, принта или вышивки и скачайте PNG.</p>
                    </div>
                  </div>

                  <div className="rounded-[28px] border border-[var(--line)] bg-white/75 p-5">
                    <div className="text-[0.68rem] uppercase tracking-[0.28em] text-[var(--muted-strong)]">
                      Активный режим
                    </div>
                    <div className="mt-3 text-lg font-semibold text-[var(--ink)]">{modeLabel(app.mode)}</div>
                    <p className="mt-2 text-sm leading-6 text-[var(--muted)]">{modeDescription(app.mode)}</p>
                  </div>

                  <div className="rounded-[28px] border border-[var(--line)] bg-white/75 p-5">
                    <div className="text-[0.68rem] uppercase tracking-[0.28em] text-[var(--muted-strong)]">
                      Границы рендера
                    </div>
                    <div className="mt-4 grid grid-cols-2 gap-3">
                      <Metric label="Граница X" value={bounds.x} />
                      <Metric label="Граница Y" value={bounds.y} />
                      <Metric label="Ширина зоны" value={bounds.w} />
                      <Metric label="Высота зоны" value={bounds.h} />
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
