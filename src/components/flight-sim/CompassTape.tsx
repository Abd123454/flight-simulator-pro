'use client'
import { useLayoutEffect, useRef } from 'react'

interface Props {
  heading: number // degrees 0..360
  width?: number
  height?: number
}

/** Horizontal compass tape at the top of the HUD. */
export function CompassTape({ heading, width = 400, height = 36 }: Props) {
  const ref = useRef<HTMLCanvasElement>(null)

  useLayoutEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    if (canvas.width !== width * dpr) {
      canvas.width = width * dpr
      canvas.height = height * dpr
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, width, height)

    const cx = width / 2
    const pxPerDeg = 3
    const range = width / 2 / pxPerDeg

    // background
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fillRect(0, 0, width, height)

    ctx.strokeStyle = 'rgba(180,220,255,0.6)'
    ctx.fillStyle = 'rgba(180,220,255,0.8)'
    ctx.font = '9px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    for (let d = -range; d <= range; d += 1) {
      let hd = heading + d
      hd = ((hd % 360) + 360) % 360
      const x = cx + d * pxPerDeg
      const isMajor = hd % 10 === 0
      const isCardinal = hd % 90 === 0

      if (isCardinal) {
        ctx.strokeStyle = '#ffffff'
        ctx.beginPath()
        ctx.moveTo(x, height - 4)
        ctx.lineTo(x, height - 14)
        ctx.stroke()
        const label = hd === 0 ? 'N' : hd === 90 ? 'E' : hd === 180 ? 'S' : 'W'
        ctx.fillStyle = '#ffd23f'
        ctx.font = 'bold 12px monospace'
        ctx.fillText(label, x, 8)
        ctx.font = '9px monospace'
        ctx.fillStyle = 'rgba(180,220,255,0.8)'
      } else if (isMajor) {
        ctx.strokeStyle = 'rgba(180,220,255,0.6)'
        ctx.beginPath()
        ctx.moveTo(x, height - 4)
        ctx.lineTo(x, height - 10)
        ctx.stroke()
        ctx.fillText(String(hd).padStart(3, '0'), x, 8)
      }
    }

    // center pointer (current heading)
    ctx.fillStyle = '#ffd23f'
    ctx.beginPath()
    ctx.moveTo(cx, height)
    ctx.lineTo(cx - 5, height - 8)
    ctx.lineTo(cx + 5, height - 8)
    ctx.fill()

    // border
    ctx.strokeStyle = 'rgba(180,220,255,0.3)'
    ctx.lineWidth = 1
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1)
  }, [heading, width, height])

  return (
    <canvas
      ref={ref}
      style={{ width, height, display: 'block' }}
      aria-label="Compass tape"
    />
  )
}
