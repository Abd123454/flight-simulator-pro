'use client'
import { useLayoutEffect, useRef } from 'react'

interface Props {
  roll: number // radians
  pitch: number // radians
  size?: number
}

/** Artificial horizon (attitude indicator) drawn on a canvas. */
export function AttitudeIndicator({ roll, pitch, size = 150 }: Props) {
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
    const ppd = R / 45 // pixels per degree (45deg range to edge)

    ctx.save()
    // clip to round face
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.clip()

    // rotate by -roll, translate by pitch
    ctx.translate(cx, cy)
    ctx.rotate(roll) // bank the horizon
    const pitchPx = pitch * (180 / Math.PI) * ppd
    ctx.translate(0, pitchPx)

    // sky
    ctx.fillStyle = '#2b6fb0'
    ctx.fillRect(-S, -S, S * 2, S)
    // ground
    ctx.fillStyle = '#6b4a2a'
    ctx.fillRect(-S, 0, S * 2, S)
    // horizon line
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(-S, 0)
    ctx.lineTo(S, 0)
    ctx.stroke()

    // pitch ladder (every 10deg), major every 30
    ctx.font = '9px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    for (let deg = -60; deg <= 60; deg += 10) {
      if (deg === 0) continue
      const y = (-deg) * ppd
      const major = deg % 30 === 0
      const len = major ? 26 : 14
      ctx.strokeStyle = deg > 0 ? '#ffffff' : '#ffffff'
      ctx.beginPath()
      ctx.moveTo(-len, y)
      ctx.lineTo(len, y)
      ctx.stroke()
      if (major) {
        ctx.fillStyle = '#ffffff'
        ctx.fillText(String(Math.abs(deg)), -len - 8, y)
        ctx.fillText(String(Math.abs(deg)), len + 8, y)
      }
    }
    ctx.restore()

    // fixed aircraft symbol
    ctx.strokeStyle = '#ffd23f'
    ctx.lineWidth = 3
    ctx.beginPath()
    ctx.moveTo(cx - 26, cy)
    ctx.lineTo(cx - 8, cy)
    ctx.moveTo(cx + 8, cy)
    ctx.lineTo(cx + 26, cy)
    ctx.stroke()
    ctx.fillStyle = '#ffd23f'
    ctx.beginPath()
    ctx.arc(cx, cy, 2.5, 0, Math.PI * 2)
    ctx.fill()

    // roll arc ticks
    ctx.strokeStyle = '#ffffff'
    ctx.lineWidth = 1.5
    ctx.save()
    ctx.translate(cx, cy)
    for (const a of [-60, -45, -30, -20, -10, 0, 10, 20, 30, 45, 60]) {
      const rad = (a * Math.PI) / 180
      const r1 = R - 2
      const r2 = a === 0 ? R - 12 : R - 7
      ctx.beginPath()
      ctx.moveTo(Math.sin(rad) * r1, -Math.cos(rad) * r1)
      ctx.lineTo(Math.sin(rad) * r2, -Math.cos(rad) * r2)
      ctx.stroke()
    }
    ctx.restore()

    // roll pointer (top)
    ctx.fillStyle = '#ffd23f'
    ctx.beginPath()
    ctx.moveTo(cx, cy - R + 2)
    ctx.lineTo(cx - 4, cy - R + 10)
    ctx.lineTo(cx + 4, cy - R + 10)
    ctx.fill()

    // bezel
    ctx.strokeStyle = 'rgba(255,255,255,0.5)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.arc(cx, cy, R, 0, Math.PI * 2)
    ctx.stroke()
  }, [roll, pitch, size])

  return (
    <canvas
      ref={ref}
      style={{ width: size, height: size, display: 'block' }}
      aria-label="Attitude indicator"
    />
  )
}
