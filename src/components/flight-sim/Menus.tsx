'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import type { FlightResult } from '@/lib/flight-sim/engine/FlightEngine'
import type { Achievement } from '@/lib/flight-sim/achievements'

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
  compatMode: boolean
}

export function MainMenu({
  onStart,
  onAircraftSelect,
  onAchievements,
  muted,
  onToggleMute,
  compatMode,
  onToggleCompat,
}: {
  onStart: () => void
  onAircraftSelect: () => void
  onAchievements: () => void
  muted: boolean
  onToggleMute: () => void
  compatMode: boolean
  onToggleCompat: () => void
}) {
  return (
    <MenuShell title="Flight Simulator" subtitle="Pro · Multi-Aircraft Combat Edition">
      <Button
        size="lg"
        onClick={onStart}
        className="w-64 bg-cyan-500 text-lg font-bold text-slate-950 hover:bg-cyan-400"
      >
        Quick Flight (737)
      </Button>
      <Button
        variant="outline"
        onClick={onAircraftSelect}
        className="w-64 border-amber-400/40 bg-amber-950/20 text-amber-200 hover:bg-amber-900/30"
      >
        ✈ Select Aircraft & Mission
      </Button>
      <Button
        variant="outline"
        onClick={onAchievements}
        className="w-64 border-emerald-400/40 bg-emerald-950/20 text-emerald-200 hover:bg-emerald-900/30"
      >
        🏆 Achievements
      </Button>
      <Button
        variant="outline"
        onClick={onToggleMute}
        className="w-64 border-white/20 bg-white/5 text-white hover:bg-white/10"
      >
        Sound: {muted ? 'Off' : 'On'}
      </Button>
      <Button
        variant="outline"
        onClick={onToggleCompat}
        className={`w-64 ${compatMode ? 'border-amber-400/50 bg-amber-950/30 text-amber-200' : 'border-white/20 bg-white/5 text-white hover:bg-white/10'}`}
      >
        Compatibility Mode: {compatMode ? 'ON' : 'OFF'}
      </Button>
      <div className="mt-6 max-w-md rounded-lg border border-white/10 bg-black/30 p-4 text-center text-xs leading-relaxed text-white/60">
        <p className="mb-2 font-semibold text-cyan-300/90">4 Aircraft · 4 Mission Types · 10 Achievements</p>
        Fly the <span className="text-white/80">737 Airliner</span>, <span className="text-amber-300">F-16 Fighter</span> (with afterburner),
        <span className="text-red-300"> Extra 300 Stunt</span>, or <span className="text-green-300">C-130 Cargo</span>.
        Choose Free Flight, Canyon Sprint Race, Landing Challenge, or Target Practice.
        Now with dynamic weather (clear/cloudy/rain/storm) and autopilot.
      </div>
      <div className="mt-3 max-w-md rounded-lg border border-amber-400/20 bg-amber-950/20 p-3 text-center text-[10px] leading-relaxed text-amber-200/60">
        <span className="font-mono">W/S</span> pitch · <span className="font-mono">A/D</span> roll ·{' '}
        <span className="font-mono">Shift</span> throttle · <span className="font-mono">G</span> gear ·{' '}
        <span className="font-mono">F/V</span> flaps · <span className="font-mono">1-4</span> weather ·{' '}
        <span className="font-mono">P</span> autopilot · <span className="font-mono">C</span> camera
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
        {/* Compatibility Mode toggle — for Intel HD 6xx iGPU rendering bugs */}
        <div className="mt-3 flex items-center justify-between">
          <div>
            <div className="text-xs uppercase tracking-widest text-white/70">Compatibility Mode</div>
            <div className="text-[10px] text-white/40">Disables shadows, AA, rain, reduces terrain detail. For Intel HD 620/630 green-artifact issue.</div>
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={() => onSettingsChange({ ...settings, compatMode: !settings.compatMode })}
            className={`border-white/20 text-xs ${settings.compatMode ? 'bg-amber-500/30 border-amber-400/50 text-amber-200' : 'bg-white/5 text-white/60'}`}
          >
            {settings.compatMode ? 'ON' : 'OFF'}
          </Button>
        </div>
      </div>
      {settings.compatMode && (
        <div className="w-80 rounded-md border border-amber-400/30 bg-amber-950/20 p-2 text-center text-[10px] text-amber-200/70">
          ⚠ Compatibility Mode is ON — restart the flight for changes to take effect
        </div>
      )}
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
  score,
  newAchievements,
  onRestart,
  onQuit,
}: {
  result: FlightResult
  flightTime: number
  maxAlt: number
  landingVSpeed: number
  landingSpeed: number
  score: number
  newAchievements?: Achievement[]
  onRestart: () => void
  onQuit: () => void
}) {
  const success = result === 'success'
  const vsScore = success ? Math.max(0, 100 - Math.abs(landingVSpeed) * 30) : 0
  const spScore = success ? Math.max(0, 100 - Math.max(0, landingSpeed - 60) * 2) : 0
  const totalScore = Math.round((vsScore + spScore) / 2)
  const rating = totalScore >= 90 ? 'PERFECT' : totalScore >= 70 ? 'GOOD' : totalScore >= 50 ? 'OK' : 'ROUGH'

  return (
    <MenuShell
      title={success ? 'Mission Complete' : 'Mission Failed'}
      subtitle={success ? 'Well done, pilot' : 'Better luck next time'}
    >
      {/* Final score */}
      <div className="mb-3 flex flex-col items-center">
        <div className="text-[10px] uppercase tracking-widest text-white/40">Final Score</div>
        <div className={`text-5xl font-black ${success ? 'text-emerald-400' : 'text-red-400'}`}>
          {score.toLocaleString()}
        </div>
      </div>
      {/* New achievements unlocked */}
      {newAchievements && newAchievements.length > 0 && (
        <div className="mb-3 rounded-lg border border-emerald-400/40 bg-emerald-950/30 p-3">
          <div className="mb-2 text-center text-[10px] uppercase tracking-widest text-emerald-300">
            🏆 Achievement Unlocked!
          </div>
          {newAchievements.map((a) => (
            <div key={a.id} className="flex items-center gap-2">
              <span className="text-2xl">{a.icon}</span>
              <div>
                <div className="font-bold text-emerald-200">{a.name}</div>
                <div className="text-[10px] text-white/50">{a.description}</div>
              </div>
            </div>
          ))}
        </div>
      )}
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
          <div className="text-[10px] uppercase tracking-widest text-white/40">Landing Rating</div>
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
