'use client'
import { useEffect, useRef, useState } from 'react'
import { FlightEngine, type HudSnapshot, type FlightResult } from '@/lib/flight-sim/engine/FlightEngine'
import type { CameraMode, GamePhase } from '@/lib/flight-sim/types'
import { AIRCRAFT, type AircraftType } from '@/lib/flight-sim/aircraft-config'
import { MISSIONS, createMissionState } from '@/lib/flight-sim/missions'
import { loadProgress, recordMissionResult, type PlayerProgress, type Achievement } from '@/lib/flight-sim/achievements'
import type { LiveWeatherData } from '@/lib/flight-sim/live-weather'
import { Hud } from './Hud'
import { MainMenu, PauseMenu, EndScreen } from './Menus'
import { AircraftSelect } from './AircraftSelect'
import { AchievementsScreen } from './AchievementsScreen'

type Screen = 'menu' | 'select' | 'game' | 'achievements'

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
  const lastWeatherRef = useRef('clear')
  const liveWeatherRef = useRef<LiveWeatherData | null | undefined>(null)

  const [screen, setScreen] = useState<Screen>('menu')
  const [phase, setPhase] = useState<GamePhase>('menu')
  const [result, setResult] = useState<FlightResult>('none')
  const [snap, setSnap] = useState<HudSnapshot | null>(null)
  const [cameraMode, setCameraMode] = useState<CameraMode>('chase')
  const [flightTime, setFlightTime] = useState(0)
  const [maxAlt, setMaxAlt] = useState(0)
  const [landingVSpeed, setLandingVSpeed] = useState(0)
  const [landingSpeed, setLandingSpeed] = useState(0)
  const [finalScore, setFinalScore] = useState(0)
  const [muted, setMuted] = useState(false)
  const [newAchievements, setNewAchievements] = useState<Achievement[]>([])
  const [progress, setProgress] = useState<PlayerProgress>(() => loadProgress())

  // selected aircraft + mission
  const [selectedAircraft, setSelectedAircraft] = useState<AircraftType>('airliner')
  const [selectedMissionKey, setSelectedMissionKey] = useState<string>('freeflight')

  // apply settings to engine whenever they change
  const [settings, setSettings] = useState<Settings>({ sensitivity: 1.0, volume: 0.9, muted: false })

  useEffect(() => {
    const e = engineRef.current
    if (!e) return
    e.setSensitivity(settings.sensitivity)
    e.setVolume(settings.muted ? 0 : settings.volume)
    e.setMuted(settings.muted)
  }, [settings, screen])

  // create engine when entering game screen
  useEffect(() => {
    if (screen !== 'game') return
    const container = containerRef.current
    if (!container) return

    const acConfig = AIRCRAFT[selectedAircraft]
    const missionConfig = createMissionState(MISSIONS[selectedMissionKey] || MISSIONS.freeflight)

    const engine = new FlightEngine(container, acConfig, missionConfig)
    engineRef.current = engine

    engine.setSensitivity(settings.sensitivity)
    engine.setVolume(settings.muted ? 0 : settings.volume)
    engine.setMuted(settings.muted)

    engine.onState = (s) => {
      if (engine.phase === 'flying') {
        maxAltRef.current = Math.max(maxAltRef.current, s.state.altitude)
        lastWeatherRef.current = s.weatherCondition
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
        setFinalScore(engine.score)
        // record to achievements
        const currentProgress = loadProgress()
        const newly = recordMissionResult(currentProgress, {
          success: r === 'success',
          score: engine.score,
          flightTime: engine.state.flightTime,
          maxAltitude: maxAltRef.current,
          landingVS: engine.state.landingVerticalSpeed,
          missionType: engine.mission.type,
          missionKey: selectedMissionKey,
          weatherCondition: lastWeatherRef.current,
        })
        setProgress(currentProgress)
        setNewAchievements(newly)
      }
      if (p === 'flying' && r === 'flying') {
        maxAltRef.current = engine.state.altitude
      }
    }
    engine.onCameraModeChange = (m) => setCameraMode(m)

    engine.boot()
    engine.startFlight()
    // apply live weather if the player fetched real conditions
    if (liveWeatherRef.current) {
      engine.applyLiveWeather(
        liveWeatherRef.current.windSpeed,
        liveWeatherRef.current.windDirection,
        liveWeatherRef.current.visibility
      )
    }

    const onResize = () => engine.resize()
    window.addEventListener('resize', onResize)

    return () => {
      window.removeEventListener('resize', onResize)
      engine.dispose()
      engineRef.current = null
    }
  }, [screen, selectedAircraft, selectedMissionKey])

  const handleStart = () => {
    setSelectedAircraft('airliner')
    setSelectedMissionKey('freeflight')
    setScreen('game')
  }
  const handleAircraftSelect = (ac: AircraftType, missionKey: string, liveWeather?: LiveWeatherData) => {
    setSelectedAircraft(ac)
    setSelectedMissionKey(missionKey)
    liveWeatherRef.current = liveWeather
    setScreen('game')
  }
  const handleResume = () => engineRef.current?.resume()
  const handleRestart = () => {
    maxAltRef.current = 0
    engineRef.current?.reset()
  }
  const handleQuit = () => {
    engineRef.current?.quitToMenu()
    setScreen('menu')
  }
  const handleToggleMute = () => {
    setSettings((s) => ({ ...s, muted: !s.muted }))
    setMuted((m) => !m)
  }

  if (screen === 'menu') {
    return (
      <MainMenu
        onStart={handleStart}
        onAircraftSelect={() => setScreen('select')}
        onAchievements={() => setScreen('achievements')}
        muted={muted}
        onToggleMute={handleToggleMute}
      />
    )
  }

  if (screen === 'select') {
    return (
      <AircraftSelect
        onSelect={handleAircraftSelect}
        onBack={() => setScreen('menu')}
        completedMissions={progress.completedMissions}
      />
    )
  }

  if (screen === 'achievements') {
    return <AchievementsScreen progress={progress} onBack={() => setScreen('menu')} />
  }

  // game screen
  return (
    <div className="relative h-screen w-screen overflow-hidden bg-sky-300">
      <div ref={containerRef} className="absolute inset-0" />

      {(phase === 'flying' || phase === 'paused') && snap && (
        <Hud snap={snap} cameraMode={cameraMode} />
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
          score={finalScore}
          newAchievements={newAchievements}
          onRestart={handleRestart}
          onQuit={handleQuit}
        />
      )}
    </div>
  )
}
