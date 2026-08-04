'use client'
import { useState, useMemo } from 'react'
import { Button } from '@/components/ui/button'
import { getDailyFlight, hasCompletedToday, getTodayResult, getStreak, generateShareText, type DailyFlightConfig } from '@/lib/flight-sim/daily-flight'

interface Props {
  onPlay: (config: DailyFlightConfig) => void
  onBack: () => void
}

export function DailyFlightScreen({ onPlay, onBack }: Props) {
  const config = useMemo(() => getDailyFlight(), [])
  const completed = useMemo(() => hasCompletedToday(), [])
  const streak = useMemo(() => getStreak(), [])
  const result = useMemo(() => {
    const r = getTodayResult()
    return r ? { score: r.score, flightTime: r.flightTime, maxAltitude: r.maxAltitude } : null
  }, [])

  const handleShare = () => {
    if (!config || !result) return
    const text = generateShareText(
      { date: config.date, score: result.score, flightTime: result.flightTime, maxAltitude: result.maxAltitude, landingVS: 0, completed, playerHash: '' },
      config
    )
    if (navigator.share) {
      navigator.share({ text })
    } else {
      navigator.clipboard.writeText(text)
      alert('Copied to clipboard!')
    }
  }

  if (!config) return null

  const aircraftName = config.aircraftType === 'airliner' ? 'Skyliner 737'
    : config.aircraftType === 'fighter' ? 'Falcon F-16'
    : config.aircraftType === 'stunt' ? 'Acro Extra 300'
    : 'Heavy C-130'

  const missionName = config.missionType === 'freeflight' ? 'Free Flight'
    : config.missionType === 'landing' ? 'Landing Challenge'
    : config.missionType === 'race' ? 'Canyon Sprint'
    : config.missionType === 'crosscountry' ? 'Cross Country'
    : config.missionType === 'combat' ? 'Target Practice'
    : 'Storm Runner'

  return (
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="mb-4 flex items-center justify-between w-full max-w-md">
        <h1 className="text-3xl font-black text-white">Daily Flight</h1>
        <Button variant="ghost" onClick={onBack} className="text-white/60 hover:text-white">
          ← Back
        </Button>
      </div>

      {/* Date + Streak */}
      <div className="mb-6 flex gap-4 text-center">
        <div className="rounded-lg border border-cyan-400/30 bg-black/30 px-4 py-2">
          <div className="text-[10px] uppercase tracking-widest text-white/40">Date</div>
          <div className="font-mono text-lg text-cyan-300">{config.date}</div>
        </div>
        <div className="rounded-lg border border-amber-400/30 bg-black/30 px-4 py-2">
          <div className="text-[10px] uppercase tracking-widest text-white/40">Streak</div>
          <div className="font-mono text-lg text-amber-300">{streak} 🔥</div>
        </div>
      </div>

      {/* Today's flight card */}
      <div className="w-full max-w-md rounded-xl border-2 border-cyan-400/30 bg-cyan-950/20 p-6">
        <div className="mb-4 text-center">
          <div className="text-[10px] uppercase tracking-widest text-white/40">Today's Flight</div>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between rounded-md border border-white/10 bg-black/30 px-4 py-2">
            <span className="text-xs uppercase tracking-widest text-white/50">Airport</span>
            <span className="font-mono text-lg text-cyan-300">{config.airportIcao}</span>
          </div>
          <div className="flex items-center justify-between rounded-md border border-white/10 bg-black/30 px-4 py-2">
            <span className="text-xs uppercase tracking-widest text-white/50">Aircraft</span>
            <span className="font-mono text-sm text-amber-300">{aircraftName}</span>
          </div>
          <div className="flex items-center justify-between rounded-md border border-white/10 bg-black/30 px-4 py-2">
            <span className="text-xs uppercase tracking-widest text-white/50">Mission</span>
            <span className="font-mono text-sm text-emerald-300">{missionName}</span>
          </div>
          <div className="flex items-center justify-between rounded-md border border-white/10 bg-black/30 px-4 py-2">
            <span className="text-xs uppercase tracking-widest text-white/50">Weather</span>
            <span className="font-mono text-sm text-blue-300">Live (real-time)</span>
          </div>
        </div>

        {/* Result (if completed) */}
        {completed && result && (
          <div className="mt-4 rounded-md border border-emerald-400/30 bg-emerald-950/20 p-3">
            <div className="mb-2 text-center text-[10px] uppercase tracking-widest text-emerald-300">Your Best Result</div>
            <div className="flex justify-around text-center">
              <div>
                <div className="text-[10px] text-white/40">Score</div>
                <div className="font-mono text-lg text-emerald-300">{result.score}</div>
              </div>
              <div>
                <div className="text-[10px] text-white/40">Time</div>
                <div className="font-mono text-lg text-white">{Math.round(result.flightTime)}s</div>
              </div>
              <div>
                <div className="text-[10px] text-white/40">Max Alt</div>
                <div className="font-mono text-lg text-white">{Math.round(result.maxAltitude)}m</div>
              </div>
            </div>
            <Button
              onClick={handleShare}
              className="mt-3 w-full bg-cyan-500 font-bold text-slate-950 hover:bg-cyan-400"
            >
              📤 Share Result
            </Button>
          </div>
        )}
      </div>

      {/* Play button */}
      {!completed && (
        <Button
          size="lg"
          onClick={() => onPlay(config)}
          className="mt-6 w-64 bg-cyan-500 text-lg font-bold text-slate-950 hover:bg-cyan-400"
        >
          ✈ Play Today's Flight
        </Button>
      )}
      {completed && (
        <div className="mt-4 text-center text-xs text-white/50">
          ✅ Completed! Come back tomorrow for a new flight.
        </div>
      )}

      <div className="mt-6 max-w-md text-center text-[10px] text-white/40">
        Same flight for everyone worldwide. Real weather from Open-Meteo.
        Share your result like Wordle — one click to Twitter/Discord.
      </div>
    </div>
  )
}
