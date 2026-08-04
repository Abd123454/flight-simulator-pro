'use client'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { STEM_LESSONS, type StemLesson } from '@/lib/flight-sim/stem-lessons'
import type { AircraftType } from '@/lib/flight-sim/aircraft-config'

interface Props {
  onFly: (lesson: StemLesson) => void
  onBack: () => void
}

export function StemScreen({ onFly, onBack }: Props) {
  const [selected, setSelected] = useState<StemLesson | null>(null)

  if (selected) {
    return (
      <div className="absolute inset-0 z-20 flex flex-col overflow-y-auto bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6">
        <div className="mx-auto w-full max-w-2xl">
          <Button variant="ghost" onClick={() => setSelected(null)} className="mb-4 text-white/60 hover:text-white">
            ← Back to lessons
          </Button>
          <div className="mb-4 rounded-lg border-2 border-cyan-400/30 bg-cyan-950/20 p-6">
            <div className="mb-2 text-[10px] uppercase tracking-widest text-cyan-300/70">
              {selected.subject} · NGSS {selected.ngssStandard}
            </div>
            <h2 className="mb-4 text-2xl font-bold text-white">{selected.title}</h2>
            <div className="mb-4 rounded-md border border-white/10 bg-black/40 p-4">
              <div className="mb-2 text-[10px] uppercase tracking-widest text-amber-300/70">Theory ({Math.round(selected.duration * 0.3)} min)</div>
              <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-white/80">{selected.theoryText}</pre>
            </div>
            <div className="rounded-md border border-emerald-400/20 bg-emerald-950/10 p-4">
              <div className="mb-2 text-[10px] uppercase tracking-widest text-emerald-300/70">Practical Flight ({Math.round(selected.duration * 0.7)} min)</div>
              <p className="text-sm leading-relaxed text-white/80">{selected.flightInstructions}</p>
            </div>
            <Button
              size="lg"
              onClick={() => onFly(selected)}
              className="mt-4 w-full bg-cyan-500 text-lg font-bold text-slate-950 hover:bg-cyan-400"
            >
              ✈ Start Flight Lesson
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="absolute inset-0 z-20 flex flex-col overflow-y-auto bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 p-6">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black text-white">STEM Aviation</h1>
            <p className="text-xs uppercase tracking-widest text-cyan-300/70">6 lessons · NGSS-aligned · For classrooms</p>
          </div>
          <Button variant="ghost" onClick={onBack} className="text-white/60 hover:text-white">
            ← Back
          </Button>
        </div>

        <div className="mb-4 rounded-lg border border-amber-400/20 bg-amber-950/10 p-3 text-center text-xs text-amber-200/60">
          Teachers: students don&apos;t need accounts. Just share the link and pick a lesson.
          Each lesson = 2 min theory + 5 min flight.
        </div>

        <div className="space-y-3">
          {STEM_LESSONS.map((lesson) => (
            <button
              key={lesson.id}
              onClick={() => setSelected(lesson)}
              className="w-full rounded-lg border-2 border-white/10 bg-black/30 p-4 text-left transition-all hover:border-cyan-400/30 hover:bg-cyan-950/10"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="text-[10px] uppercase tracking-widest text-cyan-300/60">{lesson.subject}</div>
                  <h3 className="text-lg font-bold text-white">{lesson.title}</h3>
                  <p className="mt-1 text-xs text-white/50">{lesson.ngssStandard} · {lesson.duration} min</p>
                </div>
                <div className="rounded-full border border-cyan-400/20 px-3 py-1 font-mono text-xs text-cyan-300">
                  Lesson {lesson.id}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
