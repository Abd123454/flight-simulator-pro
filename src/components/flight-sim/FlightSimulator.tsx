'use client'
import { useEffect, useRef, useState } from 'react'
import { FlightEngine, type HudSnapshot, type FlightResult } from '@/lib/flight-sim/engine/FlightEngine'
import type { CameraMode, GamePhase } from '@/lib/flight-sim/types'
import { Hud } from './Hud'
import { MainMenu, PauseMenu, EndScreen } from './Menus'

interface Settings {
  sensitivity: number
  volume: number
  muted: boolean
}

export function FlightSimulator() {
  const containerRef = useRef<HTMLDivElement>(null)
  const engineRef = useRef<FlightEngine | null>(null)
  const maxAltRef = useRef(0)
  const lastHudUpdate = useRef(0)

  const [phase, setPhase] = useState<GamePhase>('menu')
  const [result, setResult] = useState<FlightResult>('none')
  const [snap, setSnap] = useState<HudSnapshot | null>(null)
  const [cameraMode, setCameraMode] = useState<CameraMode>('chase')
  const [flightTime, setFlightTime] = useState(0)
  const [maxAlt, setMaxAlt] = useState(0)
  const [landingVSpeed, setLandingVSpeed] = useState(0)
  const [landingSpeed, setLandingSpeed] = useState(0)

  const [settings, setSettings] = useState<Settings>({
    sensitivity: 1.0,
    volume: 0.9,
    muted: false,
  })

  // apply settings to engine whenever they change
  useEffect(() => {
    const e = engineRef.current
    if (!e) return
    e.setSensitivity(settings.sensitivity)
    e.setVolume(settings.muted ? 0 : settings.volume)
    e.setMuted(settings.muted)
  }, [settings])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return
    const engine = new FlightEngine(container)
    engineRef.current = engine

    // apply initial settings
    engine.setSensitivity(settings.sensitivity)
    engine.setVolume(settings.muted ? 0 : settings.volume)
    engine.setMuted(settings.muted)

    engine.onState = (s) => {
      if (engine.phase === 'flying') {
        maxAltRef.current = Math.max(maxAltRef.current, s.state.altitude)
      }
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
        setLandingVSpeed(engine.state.landingVerticalSpeed)
        setLandingSpeed(engine.state.landingSpeed)
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

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-sky-300">
      <div ref={containerRef} className="absolute inset-0" />

      {(phase === 'flying' || phase === 'paused') && snap && (
        <Hud snap={snap} cameraMode={cameraMode} />
      )}

      {phase === 'menu' && (
        <MainMenu
          onStart={handleStart}
          settings={settings}
          onSettingsChange={setSettings}
        />
      )}
      {phase === 'paused' && (
        <PauseMenu
          onResume={handleResume}
          onRestart={handleRestart}
          onQuit={handleQuit}
          settings={settings}
          onSettingsChange={setSettings}
        />
      )}
      {phase === 'ended' && (
        <EndScreen
          result={result}
          flightTime={flightTime}
          maxAlt={maxAlt}
          landingVSpeed={landingVSpeed}
          landingSpeed={landingSpeed}
          onRestart={handleRestart}
          onQuit={handleQuit}
        />
      )}
    </div>
  )
}
