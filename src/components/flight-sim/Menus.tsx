'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
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

interface Settings {
  sensitivity: number
  volume: number
  muted: boolean
}

export function MainMenu({
  onStart,
  settings,
  onSettingsChange,
}: {
  onStart: () => void
  settings: Settings
  onSettingsChange: (s: Settings) => void
}) {
  const [showSettings, setShowSettings] = useState(false)

  if (showSettings) {
    return (
      <MenuShell title="Settings" subtitle="Configure your flight">
        <div className="w-80 rounded-lg border border-white/10 bg-black/30 p-5">
          <div className="mb-4">
            <div className="mb-1 flex justify-between text-xs text-white/70">
              <span className="uppercase tracking-widest">Control Sensitivity</span>
              <span className="font-mono text-cyan-300">{settings.sensitivity.toFixed(2)}x</span>
            </div>
            <Slider
              value={[settings.sensitivity]}
              min={0.3}
              max={2.0}
              step={0.1}
              onValueChange={(v) => onSettingsChange({ ...settings, sensitivity: v[0] })}
            />
          </div>
          <div className="mb-4">
            <div className="mb-1 flex justify-between text-xs text-white/70">
              <span className="uppercase tracking-widest">Volume</span>
              <span className="font-mono text-cyan-300">{Math.round(settings.volume * 100)}%</span>
            </div>
            <Slider
              value={[settings.volume]}
              min={0}
              max={1}
              step={0.05}
              onValueChange={(v) => onSettingsChange({ ...settings, volume: v[0] })}
            />
          </div>
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs uppercase tracking-widest text-white/70">Sound</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => onSettingsChange({ ...settings, muted: !settings.muted })}
              className="border-white/20 bg-white/5 text-white hover:bg-white/10"
            >
              {settings.muted ? 'Off' : 'On'}
            </Button>
          </div>
        </div>
        <Button
          onClick={() => setShowSettings(false)}
          className="w-64 bg-cyan-500 font-bold text-slate-950 hover:bg-cyan-400"
        >
          Back
        </Button>
      </MenuShell>
    )
  }

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
        onClick={() => setShowSettings(true)}
        className="w-64 border-white/20 bg-white/5 text-white hover:bg-white/10"
      >
        Settings
      </Button>
      <div className="mt-6 max-w-md rounded-lg border border-white/10 bg-black/30 p-4 text-center text-xs leading-relaxed text-white/60">
        <p className="mb-2 font-semibold text-cyan-300/90">Mission</p>
        Throttle up with <span className="font-mono text-white/80">Shift</span>. Release brakes, accelerate to ~260 km/h, then
        tap <span className="font-mono text-white/80">S</span> gently to rotate. Use{' '}
        <span className="font-mono text-white/80">F</span> for flaps on takeoff/landing. Retract gear with{' '}
        <span className="font-mono text-white/80">G</span>. Land gently — vertical speed above 5 m/s = crash.
      </div>
      <div className="mt-3 max-w-md rounded-lg border border-amber-400/20 bg-amber-950/20 p-3 text-center text-[10px] leading-relaxed text-amber-200/60">
        <span className="font-mono">W/S</span> pitch · <span className="font-mono">A/D</span> roll ·{' '}
        <span className="font-mono">Q/E</span> rudder · <span className="font-mono">F/V</span> flaps ·{' '}
        <span className="font-mono">B</span> spoilers · <span className="font-mono">X</span> reverse ·{' '}
        <span className="font-mono">C</span> camera
      </div>
    </MenuShell>
  )
}

export function PauseMenu({
  onResume,
  onRestart,
  onQuit,
  settings,
  onSettingsChange,
}: {
  onResume: () => void
  onRestart: () => void
  onQuit: () => void
  settings: Settings
  onSettingsChange: (s: Settings) => void
}) {
  return (
    <MenuShell title="Paused" subtitle="Flight on hold">
      <Button onClick={onResume} className="w-64 bg-cyan-500 font-bold text-slate-950 hover:bg-cyan-400">
        Resume
      </Button>
      <div className="w-80 rounded-lg border border-white/10 bg-black/30 p-4">
        <div className="mb-3">
          <div className="mb-1 flex justify-between text-xs text-white/70">
            <span className="uppercase tracking-widest">Sensitivity</span>
            <span className="font-mono text-cyan-300">{settings.sensitivity.toFixed(2)}x</span>
          </div>
          <Slider
            value={[settings.sensitivity]}
            min={0.3}
            max={2.0}
            step={0.1}
            onValueChange={(v) => onSettingsChange({ ...settings, sensitivity: v[0] })}
          />
        </div>
        <div>
          <div className="mb-1 flex justify-between text-xs text-white/70">
            <span className="uppercase tracking-widest">Volume</span>
            <span className="font-mono text-cyan-300">{Math.round(settings.volume * 100)}%</span>
          </div>
          <Slider
            value={[settings.volume]}
            min={0}
            max={1}
            step={0.05}
            onValueChange={(v) => onSettingsChange({ ...settings, volume: v[0] })}
          />
        </div>
      </div>
      <Button
        variant="outline"
        onClick={onRestart}
        className="w-64 border-white/20 bg-white/5 text-white hover:bg-white/10"
      >
        Restart Flight
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
  landingVSpeed,
  landingSpeed,
  onRestart,
  onQuit,
}: {
  result: FlightResult
  flightTime: number
  maxAlt: number
  landingVSpeed: number
  landingSpeed: number
  onRestart: () => void
  onQuit: () => void
}) {
  const success = result === 'success'
  // landing score: based on vertical speed and landing speed
  const vsScore = success ? Math.max(0, 100 - Math.abs(landingVSpeed) * 30) : 0
  const spScore = success ? Math.max(0, 100 - Math.max(0, landingSpeed - 60) * 2) : 0
  const totalScore = Math.round((vsScore + spScore) / 2)
  const rating = totalScore >= 90 ? 'PERFECT' : totalScore >= 70 ? 'GOOD' : totalScore >= 50 ? 'OK' : 'ROUGH'

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
        {success && (
          <>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-white/40">Touchdown VS</div>
              <div className="text-lg">{Math.round(landingVSpeed * 196.85)} fpm</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-widest text-white/40">Touchdown Spd</div>
              <div className="text-lg">{Math.round(landingSpeed * 3.6)} km/h</div>
            </div>
          </>
        )}
      </div>
      {success && (
        <div className="mb-2 flex flex-col items-center">
          <div className="text-[10px] uppercase tracking-widest text-white/40">Landing Score</div>
          <div className={`text-4xl font-black ${totalScore >= 70 ? 'text-emerald-400' : totalScore >= 50 ? 'text-amber-400' : 'text-orange-400'}`}>
            {totalScore}
          </div>
          <div className={`text-sm font-bold ${totalScore >= 70 ? 'text-emerald-300' : totalScore >= 50 ? 'text-amber-300' : 'text-orange-300'}`}>
            {rating}
          </div>
        </div>
      )}
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
