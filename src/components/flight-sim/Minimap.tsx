'use client'
import { useLayoutEffect, useRef } from 'react'

interface Props {
  px: number // player world x
  pz: number // player world z
  heading: number // degrees 0..360 (0 = north/-Z)
  size?: number
  scale?: number // meters per pixel
}

/** North-up radar minimap. Player at center; runway at world origin. */
export function Minimap({ px, pz, heading, size = 150, scale = 22 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useLayoutEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const S = size
    if (canvas.width !== S * dpr) {
      canvas.width = S * dpr
      canvas.height = S * dpr
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, S, S)

    const cx = S / 2
    const cy = S / 2
    const R = S / 2 - 2

    // background
    ctx.fillStyle = 'rgba(8,16,12,0.78)'
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.fill()
    ctx.clip()

    // range rings (500m, 1000m, 2000m)
    ctx.strokeStyle = 'rgba(80,220,120,0.35)'
    ctx.lineWidth = 1
    for (const m of [500, 1000, 2000]) {
      const r = m / scale
      if (r > R) continue
      ctx.beginPath()
      ctx.arc(cx, cy, r, 0, Math.PI * 2)
      ctx.stroke()
    }
    // cross hairs
    ctx.beginPath()
    ctx.moveTo(cx, cy - R)
    ctx.lineTo(cx, cy + R)
    ctx.moveTo(cx - R, cy)
    ctx.lineTo(cx + R, cy)
    ctx.stroke()

    // runway at world origin (0,0). World x-> map dx, world z -> map dy
    // player centered: runway screen pos = (0 - px)/scale + cx, (0 - pz)/scale + cy
    const rx = (0 - px) / scale + cx
    const ry = (0 - pz) / scale + cy
    const rw = 60 / scale
    const rl = 3000 / scale
    ctx.fillStyle = 'rgba(255,255,255,0.85)'
    ctx.fillRect(rx - rw / 2, ry - rl / 2, rw, rl)

    // player triangle at center, rotated by heading (0 = up/north)
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate((heading * Math.PI) / 180)
    ctx.fillStyle = '#39ff14'
    ctx.beginPath()
    ctx.moveTo(0, -6)
    ctx.lineTo(4, 5)
    ctx.lineTo(-4, 5)
    ctx.closePath()
    ctx.fill()
    ctx.restore()

    // N indicator
    ctx.fillStyle = '#9ad'
    ctx.font = 'bold 10px monospace'
    ctx.textAlign = 'center'
    ctx.fillText('N', cx, cy - R + 11)

    // bezel
    ctx.strokeStyle = 'rgba(255,255,255,0.4)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.stroke()
  }, [px, pz, heading, size, scale])

  return (
    <canvas
      ref={ref}
      style={{ width: size, height: size, display: 'block' }}
      aria-label="Radar minimap"
    />
  )
}
