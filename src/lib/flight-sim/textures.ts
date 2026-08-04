// Procedural Canvas2D textures so the sim ships with zero external assets.
// All textures capped at 1024x1024 and use RepeatWrapping for tiling.
// Intel HD 6xx iGPU mitigations:
//  - generateMipmaps explicitly set (avoids driver default ambiguity)
//  - anisotropy capped low (1 in compat mode) since some Intel drivers
//    report false max-anisotropy values
//  - minFilter/magFilter explicitly Linear (no mipmaps in compat mode)
import * as THREE from 'three'

function makeCanvas(size: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas')
  c.width = size
  c.height = size
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context not available')
  return [c, ctx]
}

/** Compatibility mode flag — when true, textures use simpler settings
 * (no mipmaps, anisotropy=1) to avoid Intel iGPU driver bugs. */
let compatMode = false

export function setTextureCompatMode(enabled: boolean) {
  compatMode = enabled
}

function finalize(canvas: HTMLCanvasElement, repeat = 1, anisotropy = 4): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas)
  tex.wrapS = tex.wrapT = repeat > 1 ? THREE.RepeatWrapping : THREE.ClampToEdgeWrapping
  if (repeat > 1) tex.repeat.set(repeat, repeat)
  if (compatMode) {
    // Safe mode: no mipmaps, no anisotropy, simple nearest filtering
    tex.generateMipmaps = false
    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter
    tex.anisotropy = 1
  } else {
    tex.generateMipmaps = true
    tex.minFilter = THREE.LinearMipmapLinearFilter
    tex.magFilter = THREE.LinearFilter
    tex.anisotropy = anisotropy
  }
  tex.colorSpace = THREE.SRGBColorSpace
  tex.needsUpdate = true
  return tex
}

/** Tileable grass with subtle noise variation. */
export function makeGrassTexture(): THREE.CanvasTexture {
  const size = 512
  const [c, ctx] = makeCanvas(size)
  // base
  ctx.fillStyle = '#4a6a3a'
  ctx.fillRect(0, 0, size, size)
  // noise speckle
  const img = ctx.getImageData(0, 0, size, size)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 28
    d[i] = Math.max(0, Math.min(255, d[i] + n))
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n))
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n * 0.5))
  }
  ctx.putImageData(img, 0, 0)
  // a few darker patches
  for (let i = 0; i < 40; i++) {
    ctx.fillStyle = `rgba(60,80,45,${Math.random() * 0.25})`
    const r = 8 + Math.random() * 30
    ctx.beginPath()
    ctx.arc(Math.random() * size, Math.random() * size, r, 0, Math.PI * 2)
    ctx.fill()
  }
  return finalize(c, 1, 4)
}

/** Asphalt with light noise. */
function asphaltBase(ctx: CanvasRenderingContext2D, size: number, base: string) {
  ctx.fillStyle = base
  ctx.fillRect(0, 0, size, size)
  const img = ctx.getImageData(0, 0, size, size)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 18
    d[i] = Math.max(0, Math.min(255, d[i] + n))
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n))
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n))
  }
  ctx.putImageData(img, 0, 0)
}

/**
 * Full runway texture (mapped along the length). Includes:
 *  - green threshold blocks at top & bottom ends
 *  - white threshold bars
 *  - dashed centerline
 *  - runway numbers ("36" / "18")
 *  - aiming point bars
 *  - edge stripes
 * The texture runs along the Z axis (length). Top of canvas = one threshold.
 */
export function makeRunwayTexture(): THREE.CanvasTexture {
  const w = 256
  const h = 2048
  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D context not available')
  asphaltBase(ctx, h > w ? w : w, '#3a3a3a') // fill via rects since non-square
  // re-fill properly (asphaltBase assumes square; do manually)
  ctx.fillStyle = '#3a3a3e'
  ctx.fillRect(0, 0, w, h)
  const img = ctx.getImageData(0, 0, w, h)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 16
    d[i] = Math.max(0, Math.min(255, d[i] + n))
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n))
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n))
  }
  ctx.putImageData(img, 0, 0)

  const cx = w / 2
  // ---- threshold green blocks (top & bottom) ----
  ctx.fillStyle = '#2faa3a'
  ctx.fillRect(0, 0, w, 90)
  ctx.fillRect(0, h - 90, w, 90)

  // ---- threshold bars (6 white bars) at both ends ----
  ctx.fillStyle = '#f2f2f2'
  const barW = 10
  const barH = 130
  const gap = (w - 6 * barW) / 7
  for (let end = 0; end < 2; end++) {
    const y0 = end === 0 ? 100 : h - 100 - barH
    for (let i = 0; i < 6; i++) {
      const x = gap + i * (barW + gap)
      ctx.fillRect(x, y0, barW, barH)
    }
  }

  // ---- runway numbers ----
  ctx.fillStyle = '#f2f2f2'
  ctx.font = 'bold 70px Arial'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.save()
  ctx.translate(cx, 290)
  ctx.fillText('36', 0, 0)
  ctx.restore()
  ctx.save()
  ctx.translate(cx, h - 290)
  ctx.rotate(Math.PI)
  ctx.fillText('18', 0, 0)
  ctx.restore()

  // ---- aiming point markers (two thick bars ~300m from each threshold) ----
  ctx.fillStyle = '#f2f2f2'
  const aimW = 34
  const aimH = 70
  const aimY1 = 470
  ctx.fillRect(cx - 60, aimY1, aimW, aimH)
  ctx.fillRect(cx + 26, aimY1, aimW, aimH)
  ctx.fillRect(cx - 60, h - aimY1 - aimH, aimW, aimH)
  ctx.fillRect(cx + 26, h - aimY1 - aimH, aimW, aimH)

  // ---- dashed centerline ----
  ctx.fillStyle = '#f2f2f2'
  const dashH = 60
  const dashGap = 45
  let y = 380
  while (y < h - 380) {
    ctx.fillRect(cx - 3, y, 6, dashH)
    y += dashH + dashGap
  }

  // ---- edge stripes (continuous thin white lines) ----
  ctx.fillRect(16, 100, 5, h - 200)
  ctx.fillRect(w - 21, 100, 5, h - 200)

  const tex = new THREE.CanvasTexture(c)
  tex.colorSpace = THREE.SRGBColorSpace
  tex.anisotropy = 8
  tex.needsUpdate = true
  return tex
}

/** Concrete for taxiways / apron. */
export function makeConcreteTexture(): THREE.CanvasTexture {
  const size = 256
  const [c, ctx] = makeCanvas(size)
  ctx.fillStyle = '#9a9a96'
  ctx.fillRect(0, 0, size, size)
  const img = ctx.getImageData(0, 0, size, size)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 22
    d[i] = Math.max(0, Math.min(255, d[i] + n))
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n))
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n))
  }
  ctx.putImageData(img, 0, 0)
  // expansion joint grid
  ctx.strokeStyle = 'rgba(60,60,58,0.5)'
  ctx.lineWidth = 2
  for (let i = 0; i <= size; i += 64) {
    ctx.beginPath()
    ctx.moveTo(i, 0)
    ctx.lineTo(i, size)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, i)
    ctx.lineTo(size, i)
    ctx.stroke()
  }
  return finalize(c, 1, 4)
}

/** Yellow taxiway centerline dashes texture. */
export function makeTaxiwayTexture(): THREE.CanvasTexture {
  const size = 512
  const [c, ctx] = makeCanvas(size)
  ctx.fillStyle = '#5a5a56'
  ctx.fillRect(0, 0, size, size)
  const img = ctx.getImageData(0, 0, size, size)
  const d = img.data
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * 18
    d[i] = Math.max(0, Math.min(255, d[i] + n))
    d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n))
    d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n))
  }
  ctx.putImageData(img, 0, 0)
  // yellow dashes down center (vertical)
  ctx.fillStyle = '#e8c020'
  for (let y = 20; y < size; y += 70) {
    ctx.fillRect(size / 2 - 5, y, 10, 40)
  }
  return finalize(c, 1, 4)
}
