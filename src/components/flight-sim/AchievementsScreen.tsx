'use client'
import { Button } from '@/components/ui/button'
import type { PlayerProgress } from '@/lib/flight-sim/achievements'

interface Props {
  progress: PlayerProgress
  onBack: () => void
}

export function AchievementsScreen({ progress, onBack }: Props) {
  const unlockedCount = progress.achievements.filter((a) => a.unlocked).length
  const totalCount = progress.achievements.length

  return (
    <div className="absolute inset-0 z-20 flex flex-col overflow-y-auto bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-white">Achievements</h1>
          <p className="text-xs uppercase tracking-widest text-cyan-300/70">
            {unlockedCount} / {totalCount} unlocked
          </p>
        </div>
        <Button variant="ghost" onClick={onBack} className="text-white/60 hover:text-white">
          ← Back
        </Button>
      </div>

      {/* Player stats */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded-lg border border-white/10 bg-black/30 p-4">
          <div className="text-[10px] uppercase tracking-widest text-white/40">Total Score</div>
          <div className="text-2xl font-bold text-emerald-400">{progress.totalScore.toLocaleString()}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/30 p-4">
          <div className="text-[10px] uppercase tracking-widest text-white/40">Missions Done</div>
          <div className="text-2xl font-bold text-cyan-400">{progress.missionsCompleted}</div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/30 p-4">
          <div className="text-[10px] uppercase tracking-widest text-white/40">Flight Time</div>
          <div className="text-2xl font-bold text-amber-400">
            {Math.floor(progress.totalFlightTime / 60)}m
          </div>
        </div>
        <div className="rounded-lg border border-white/10 bg-black/30 p-4">
          <div className="text-[10px] uppercase tracking-widest text-white/40">Best Landing</div>
          <div className="text-2xl font-bold text-purple-400">
            {progress.bestLandingVS < 0
              ? `${Math.round(progress.bestLandingVS * 196.85)}fpm`
              : '—'}
          </div>
        </div>
      </div>

      {/* Achievements grid */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {progress.achievements.map((a) => (
          <div
            key={a.id}
            className={`flex items-center gap-4 rounded-lg border-2 p-4 transition-all ${
              a.unlocked
                ? 'border-emerald-400/40 bg-emerald-950/20'
                : 'border-white/5 bg-black/20 opacity-50'
            }`}
          >
            <div className={`text-4xl ${a.unlocked ? '' : 'grayscale'}`}>{a.icon}</div>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <span className="font-bold text-white">{a.name}</span>
                {a.unlocked && <span className="text-emerald-400">✓</span>}
              </div>
              <div className="text-xs text-white/50">{a.description}</div>
              {a.unlocked && a.unlockedAt && (
                <div className="mt-1 text-[10px] text-emerald-300/60">
                  Unlocked {new Date(a.unlockedAt).toLocaleDateString()}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
