'use client'
import { Minimap } from './Minimap'
import { CompassTape } from './CompassTape'
import { AltimeterTape } from './AltimeterTape'
import type { CameraMode } from '@/lib/flight-sim/types'
import type { HudSnapshot } from '@/lib/flight-sim/engine/FlightEngine'

interface Props {
  snap: HudSnapshot
  cameraMode: CameraMode
}

function Panel({ title, value, unit, sub, warn }: { title: string; value: string; unit?: string; sub?: string; warn?: boolean }) {
  return (
    <div className={`rounded-md border px-3 py-1.5 backdrop-blur-sm ${
      warn ? 'border-orange-400/50 bg-orange-950/50' : 'border-cyan-400/30 bg-black/45'
    }`}>
      <div className={`text-[10px] font-semibold uppercase tracking-widest ${warn ? 'text-orange-300/90' : 'text-cyan-300/80'}`}>{title}</div>
      <div className={`font-mono text-lg leading-tight tabular-nums ${warn ? 'text-orange-200' : 'text-white'}`}>
        {value}
        {unit && <span className={`ml-1 text-xs ${warn ? 'text-orange-300/70' : 'text-cyan-200/70'}`}>{unit}</span>}
      </div>
      {sub && <div className={`font-mono text-[10px] ${warn ? 'text-orange-300/70' : 'text-cyan-200/70'}`}>{sub}</div>}
    </div>
  )
}

function GearLight({ down, label }: { down: boolean; label: string }) {
  return (
    <div className="flex items-center gap-1">
      <div
        className={`h-2 w-2 rounded-full ${
          down ? 'bg-green-400 shadow-[0_0_4px_2px_rgba(74,222,128,0.6)]' : 'bg-red-500/40'
        }`}
      />
      <span className="font-mono text-[9px] text-white/60">{label}</span>
    </div>
  )
}

/** ILS indicator: cross with localizer (horizontal) and glideslope (vertical) dots. */
function ILSIndicator({ localizer, glideslope, inRange }: { localizer: number; glideslope: number; inRange: boolean }) {
  if (!inRange) return null
  const cx = 50
  const cy = 50
  const locX = cx + localizer * 20
  const gsY = cy - glideslope * 20
  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      <svg width="100" height="100" viewBox="0 0 100 100" className="opacity-80">
        <line x1="20" y1={cy} x2="80" y2={cy} stroke="rgba(180,220,255,0.5)" strokeWidth="1" />
        {[30, 40, 60, 70].map((x) => (
          <line key={x} x1={x} y1={cy - 3} x2={x} y2={cy + 3} stroke="rgba(180,220,255,0.4)" strokeWidth="1" />
        ))}
        <line x1={cx} y1="20" x2={cx} y2="80" stroke="rgba(180,220,255,0.5)" strokeWidth="1" />
        {[30, 40, 60, 70].map((y) => (
          <line key={y} x1={cx - 3} y1={y} x2={cx + 3} y2={y} stroke="rgba(180,220,255,0.4)" strokeWidth="1" />
        ))}
        <circle cx={locX} cy={cy} r="3" fill="#ffd23f" />
        <circle cx={cx} cy={gsY} r="3" fill="#39ff14" />
      </svg>
    </div>
  )
}

export function Hud({ snap, cameraMode }: Props) {
  const s = snap.state
  const speedKmh = Math.round(s.airspeed * 3.6)
  const thr = Math.round(s.throttle * 100)
  const aoa = s.aoa.toFixed(1)
  const vsiFpm = Math.round(s.verticalSpeed * 196.85)
  const gear = s.gearDown ? 'DOWN' : 'UP'
  const modeLabel = cameraMode.toUpperCase()

  const stallNear = Math.abs(s.aoa) > 12 && !s.stalled
  const stallOn = s.stalled
  const gearDown = s.gearDown

  const windCardinal =
    snap.windDir >= 315 || snap.windDir < 45 ? 'N' :
    snap.windDir < 135 ? 'E' :
    snap.windDir < 225 ? 'S' : 'W'

  // mission progress
  const wps = snap.waypoints
  const reachedCount = wps.filter((w) => w.reached).length
  const totalCount = wps.length
  const tgtReached = snap.targets.filter((t) => t.destroyed).length
  const tgtTotal = snap.targets.length

  return (
    <div className="pointer-events-none absolute inset-0 select-none font-sans">
      {/* Top-center: compass tape + mission info */}
      <div className="absolute left-1/2 top-3 -translate-x-1/2">
        <CompassTape heading={s.heading} width={400} height={36} />
      </div>

      {/* Mission status bar (below compass) */}
      <div className="absolute left-1/2 top-12 -translate-x-1/2">
        <div role="status" aria-live="polite" className="flex items-center gap-4 rounded-md border border-white/15 bg-black/50 px-4 py-1 backdrop-blur-sm">
          <span className="font-mono text-xs text-amber-300">{snap.missionName}</span>
          {totalCount > 0 && (
            <span className="font-mono text-xs text-cyan-300">
              GATES {reachedCount}/{totalCount}
            </span>
          )}
          {tgtTotal > 0 && (
            <span className="font-mono text-xs text-red-300">
              TARGETS {tgtReached}/{tgtTotal}
            </span>
          )}
          {snap.missionType !== 'freeflight' && (
            <span className="font-mono text-xs text-white/70">
              ⏱ {Math.floor(snap.missionTime / 60)}:{String(Math.floor(snap.missionTime % 60)).padStart(2, '0')}
            </span>
          )}
          <span className="font-mono text-xs font-bold text-emerald-300">
            SCORE {snap.score.toLocaleString()}
          </span>
          {snap.combo > 1 && (
            <span className="font-mono text-xs font-bold text-amber-400 animate-pulse">
              ×{snap.combo} COMBO
            </span>
          )}
          {/* Weather indicator */}
          <span className={`font-mono text-xs ${
            snap.weatherCondition === 'storm' ? 'text-red-400' :
            snap.weatherCondition === 'rain' ? 'text-blue-400' :
            snap.weatherCondition === 'cloudy' ? 'text-slate-400' : 'text-yellow-400'
          }`}>
            <span aria-hidden="true">{snap.weatherCondition === 'clear' ? '☀' :
             snap.weatherCondition === 'cloudy' ? '☁' :
             snap.weatherCondition === 'rain' ? '🌧' : '⛈'}</span>
            {' '}{snap.weatherCondition.toUpperCase()}
            {snap.liveWeatherSource && <span className="text-emerald-400"> · LIVE</span>}
            {snap.gustActive && <span className="text-orange-400 animate-pulse" aria-label="gust warning"> GUST!</span>}
          </span>
          {/* Autopilot indicator */}
          {snap.autopilot && (
            <span className="font-mono text-xs font-bold text-emerald-400 animate-pulse">
              AP {Math.round(snap.autopilotHeading)}° / {Math.round(snap.autopilotAltitude)}m
            </span>
          )}
        </div>
      </div>

      {/* Top-left: speed + AoA + aircraft name */}
      <div className="absolute left-3 top-14 flex flex-col gap-2">
        <div className="rounded-md border border-white/20 bg-black/40 px-2 py-0.5 font-mono text-[10px] text-cyan-300">
          {snap.aircraftName} {snap.gamepadConnected && <span className="text-emerald-400" aria-hidden="true">🎮</span>}
        </div>
        <Panel title="Speed" value={String(speedKmh)} unit="km/h" />
        <Panel title="AoA" value={aoa} unit="°" sub={`β ${s.sideslip.toFixed(0)}°`} warn={stallNear} />
        {snap.afterburner && (
          <div className="animate-pulse rounded-md border border-blue-400/50 bg-blue-950/50 px-2 py-1 text-center font-mono text-[10px] font-bold text-blue-300" role="status" aria-live="polite">
            <span aria-hidden="true">⚡</span> AFTERBURNER
          </div>
        )}
        {snap.debug && (
          <div className="rounded-md border border-emerald-400/30 bg-black/45 px-3 py-1.5 font-mono text-[10px] text-emerald-300/90 backdrop-blur-sm">
            <div>FPS: {Math.round(snap.fps)}</div>
            <div>Draws: {snap.drawCalls}</div>
            <div>Tris: {snap.triangles.toLocaleString()}</div>
            <div>Geos: {snap.geomMemory}</div>
            <div>Texs: {snap.texMemory}</div>
            <div>Wind: {snap.windSpeed.toFixed(0)}m/s {windCardinal}</div>
            <div className="mt-1 border-t border-emerald-400/20 pt-1 text-emerald-400/70">
              GPU: {snap.rendererInfo}
            </div>
            <div>Aniso max: {snap.maxAnisotropy}</div>
            {snap.compatMode && <div className="text-amber-400">⚠ COMPAT MODE</div>}
          </div>
        )}
      </div>

      {/* Top-right: camera + gear + wind */}
      <div className="absolute right-3 top-14 flex flex-col items-end gap-2">
        <div className="rounded border border-amber-300/30 bg-black/40 px-2 py-0.5 font-mono text-[10px] text-amber-200/90">
          VIEW: {modeLabel}
        </div>
        <Panel title="Wind" value={snap.windSpeed.toFixed(0)} unit="m/s" sub={`${Math.round(snap.windDir)}° ${windCardinal}`} />
        <Panel title="Gear" value={gear} />
        <div className="rounded-md border border-cyan-400/30 bg-black/45 px-3 py-1.5 backdrop-blur-sm">
          <div className="mb-1 text-[10px] font-semibold uppercase tracking-widest text-cyan-300/80">Gear Pos</div>
          <div className="flex flex-col gap-0.5">
            <GearLight down={gearDown} label="NOSE" />
            <GearLight down={gearDown} label="L MAIN" />
            <GearLight down={gearDown} label="R MAIN" />
          </div>
        </div>
      </div>

      {/* Right-center: altimeter tape */}
      <div className="absolute right-3 top-1/2 -translate-y-1/2">
        <AltimeterTape altitude={s.altitude} verticalSpeed={s.verticalSpeed} height={200} width={56} />
      </div>

      {/* Bottom-left: throttle + flaps */}
      <div className="absolute bottom-3 left-3 flex flex-col gap-2">
        <Panel
          title="Throttle"
          value={String(thr)}
          unit="%"
          sub={`RPM ${(s.rpmNorm * 100).toFixed(0)}%${s.reverseThrust ? ' ◄ REV' : ''}`}
        />
        <div className="h-2 w-32 overflow-hidden rounded-full border border-cyan-400/30 bg-black/50">
          <div
            className={`h-full ${s.reverseThrust ? 'bg-gradient-to-r from-red-500 to-orange-400' : 'bg-gradient-to-r from-cyan-400 to-amber-300'}`}
            style={{ width: `${thr}%` }}
          />
        </div>
        <div className="flex gap-2">
          <div className="rounded-md border border-cyan-400/30 bg-black/45 px-3 py-1.5 backdrop-blur-sm">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-cyan-300/80">Flaps</div>
            <div className="flex gap-0.5">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className={`h-3 w-2 rounded-sm ${i < s.flaps ? 'bg-cyan-400' : 'bg-cyan-900/50'}`} />
              ))}
            </div>
          </div>
          <div className="rounded-md border border-cyan-400/30 bg-black/45 px-3 py-1.5 backdrop-blur-sm">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-cyan-300/80">Splr</div>
            <div className={`font-mono text-sm ${s.spoilers ? 'text-amber-300' : 'text-white/40'}`}>
              {s.spoilers ? 'ON' : 'OFF'}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom-right: minimap */}
      <div className="absolute bottom-3 right-3">
        <Minimap px={s.position.x} pz={s.position.z} heading={s.heading} size={150} />
      </div>

      {/* ILS indicator (landing approach only) */}
      <ILSIndicator localizer={snap.ilsLocalizer} glideslope={snap.ilsGlideslope} inRange={snap.ilsInRange} />

      {/* Next waypoint directional indicator */}
      {snap.nextWaypoint && (
        <div className="absolute left-1/2 top-[30%] -translate-x-1/2">
          <div className="rounded-md border border-cyan-400/40 bg-black/50 px-3 py-1 font-mono text-[10px] text-cyan-300 backdrop-blur-sm">
            → GATE {snap.nextWaypoint.id}
          </div>
        </div>
      )}

      {/* Small G + VSI readouts */}
      <div className="absolute left-[calc(50%+70px)] top-1/2 -translate-y-1/2">
        <div className="rounded border border-white/20 bg-black/50 px-1.5 py-0.5 font-mono text-[10px] text-white/70">
          {s.gForce.toFixed(1)}G
        </div>
      </div>
      <div className="absolute left-[calc(50%-100px)] top-1/2 -translate-y-1/2">
        <div className="rounded border border-white/20 bg-black/50 px-1.5 py-0.5 font-mono text-[10px] text-white/70">
          VS {vsiFpm > 0 ? '+' : ''}{vsiFpm}fpm
        </div>
      </div>

      {/* Stall warning */}
      {(stallOn || stallNear) && (
        <div role="alert" aria-live="assertive" className={`absolute left-1/2 top-[26%] -translate-x-1/2 rounded-md border px-4 py-1.5 font-mono text-lg font-bold ${
          stallOn ? 'animate-pulse border-red-500 bg-red-900/50 text-red-300' : 'border-orange-500/70 bg-orange-900/40 text-orange-300'
        }`}>
          <span aria-hidden="true">{stallOn ? '⚠ STALL ⚠' : '⚠ APPROACHING STALL'}</span>
          <span className="sr-only">{stallOn ? 'Stall warning' : 'Approaching stall'}</span>
        </div>
      )}

      {/* Controls hint */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 rounded-md border border-white/15 bg-black/40 px-3 py-1 font-mono text-[10px] text-white/70 backdrop-blur-sm">
        <kbd className="text-cyan-300">W/S</kbd> pitch ·{' '}
        <kbd className="text-cyan-300">A/D</kbd> roll ·{' '}
        <kbd className="text-cyan-300">Shift/Ctrl</kbd> throttle ·{' '}
        <kbd className="text-cyan-300">G</kbd> gear ·{' '}
        <kbd className="text-cyan-300">F/V</kbd> flaps ·{' '}
        <kbd className="text-cyan-300">C</kbd> camera ·{' '}
        <kbd className="text-cyan-300">1-4</kbd> weather ·{' '}
        <kbd className="text-cyan-300">P</kbd> autopilot ·{' '}
        <kbd className="text-cyan-300">Esc</kbd> pause
      </div>
    </div>
  )
}
