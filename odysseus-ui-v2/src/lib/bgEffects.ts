/** Canvas background effects — ported from legacy `static/js/theme.js`. */

import type { BgPattern } from './theme'

const CANVAS_IDS = [
  'synapse-canvas',
  'rain-canvas',
  'constellations-canvas',
  'perlin-flow-canvas',
  'petals-canvas',
  'sparkles-canvas',
  'embers-canvas',
] as const

function getEffectColor(): string {
  const s = getComputedStyle(document.documentElement)
  return (
    s.getPropertyValue('--bg-effect-color').trim() ||
    s.getPropertyValue('--fg').trim() ||
    '#9cdef2'
  )
}

function getEffectSize(): number {
  const v = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--bg-effect-size'),
  )
  return Number.isNaN(v) ? 1 : v
}

function getEffectIntensity(): number {
  const v = parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--bg-effect-intensity'),
  )
  return Number.isNaN(v) ? 1 : v
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16) || 0,
    g: parseInt(h.slice(2, 4), 16) || 0,
    b: parseInt(h.slice(4, 6), 16) || 0,
  }
}

function makeCanvas(id: string): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.id = id
  canvas.setAttribute('aria-hidden', 'true')
  canvas.style.cssText =
    'position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:0;'
  document.body.prepend(canvas)
  return canvas
}

function isActive(className: string): boolean {
  return document.body.classList.contains(className)
}

function initSynapse(): () => void {
  if (document.getElementById('synapse-canvas')) return () => {}
  const canvas = makeCanvas('synapse-canvas')
  const ctx = canvas.getContext('2d')!
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const GRID = 24
  let W = 0
  let H = 0
  let cols = 0
  let rows = 0
  const pulses: { x: number; y: number; dx: number; dy: number }[] = []
  let raf = 0

  const resize = () => {
    W = window.innerWidth
    H = window.innerHeight
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    cols = Math.ceil(W / GRID)
    rows = Math.ceil(H / GRID)
  }
  resize()
  window.addEventListener('resize', resize)

  const draw = () => {
    if (!isActive('bg-pattern-synapse')) return
    raf = requestAnimationFrame(draw)
    ctx.clearRect(0, 0, W, H)
    const c = getEffectColor()
    if (pulses.length < 20 && Math.random() < 0.12) {
      const speed = 2 + Math.random() * 20
      if (Math.random() > 0.5) {
        pulses.push({ x: -12, y: Math.floor(Math.random() * (rows + 1)) * GRID, dx: speed, dy: 0 })
      } else {
        pulses.push({ x: Math.floor(Math.random() * (cols + 1)) * GRID, y: -12, dx: 0, dy: speed })
      }
    }
    for (let i = pulses.length - 1; i >= 0; i--) {
      const p = pulses[i]
      p.x += p.dx
      p.y += p.dy
      if (p.x > W + 12 || p.y > H + 12) {
        pulses.splice(i, 1)
        continue
      }
      const grad = ctx.createLinearGradient(p.x - p.dx * 6, p.y - p.dy * 6, p.x, p.y)
      grad.addColorStop(0, 'transparent')
      grad.addColorStop(1, c)
      ctx.strokeStyle = grad
      ctx.globalAlpha = 0.35
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(p.x - p.dx * 6, p.y - p.dy * 6)
      ctx.lineTo(p.x, p.y)
      ctx.stroke()
      ctx.globalAlpha = 0.55
      ctx.fillStyle = c
      ctx.beginPath()
      ctx.arc(p.x, p.y, 1.2, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
  draw()

  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', resize)
    canvas.remove()
  }
}

function initRain(): () => void {
  if (document.getElementById('rain-canvas')) return () => {}
  const canvas = makeCanvas('rain-canvas')
  const ctx = canvas.getContext('2d')!
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  let W = 0
  let H = 0
  const drops: { x: number; y: number; len: number; speed: number; alpha: number }[] = []
  let raf = 0

  const resize = () => {
    W = window.innerWidth
    H = window.innerHeight
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  resize()
  window.addEventListener('resize', resize)

  const draw = () => {
    if (!isActive('bg-pattern-rain')) return
    raf = requestAnimationFrame(draw)
    ctx.clearRect(0, 0, W, H)
    const c = getEffectColor()
    const inten = getEffectIntensity()
    const sizeMult = getEffectSize()
    if (drops.length < 130 * inten && Math.random() < 0.6 * inten) {
      drops.push({
        x: Math.random() * W,
        y: -(20 + Math.random() * 40),
        len: 20 + Math.random() * 40,
        speed: 4 + Math.random() * 8,
        alpha: 0.32 + Math.random() * 0.28,
      })
    }
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i]
      d.y += d.speed * (0.35 + inten * 0.65)
      const effLen = d.len * sizeMult
      if (d.y > H + effLen) {
        drops.splice(i, 1)
        continue
      }
      const grad = ctx.createLinearGradient(d.x, d.y - effLen, d.x, d.y)
      grad.addColorStop(0, 'transparent')
      grad.addColorStop(1, c)
      ctx.strokeStyle = grad
      ctx.globalAlpha = d.alpha
      ctx.lineWidth = 1.3
      ctx.beginPath()
      ctx.moveTo(d.x, d.y - effLen)
      ctx.lineTo(d.x, d.y)
      ctx.stroke()
    }
    ctx.globalAlpha = 1
  }
  draw()

  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', resize)
    canvas.remove()
  }
}

function initConstellations(): () => void {
  if (document.getElementById('constellations-canvas')) return () => {}
  const canvas = makeCanvas('constellations-canvas')
  const ctx = canvas.getContext('2d')!
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  let W = 0
  let H = 0
  let t = 0
  const stars: { x: number; y: number; vx: number; vy: number; r: number; phase: number }[] = []
  let raf = 0

  const initStars = () => {
    stars.length = 0
    for (let i = 0; i < 50; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        vx: (Math.random() - 0.5) * 0.15,
        vy: (Math.random() - 0.5) * 0.15,
        r: 0.8 + Math.random() * 0.8,
        phase: Math.random() * Math.PI * 2,
      })
    }
  }

  const resize = () => {
    W = window.innerWidth
    H = window.innerHeight
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (!stars.length) initStars()
  }
  resize()
  const onResize = () => {
    resize()
    initStars()
  }
  window.addEventListener('resize', onResize)

  const draw = () => {
    if (!isActive('bg-pattern-constellations')) return
    raf = requestAnimationFrame(draw)
    t += 0.01
    ctx.clearRect(0, 0, W, H)
    const c = getEffectColor()
    for (const s of stars) {
      s.x += s.vx
      s.y += s.vy
      if (s.x < 0) s.x = W
      if (s.x > W) s.x = 0
      if (s.y < 0) s.y = H
      if (s.y > H) s.y = 0
    }
    ctx.strokeStyle = c
    for (let i = 0; i < stars.length; i++) {
      for (let j = i + 1; j < stars.length; j++) {
        const dx = stars[i].x - stars[j].x
        const dy = stars[i].y - stars[j].y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist < 120) {
          ctx.globalAlpha = (1 - dist / 120) * 0.15
          ctx.beginPath()
          ctx.moveTo(stars[i].x, stars[i].y)
          ctx.lineTo(stars[j].x, stars[j].y)
          ctx.stroke()
        }
      }
    }
    ctx.fillStyle = c
    for (const s of stars) {
      const twinkle = 0.5 + 0.5 * Math.sin(t * 2 + s.phase)
      ctx.globalAlpha = 0.15 + twinkle * 0.25
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
  draw()

  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', onResize)
    canvas.remove()
  }
}

function noise2d(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453
  return n - Math.floor(n)
}

function smoothNoise(x: number, y: number): number {
  const ix = Math.floor(x)
  const iy = Math.floor(y)
  const fx = x - ix
  const fy = y - iy
  const a = noise2d(ix, iy)
  const b = noise2d(ix + 1, iy)
  const cc = noise2d(ix, iy + 1)
  const d = noise2d(ix + 1, iy + 1)
  const ux = fx * fx * (3 - 2 * fx)
  const uy = fy * fy * (3 - 2 * fy)
  return a + (b - a) * ux + (cc - a) * uy + (a - b - cc + d) * ux * uy
}

function initPerlinFlow(): () => void {
  if (document.getElementById('perlin-flow-canvas')) return () => {}
  const canvas = makeCanvas('perlin-flow-canvas')
  const ctx = canvas.getContext('2d')!
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  let W = 0
  let H = 0
  let t = 0
  const particles: { x: number; y: number; life: number }[] = []
  let raf = 0
  let cachedBg = ''
  let fadeStyle = ''

  const resize = () => {
    W = window.innerWidth
    H = window.innerHeight
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (!particles.length) {
      for (let i = 0; i < 200; i++) {
        particles.push({ x: Math.random() * W, y: Math.random() * H, life: Math.random() })
      }
    }
  }
  resize()
  window.addEventListener('resize', resize)

  const getFade = () => {
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#282c34'
    if (bg !== cachedBg) {
      cachedBg = bg
      const { r, g, b } = hexToRgb(bg)
      fadeStyle = `rgba(${r},${g},${b},0.02)`
    }
    return fadeStyle
  }

  const draw = () => {
    if (!isActive('bg-pattern-perlin-flow')) return
    raf = requestAnimationFrame(draw)
    ctx.fillStyle = getFade()
    ctx.fillRect(0, 0, W, H)
    const c = getEffectColor()
    particles.forEach((p) => {
      const n = smoothNoise(p.x * 0.004 + t * 0.0008, p.y * 0.004 + 100)
      const angle = n * Math.PI * 6
      const speed = 1 + smoothNoise(p.x * 0.003, p.y * 0.003 + 50) * 1.5
      p.x += Math.cos(angle) * speed
      p.y += Math.sin(angle) * speed
      p.life -= 0.001
      if (p.life <= 0 || p.x < 0 || p.x > W || p.y < 0 || p.y > H) {
        p.x = Math.random() * W
        p.y = Math.random() * H
        p.life = 1
      }
      ctx.beginPath()
      ctx.arc(p.x, p.y, 1, 0, Math.PI * 2)
      ctx.fillStyle = c
      ctx.globalAlpha = p.life * 0.15
      ctx.fill()
    })
    ctx.globalAlpha = 1
    t++
  }
  draw()

  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', resize)
    canvas.remove()
  }
}

function initPetals(): () => void {
  if (document.getElementById('petals-canvas')) return () => {}
  const canvas = makeCanvas('petals-canvas')
  const ctx = canvas.getContext('2d')!
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  let W = 0
  let H = 0
  const petals: {
    x: number
    y: number
    size: number
    rot: number
    vr: number
    vy: number
    drift: number
    driftSpeed: number
    wobble: number
  }[] = []
  let raf = 0

  const makePetal = () => ({
    x: Math.random() * W,
    y: -10 - Math.random() * 40,
    size: 3 + Math.random() * 5,
    rot: Math.random() * Math.PI * 2,
    vr: (Math.random() - 0.5) * 0.03,
    vy: 0.3 + Math.random() * 0.6,
    drift: Math.random() * Math.PI * 2,
    driftSpeed: 0.008 + Math.random() * 0.012,
    wobble: 0.3 + Math.random() * 0.8,
  })

  const resize = () => {
    W = window.innerWidth
    H = window.innerHeight
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (!petals.length) {
      for (let i = 0; i < 30; i++) {
        const p = makePetal()
        p.y = Math.random() * H
        petals.push(p)
      }
    }
  }
  resize()
  window.addEventListener('resize', resize)

  const draw = () => {
    if (!isActive('bg-pattern-petals')) return
    raf = requestAnimationFrame(draw)
    ctx.clearRect(0, 0, W, H)
    const c = getEffectColor()
    const sz = getEffectSize()
    petals.forEach((p) => {
      p.y += p.vy
      p.rot += p.vr
      p.drift += p.driftSpeed
      p.x += Math.sin(p.drift) * p.wobble
      if (p.y > H + 15) Object.assign(p, makePetal())
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.globalAlpha = 0.2
      ctx.fillStyle = c
      ctx.beginPath()
      ctx.ellipse(-p.size * 0.2 * sz, 0, p.size * 0.6 * sz, p.size * 0.3 * sz, 0.3, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    })
    ctx.globalAlpha = 1
  }
  draw()

  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', resize)
    canvas.remove()
  }
}

function initSparkles(): () => void {
  if (document.getElementById('sparkles-canvas')) return () => {}
  const canvas = makeCanvas('sparkles-canvas')
  const ctx = canvas.getContext('2d')!
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  let W = 0
  let H = 0
  const sparkles: { x: number; y: number; size: number; phase: number; speed: number; life: number }[] =
    []
  let raf = 0

  const makeSpark = () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    size: 2 + Math.random() * 5,
    phase: Math.random() * Math.PI * 2,
    speed: 0.015 + Math.random() * 0.03,
    life: 0.5 + Math.random() * 0.5,
  })

  const resize = () => {
    W = window.innerWidth
    H = window.innerHeight
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (!sparkles.length) {
      for (let i = 0; i < 35; i++) sparkles.push(makeSpark())
    }
  }
  resize()
  window.addEventListener('resize', resize)

  const drawStar = (x: number, y: number, r: number, c: string, alpha: number) => {
    ctx.save()
    ctx.translate(x, y)
    ctx.fillStyle = c
    ctx.globalAlpha = alpha
    ctx.beginPath()
    ctx.moveTo(0, -r)
    ctx.quadraticCurveTo(r * 0.15, -r * 0.15, r, 0)
    ctx.quadraticCurveTo(r * 0.15, r * 0.15, 0, r)
    ctx.quadraticCurveTo(-r * 0.15, r * 0.15, -r, 0)
    ctx.quadraticCurveTo(-r * 0.15, -r * 0.15, 0, -r)
    ctx.fill()
    ctx.restore()
  }

  const draw = () => {
    if (!isActive('bg-pattern-sparkles')) return
    raf = requestAnimationFrame(draw)
    ctx.clearRect(0, 0, W, H)
    const c = getEffectColor()
    const sizeMult = getEffectSize()
    sparkles.forEach((s) => {
      s.phase += s.speed
      const twinkle = Math.sin(s.phase)
      const alpha = Math.max(0, twinkle) * 0.25 * s.life
      const scale = 0.5 + Math.max(0, twinkle) * 0.5
      if (alpha > 0.01) drawStar(s.x, s.y, s.size * scale * sizeMult, c, alpha)
      if (s.phase > Math.PI * 6) Object.assign(s, makeSpark())
    })
    ctx.globalAlpha = 1
  }
  draw()

  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', resize)
    canvas.remove()
  }
}

function initEmbers(): () => void {
  if (document.getElementById('embers-canvas')) return () => {}
  const canvas = makeCanvas('embers-canvas')
  const ctx = canvas.getContext('2d')!
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  let W = 0
  let H = 0
  const embers: {
    x: number
    y: number
    vx: number
    vy: number
    r: number
    life: number
    maxLife: number
    wobble: number
    spark: boolean
  }[] = []
  let raf = 0

  const makeEmber = () => ({
    x: Math.random() * W,
    y: H + Math.random() * 40,
    vx: (Math.random() - 0.5) * 0.3,
    vy: -0.3 - Math.random() * 0.8,
    r: 0.3 + Math.random() * 0.6,
    life: 0,
    maxLife: 220 + Math.random() * 220,
    wobble: Math.random() * Math.PI * 2,
    spark: false,
  })

  const resize = () => {
    W = window.innerWidth
    H = window.innerHeight
    canvas.width = W * dpr
    canvas.height = H * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    if (!embers.length) {
      for (let i = 0; i < 60; i++) {
        const e = makeEmber()
        e.y = Math.random() * H
        e.life = Math.random() * e.maxLife
        embers.push(e)
      }
    }
  }
  resize()
  window.addEventListener('resize', resize)

  const rgba = (hex: string, a: number) => {
    const { r, g, b } = hexToRgb(hex)
    return `rgba(${r},${g},${b},${a})`
  }

  const draw = () => {
    if (!isActive('bg-pattern-embers')) return
    raf = requestAnimationFrame(draw)
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillStyle = 'rgba(0,0,0,0.18)'
    ctx.fillRect(0, 0, W, H)
    ctx.globalCompositeOperation = 'lighter'
    const color = getEffectColor()
    const sz = getEffectSize()
    for (let i = embers.length - 1; i >= 0; i--) {
      const e = embers[i]
      e.wobble += 0.03
      e.x += e.vx + Math.sin(e.wobble) * 0.5
      e.y += e.vy
      e.life++
      if (e.life > e.maxLife || e.y < -20) {
        embers.splice(i, 1)
        if (embers.length < 70) embers.push(makeEmber())
        continue
      }
      const lifeRatio = e.life / e.maxLife
      const fade = Math.min(1, Math.min(lifeRatio * 4, (1 - lifeRatio) * 3))
      const r = e.r * sz
      const a = 0.55 * fade
      const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, r * 4)
      g.addColorStop(0, rgba(color, a))
      g.addColorStop(1, rgba(color, 0))
      ctx.fillStyle = g
      ctx.fillRect(e.x - r * 4, e.y - r * 4, r * 8, r * 8)
      e.spark = false
    }
    ctx.globalCompositeOperation = 'source-over'
  }
  draw()

  return () => {
    cancelAnimationFrame(raf)
    window.removeEventListener('resize', resize)
    canvas.remove()
  }
}

const INIT_MAP: Record<string, () => () => void> = {
  synapse: initSynapse,
  rain: initRain,
  constellations: initConstellations,
  'perlin-flow': initPerlinFlow,
  petals: initPetals,
  sparkles: initSparkles,
  embers: initEmbers,
}

export function clearBgCanvases(): void {
  CANVAS_IDS.forEach((id) => document.getElementById(id)?.remove())
}

export function mountBgEffect(pattern: BgPattern | undefined): () => void {
  clearBgCanvases()
  if (!pattern || pattern === 'none' || pattern === 'dots') return () => {}
  const init = INIT_MAP[pattern]
  return init ? init() : () => {}
}

/** Mount a scaled preview canvas inside a sandbox tile (BackgroundsPage). */
export function mountBgPreview(
  container: HTMLElement,
  pattern: BgPattern,
  bgColor: string,
): () => void {
  if (!INIT_MAP[pattern]) return () => {}
  const canvas = document.createElement('canvas')
  canvas.className = 'bg-preview-canvas'
  canvas.setAttribute('aria-hidden', 'true')
  container.replaceChildren(canvas)
  container.style.setProperty('--preview-bg', bgColor)

  const ctx = canvas.getContext('2d')
  if (!ctx) return () => {}

  let raf = 0
  let W = 0
  let H = 0

  const resize = () => {
    W = container.clientWidth
    H = container.clientHeight
    if (W < 1 || H < 1) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = W * dpr
    canvas.height = H * dpr
    canvas.style.width = `${W}px`
    canvas.style.height = `${H}px`
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }

  const ro = new ResizeObserver(resize)
  ro.observe(container)
  resize()

  // Lightweight preview loops — same visuals, fewer particles than full-page effects.
  const color = () =>
    getComputedStyle(document.documentElement).getPropertyValue('--bg-effect-color').trim() ||
    getComputedStyle(document.documentElement).getPropertyValue('--fg').trim() ||
    '#9cdef2'

  if (pattern === 'rain') {
    const drops: { x: number; y: number; len: number; speed: number }[] = []
    const draw = () => {
      raf = requestAnimationFrame(draw)
      if (W < 1) return
      ctx.clearRect(0, 0, W, H)
      const c = color()
      if (drops.length < 40 && Math.random() < 0.5) {
        drops.push({
          x: Math.random() * W,
          y: -10,
          len: 8 + Math.random() * 14,
          speed: 2 + Math.random() * 4,
        })
      }
      for (let i = drops.length - 1; i >= 0; i--) {
        const d = drops[i]
        d.y += d.speed
        if (d.y > H + d.len) {
          drops.splice(i, 1)
          continue
        }
        ctx.strokeStyle = c
        ctx.globalAlpha = 0.35
        ctx.beginPath()
        ctx.moveTo(d.x, d.y - d.len)
        ctx.lineTo(d.x, d.y)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }
    draw()
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      container.replaceChildren()
    }
  }

  if (pattern === 'synapse') {
    const GRID = 12
    const pulses: { x: number; y: number; dx: number; dy: number }[] = []
    const draw = () => {
      raf = requestAnimationFrame(draw)
      if (W < 1) return
      ctx.clearRect(0, 0, W, H)
      const c = color()
      if (pulses.length < 8 && Math.random() < 0.15) {
        const speed = 1 + Math.random() * 8
        if (Math.random() > 0.5) {
          pulses.push({ x: -4, y: Math.floor(Math.random() * (H / GRID + 1)) * GRID, dx: speed, dy: 0 })
        } else {
          pulses.push({ x: Math.floor(Math.random() * (W / GRID + 1)) * GRID, y: -4, dx: 0, dy: speed })
        }
      }
      for (let i = pulses.length - 1; i >= 0; i--) {
        const p = pulses[i]
        p.x += p.dx
        p.y += p.dy
        if (p.x > W + 4 || p.y > H + 4) {
          pulses.splice(i, 1)
          continue
        }
        ctx.strokeStyle = c
        ctx.globalAlpha = 0.4
        ctx.beginPath()
        ctx.moveTo(p.x - p.dx * 3, p.y - p.dy * 3)
        ctx.lineTo(p.x, p.y)
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }
    draw()
    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      container.replaceChildren()
    }
  }

  // Generic twinkle/particle preview for remaining canvas patterns
  const particles: { x: number; y: number; phase: number; r: number }[] = Array.from(
    { length: 18 },
    () => ({
      x: Math.random(),
      y: Math.random(),
      phase: Math.random() * Math.PI * 2,
      r: 0.5 + Math.random() * 1.5,
    }),
  )
  let t = 0
  const draw = () => {
    raf = requestAnimationFrame(draw)
    if (W < 1) return
    t += 0.02
    ctx.clearRect(0, 0, W, H)
    const c = color()
    ctx.fillStyle = c
    for (const p of particles) {
      const tw = 0.4 + 0.6 * Math.sin(t * 2 + p.phase)
      ctx.globalAlpha = tw * 0.35
      ctx.beginPath()
      ctx.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2)
      ctx.fill()
    }
    ctx.globalAlpha = 1
  }
  draw()

  return () => {
    cancelAnimationFrame(raf)
    ro.disconnect()
    container.replaceChildren()
  }
}
