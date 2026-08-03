'use client'
import { useEffect, useRef, useState } from 'react'
import { FlightEngine, type HudSnapshot, type FlightResult } from '@/lib/flight-sim/engine/FlightEngine'
import type { CameraMode, GamePhase } from '@/lib/flight-sim/types'
import { Hud } from './Hud'
import { MainMenu, PauseMenu, EndScreen } from './Menus'

export function FlightSimulator() {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<FlightEngine | null>(null)
  const maxAltRef = useRef(0)
  const lastHudUpdate = useRef(0)

  const [phase, setPhase] = useState<GamePhase>('menu')
  const [result, setResult] = useState<FlightResult>('none')
  const [snap, setSnap] = useState<HudSnapshot | null>(null)
  const [cameraMode, setCameraMode] = useState<CameraMode>('chase')
  const [muted, setMuted] = useState(false)
  const [flightTime, setFlightTime] = useState(0)
  const [maxAlt, setMaxAlt] = useState(0)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const engine = new FlightEngine(container)
    engineRef.current = engine

    engine.onState = (s) => {
      // track max altitude while flying
      if (engine.phase === 'flying') {
        maxAltRef.current = Math.max(maxAltRef.current, s.state.altitude)
      }
      // throttle React HUD updates to ~30fps for smoothness without overhead
      const now = performance.now()
      if (now - lastHudUpdate.current > 33) {
        lastHudUpdate.current = now
        setSnap(s)
      }
    }
    engine.onPhaseChange = (p, r) => {
      setPhase(p)
      setResult(r)
      if (p === 'ended') {
        setFlightTime(engine.state.flightTime)
        setMaxAlt(maxAltRef.current)
      }
      if (p === 'flying' && r === 'flying') {
        maxAltRef.current = engine.state.altitude
      }
    }
    engine.onCameraModeChange = (m) => setCameraMode(m)

    engine.boot()

    const onResize = () => engine.resize()
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      engine.dispose()
      engineRef.current = null
    }
  }, [])

  const handleStart = () => {
    maxAltRef.current = engineRef.current?.state.altitude ?? 0
    engineRef.current?.startFlight()
  }
  const handleResume = () => engineRef.current?.resume()
  const handleRestart = () => {
    maxAltRef.current = 0
    engineRef.current?.reset()
  }
  const handleQuit = () => engineRef.current?.quitToMenu()
  const handleToggleMute = () => {
    setMuted((m) => {
      const nm = !m
      engineRef.current?.setMuted(nm)
      return nm
    })
  }

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-sky-300">
      <div ref={containerRef} className="absolute inset-0" />

      {/* HUD only while flying or paused */}
      {(phase === 'flying' || phase === 'paused') && snap && (
        <Hud snap={snap} cameraMode={cameraMode} />
      )}

      {phase === 'menu' && (
        <MainMenu onStart={handleStart} muted={muted} onToggleMute={handleToggleMute} />
      )}
      {phase === 'paused' && (
        <PauseMenu
          onResume={handleResume}
          onRestart={handleRestart}
          onQuit={handleQuit}
          muted={muted}
          onToggleMute={handleToggleMute}
        />
      )}
      {phase === 'ended' && (
        <EndScreen
          result={result}
          flightTime={flightTime}
          maxAlt={maxAlt}
          onRestart={handleRestart}
          onQuit={handleQuit}
        />
      )}
    </div>
  )
}
