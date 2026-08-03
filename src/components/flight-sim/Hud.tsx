'use client'
import { AttitudeIndicator } from './AttitudeIndicator'
import { Minimap } from './Minimap'
import type { CameraMode } from '@/lib/flight-sim/types'
import type { HudSnapshot } from '@/lib/flight-sim/engine/FlightEngine'

interface Props {
  snap: HudSnapshot
  cameraMode: CameraMode
}

function Panel({ title, value, unit, sub }: { title: string; value: string; unit?: string; sub?: string }) {
  return (
    <div className="rounded-md border border-cyan-400/30 bg-black/45 px-3 py-1.5 backdrop-blur-sm">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-cyan-300/80">{title}</div>
      <div className="font-mono text-lg leading-tight text-white tabular-nums">
        {value}
        {unit && <span className="ml-1 text-xs text-cyan-200/70">{unit}</span>}
      </div>
      {sub && <div className="font-mono text-[10px] text-cyan-200/70">{sub}</div>}
    </div>
  )
}

export function Hud({ snap, cameraMode }: Props) {
  const s = snap.state
  const speedKmh = Math.round(s.airspeed * 3.6)
  const altM = Math.round(s.altitude)
  const hdg = Math.round(s.heading)
  const thr = Math.round(s.throttle * 100)
  const aoa = s.aoa.toFixed(1)
  const vsiFpm = Math.round(s.verticalSpeed * 196.85) // m/s -> ft/min
  const gear = s.gearDown ? 'DOWN' : 'UP'
  const modeLabel = cameraMode.toUpperCase()

  const stallNear = Math.abs(s.aoa) > 12 && !s.stalled
  const stallOn = s.stalled

  return (
    <div className="pointer-events-none absolute inset-0 select-none font-sans">
      {/* Top-left: speed + AoA */}
      <div className="absolute left-3 top-3 flex flex-col gap-2">
        <Panel title="Speed" value={String(speedKmh)} unit="km/h" />
        <Panel title="AoA" value={aoa} unit="°" sub={stallNear ? '⚠ HIGH' : undefined} />
        {snap.debug && (
          <div className="rounded-md border border-emerald-400/30 bg-black/45 px-3 py-1.5 font-mono text-[10px] text-emerald-300/90 backdrop-blur-sm">
            <div>FPS: {Math.round(snap.fps)}</div>
            <div>Draws: {snap.drawCalls}</div>
            <div>Tris: {snap.triangles.toLocaleString()}</div>
            <div>Geos: {snap.geomMemory}</div>
            <div>Texs: {snap.texMemory}</div>
          </div>
        )}
      </div>

      {/* Top-right: altitude + VSI */}
      <div className="absolute right-3 top-3 flex flex-col items-end gap-2">
        <Panel title="Altitude" value={String(altM)} unit="m" />
        <Panel title="VSI" value={String(vsiFpm)} unit="fpm" />
        <Panel title="Gear" value={gear} />
      </div>

      {/* Top-center: heading + camera */}
      <div className="absolute left-1/2 top-3 flex -translate-x-1/2 flex-col items-center gap-1">
        <Panel title="Heading" value={String(hdg).padStart(3, '0')} unit="°" />
        <div className="rounded border border-amber-300/30 bg-black/40 px-2 py-0.5 font-mono text-[10px] text-amber-200/90">
          VIEW: {modeLabel}
        </div>
      </div>

      {/* Bottom-left: throttle + rpm */}
      <div className="absolute bottom-3 left-3 flex flex-col gap-2">
        <Panel title="Throttle" value={String(thr)} unit="%" sub={`RPM ${(s.rpmNorm * 100).toFixed(0)}%`} />
        <div className="h-2 w-32 overflow-hidden rounded-full border border-cyan-400/30 bg-black/50">
          <div
            className="h-full bg-gradient-to-r from-cyan-400 to-amber-300"
            style={{ width: `${thr}%` }}
          />
        </div>
      </div>

      {/* Bottom-right: minimap */}
      <div className="absolute bottom-3 right-3">
        <Minimap px={s.position.x} pz={s.position.z} heading={s.heading} size={150} />
      </div>

      {/* Center: attitude indicator + crosshair */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <AttitudeIndicator roll={s.roll} pitch={s.pitch} size={150} />
      </div>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="h-5 w-5 rounded-full border border-amber-300/70" />
        <div className="absolute left-1/2 top-1/2 h-px w-8 -translate-x-1/2 -translate-y-1/2 bg-amber-300/70" />
        <div className="absolute left-1/2 top-1/2 h-8 w-px -translate-x-1/2 -translate-y-1/2 bg-amber-300/70" />
      </div>

      {/* Stall warning */}
      {(stallOn || stallNear) && (
        <div
          className={`absolute left-1/2 top-[22%] -translate-x-1/2 rounded-md border px-4 py-1.5 font-mono text-lg font-bold ${
            stallOn
              ? 'animate-pulse border-red-500 bg-red-900/50 text-red-300'
              : 'border-orange-500/70 bg-orange-900/40 text-orange-300'
          }`}
        >
          {stallOn ? '⚠ STALL ⚠' : '⚠ APPROACHING STALL'}
        </div>
      )}

      {/* Bottom-center: controls hint */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-md border border-white/15 bg-black/40 px-3 py-1 font-mono text-[10px] text-white/70 backdrop-blur-sm">
        <span className="text-cyan-300">W/S</span> pitch ·{' '}
        <span className="text-cyan-300">A/D</span> roll ·{' '}
        <span className="text-cyan-300">Q/E</span> rudder ·{' '}
        <span className="text-cyan-300">Shift/Ctrl</span> throttle ·{' '}
        <span className="text-cyan-300">Space</span> brake ·{' '}
        <span className="text-cyan-300">G</span> gear ·{' '}
        <span className="text-cyan-300">C</span> camera ·{' '}
        <span className="text-cyan-300">Esc</span> pause
      </div>
    </div>
  )
}
