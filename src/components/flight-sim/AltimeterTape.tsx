'use client'
import { useLayoutEffect, useRef } from 'react'

interface Props {
  altitude: number // meters
  verticalSpeed: number // m/s
  height?: number
  width?: number
}

/** Vertical altimeter tape on the right side of the HUD. */
export function AltimeterTape({ altitude, verticalSpeed, height = 200, width = 56 }: Props) {
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

    const cy = height / 2
    const pxPerM = 0.35 // pixels per meter
    const range = height / 2 / pxPerM

    // background
    ctx.fillStyle = 'rgba(0,0,0,0.5)'
    ctx.fillRect(0, 0, width, height)

    ctx.fillStyle = 'rgba(180,220,255,0.8)'
    ctx.font = '8px monospace'
    ctx.textAlign = 'right'
    ctx.textBaseline = 'middle'

    const majorEvery = altitude > 500 ? 100 : altitude > 100 ? 50 : 10
    for (let m = -range; m <= range; m += 1) {
      const alt = altitude + m
      if (alt < 0) continue
      const y = cy - m * pxPerM
      const isMajor = alt % majorEvery === 0

      if (isMajor) {
        ctx.strokeStyle = 'rgba(180,220,255,0.6)'
        ctx.beginPath()
        ctx.moveTo(width, y)
        ctx.lineTo(width - 8, y)
        ctx.stroke()
        ctx.fillText(String(Math.round(alt)), width - 10, y)
      } else if (alt % (majorEvery / 2) === 0) {
        ctx.strokeStyle = 'rgba(180,220,255,0.3)'
        ctx.beginPath()
        ctx.moveTo(width, y)
        ctx.lineTo(width - 4, y)
        ctx.stroke()
      }
    }

    // center window (current altitude)
    ctx.fillStyle = '#000'
    ctx.fillRect(2, cy - 10, width - 18, 20)
    ctx.strokeStyle = '#ffd23f'
    ctx.lineWidth = 1.5
    ctx.strokeRect(2, cy - 10, width - 18, 20)
    ctx.fillStyle = '#ffd23f'
    ctx.font = 'bold 12px monospace'
    ctx.textAlign = 'center'
    ctx.fillText(String(Math.round(altitude)), (width - 16) / 2 + 2, cy)

    // vertical speed indicator arrow
    if (Math.abs(verticalSpeed) > 0.5) {
      const arrowLen = Math.min(30, Math.abs(verticalSpeed) * 8)
      const dir = verticalSpeed > 0 ? -1 : 1
      ctx.fillStyle = verticalSpeed > 0 ? '#39ff14' : '#ff6030'
      ctx.beginPath()
      const ay = cy + dir * (12 + arrowLen)
      ctx.moveTo(width - 6, cy + dir * 12)
      ctx.lineTo(width - 10, ay)
      ctx.lineTo(width - 2, ay)
      ctx.closePath()
      ctx.fill()
    }

    // border
    ctx.strokeStyle = 'rgba(180,220,255,0.3)'
    ctx.lineWidth = 1
    ctx.strokeRect(0.5, 0.5, width - 1, height - 1)
  }, [altitude, verticalSpeed, width, height])

  return (
    <canvas
      ref={ref}
      style={{ width, height, display: 'block' }}
      aria-label="Altimeter tape"
    />
  )
}
