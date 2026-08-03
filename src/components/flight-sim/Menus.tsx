'use client'
import { Button } from '@/components/ui/button'
import type { FlightResult } from '@/lib/flight-sim/engine/FlightEngine'

interface MenuShellProps {
  children: React.ReactNode
  title: string
  subtitle?: string
}

function MenuShell({ children, title, subtitle }: MenuShellProps) {
  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-gradient-to-b from-slate-950/85 via-slate-900/80 to-slate-950/90 backdrop-blur-sm">
      <div className="mb-1 text-5xl font-black tracking-tight text-white drop-shadow-lg">
        {title}
      </div>
      {subtitle && (
        <div className="mb-8 text-sm font-medium uppercase tracking-[0.3em] text-cyan-300/80">
          {subtitle}
        </div>
      )}
      <div className="flex flex-col items-center gap-3">{children}</div>
    </div>
  )
}

export function MainMenu({
  onStart,
  muted,
  onToggleMute,
}: {
  onStart: () => void
  muted: boolean
  onToggleMute: () => void
}) {
  return (
    <MenuShell title="Flight Simulator" subtitle="Pro · Boeing 737-800">
      <Button
        size="lg"
        onClick={onStart}
        className="w-64 bg-cyan-500 text-lg font-bold text-slate-950 hover:bg-cyan-400"
      >
        Start Flight
      </Button>
      <Button
        variant="outline"
        onClick={onToggleMute}
        className="w-64 border-white/20 bg-white/5 text-white hover:bg-white/10"
      >
        Sound: {muted ? 'Off' : 'On'}
      </Button>
      <div className="mt-6 max-w-md rounded-lg border border-white/10 bg-black/30 p-4 text-center text-xs leading-relaxed text-white/60">
        <p className="mb-2 font-semibold text-cyan-300/90">Mission</p>
        Throttle up with <span className="font-mono text-white/80">Shift</span>, hold brakes with{' '}
        <span className="font-mono text-white/80">Space</span> until engines spool. Release brakes,
        accelerate to ~250 km/h, then pull <span className="font-mono text-white/80">S</span> to rotate.
        Retract gear (<span className="font-mono text-white/80">G</span>), fly freely, then land back on
        the runway. Touch down gently — vertical speed above 5 m/s = crash.
      </div>
    </MenuShell>
  )
}

export function PauseMenu({
  onResume,
  onRestart,
  onQuit,
  muted,
  onToggleMute,
}: {
  onResume: () => void
  onRestart: () => void
  onQuit: () => void
  muted: boolean
  onToggleMute: () => void
}) {
  return (
    <MenuShell title="Paused" subtitle="Flight on hold">
      <Button onClick={onResume} className="w-64 bg-cyan-500 font-bold text-slate-950 hover:bg-cyan-400">
        Resume
      </Button>
      <Button
        variant="outline"
        onClick={onRestart}
        className="w-64 border-white/20 bg-white/5 text-white hover:bg-white/10"
      >
        Restart Flight
      </Button>
      <Button
        variant="outline"
        onClick={onToggleMute}
        className="w-64 border-white/20 bg-white/5 text-white hover:bg-white/10"
      >
        Sound: {muted ? 'Off' : 'On'}
      </Button>
      <Button variant="ghost" onClick={onQuit} className="w-64 text-white/60 hover:text-white">
        Quit to Menu
      </Button>
    </MenuShell>
  )
}

export function EndScreen({
  result,
  flightTime,
  maxAlt,
  onRestart,
  onQuit,
}: {
  result: FlightResult
  flightTime: number
  maxAlt: number
  onRestart: () => void
  onQuit: () => void
}) {
  const success = result === 'success'
  return (
    <MenuShell
      title={success ? 'Landed Safely' : 'Crashed'}
      subtitle={success ? 'Mission complete' : 'Better luck next time'}
    >
      <div className="mb-2 flex gap-6 font-mono text-sm text-white/80">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-white/40">Flight Time</div>
          <div className="text-lg">{Math.round(flightTime)}s</div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-white/40">Max Altitude</div>
          <div className="text-lg">{Math.round(maxAlt)} m</div>
        </div>
      </div>
      <Button
        onClick={onRestart}
        className={`w-64 font-bold text-slate-950 ${success ? 'bg-emerald-400 hover:bg-emerald-300' : 'bg-amber-400 hover:bg-amber-300'}`}
      >
        Fly Again
      </Button>
      <Button variant="ghost" onClick={onQuit} className="w-64 text-white/60 hover:text-white">
        Quit to Menu
      </Button>
    </MenuShell>
  )
}
