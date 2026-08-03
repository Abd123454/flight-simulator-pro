'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { AIRCRAFT_LIST, type AircraftType } from '@/lib/flight-sim/aircraft-config'
import { MISSIONS, CAMPAIGN, type MissionConfig } from '@/lib/flight-sim/missions'

interface Props {
  onSelect: (aircraft: AircraftType, missionKey: string) => void
  onBack: () => void
  completedMissions: string[]
}

function StatBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-24 text-[10px] uppercase tracking-wider text-white/50">{label}</span>
      <div className="flex gap-0.5">
        {Array.from({ length: 10 }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 w-3 rounded-sm ${i < value ? color : 'bg-white/10'}`}
          />
        ))}
      </div>
    </div>
  )
}

const AIRCRAFT_COLORS: Record<AircraftType, string> = {
  airliner: 'bg-cyan-400',
  fighter: 'bg-amber-400',
  stunt: 'bg-red-400',
  cargo: 'bg-green-400',
}

const MISSION_ICONS: Record<string, string> = {
  freeflight: '✈',
  race: '🏁',
  landing: '🛬',
  combat: '🎯',
  crosscountry: '🧭',
  storm: '⛈',
}

export function AircraftSelect({ onSelect, onBack, completedMissions }: Props) {
  const [selectedAircraft, setSelectedAircraft] = useState<AircraftType>('airliner')
  const [selectedMissionKey, setSelectedMissionKey] = useState<string>('freeflight')

  const aircraft = AIRCRAFT_LIST.find((a) => a.type === selectedAircraft)!
  const mission = MISSIONS[selectedMissionKey]
  const completedSet = new Set(completedMissions)

  return (
    <div className="absolute inset-0 z-20 flex flex-col overflow-y-auto bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Mission Setup</h1>
          <p className="text-xs uppercase tracking-widest text-cyan-300/70">Select aircraft & mission</p>
        </div>
        <Button variant="ghost" onClick={onBack} className="text-white/60 hover:text-white">
          ← Back
        </Button>
      </div>

      {/* Aircraft selection */}
      <div className="mb-6">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-white/70">Aircraft</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {AIRCRAFT_LIST.map((ac) => (
            <button
              key={ac.type}
              onClick={() => setSelectedAircraft(ac.type)}
              className={`rounded-lg border-2 p-3 text-left transition-all ${
                selectedAircraft === ac.type
                  ? 'border-cyan-400 bg-cyan-950/40 shadow-[0_0_12px_rgba(34,211,238,0.3)]'
                  : 'border-white/10 bg-black/30 hover:border-white/30'
              }`}
            >
              <div className="mb-1 flex items-center justify-between">
                <span className="text-sm font-bold text-white">{ac.name}</span>
                {ac.hasAfterburner && <span className="text-[9px] text-amber-400">AB</span>}
              </div>
              <div className="mb-2 text-[10px] uppercase tracking-wider text-cyan-300/60">{ac.role}</div>
              <div className="space-y-1">
                <StatBar label="Speed" value={ac.stats.speed} color={AIRCRAFT_COLORS[ac.type]} />
                <StatBar label="Agility" value={ac.stats.maneuverability} color={AIRCRAFT_COLORS[ac.type]} />
                <StatBar label="Stability" value={ac.stats.stability} color={AIRCRAFT_COLORS[ac.type]} />
                <StatBar label="Armor" value={ac.stats.durability} color={AIRCRAFT_COLORS[ac.type]} />
              </div>
            </button>
          ))}
        </div>
        <div className="mt-2 rounded-md border border-white/10 bg-black/40 p-3 text-xs text-white/60">
          <span className="font-semibold text-cyan-300">{aircraft.name}:</span> {aircraft.description}
        </div>
      </div>

      {/* Mission selection — campaign with unlocks */}
      <div className="mb-6">
        <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-white/70">
          Campaign Missions
        </h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
          {CAMPAIGN.map((node) => {
            const m = MISSIONS[node.missionKey]
            if (!m) return null
            const unlocked = node.requires.every((req) => completedSet.has(req))
            const completed = completedSet.has(node.missionKey)
            const isSelected = selectedMissionKey === node.missionKey
            return (
              <button
                key={node.missionKey}
                disabled={!unlocked}
                onClick={() => unlocked && setSelectedMissionKey(node.missionKey)}
                className={`relative rounded-lg border-2 p-3 text-left transition-all ${
                  !unlocked
                    ? 'cursor-not-allowed border-white/5 bg-black/40 opacity-40'
                    : isSelected
                      ? 'border-amber-400 bg-amber-950/30 shadow-[0_0_12px_rgba(251,191,36,0.3)]'
                      : 'border-white/10 bg-black/30 hover:border-white/30'
                }`}
              >
                {/* difficulty stars */}
                <div className="absolute right-2 top-2 text-[9px] text-amber-400">
                  {'★'.repeat(node.stars)}
                </div>
                {/* completion check */}
                {completed && (
                  <div className="absolute left-2 top-2 text-[10px] text-emerald-400">✓</div>
                )}
                {/* lock icon */}
                {!unlocked && (
                  <div className="absolute right-2 bottom-2 text-lg opacity-60">🔒</div>
                )}
                <div className="mb-1 flex items-center gap-2">
                  <span className="text-lg">{MISSION_ICONS[m.type] || '✈'}</span>
                  <span className="text-sm font-bold text-white">{m.name}</span>
                </div>
                <div className="text-[10px] text-white/50">{m.description}</div>
                {m.parTime && (
                  <div className="mt-1 text-[10px] text-amber-300/70">Par: {m.parTime}s</div>
                )}
                {m.timeLimit && (
                  <div className="mt-1 text-[10px] text-red-300/70">Limit: {m.timeLimit}s</div>
                )}
              </button>
            )
          })}
        </div>
        <div className="mt-2 rounded-md border border-white/10 bg-black/40 p-3 text-xs text-white/60">
          <span className="font-semibold text-amber-300">{mission.name}:</span> {mission.brief}
        </div>
      </div>

      {/* Launch */}
      <div className="flex justify-center">
        <Button
          size="lg"
          onClick={() => onSelect(selectedAircraft, selectedMissionKey)}
          className="w-64 bg-cyan-500 text-lg font-bold text-slate-950 hover:bg-cyan-400"
        >
          Launch Mission →
        </Button>
      </div>
    </div>
  )
}
