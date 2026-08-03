// Procedural audio via Web Audio API. No external sound files.
// Engine = detuned saws + sub + turbine whine (bandpassed noise).
// Wind = lowpassed noise, gain by airspeed.
import type { FlightState } from '../types'

export class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private engineGain: GainNode | null = null
  private windGain: GainNode | null = null
  private osc1: OscillatorNode | null = null
  private osc2: OscillatorNode | null = null
  private sub: OscillatorNode | null = null
  private turbineFilter: BiquadFilterNode | null = null
  private windFilter: BiquadFilterNode | null = null
  private noiseBuf: AudioBuffer | null = null
  private started = false
  muted = false

  init() {
    if (this.started) {
      this.ctx?.resume()
      return
    }
    const Ctx = window.AudioContext || (window as any).webkitAudioContext
    this.ctx = new Ctx()
    const ctx = this.ctx

    // noise buffer (2s)
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    this.noiseBuf = buf

    this.master = ctx.createGain()
    this.master.gain.value = 0.9
    this.master.connect(ctx.destination)

    // --- engine bus ---
    this.engineGain = ctx.createGain()
    this.engineGain.gain.value = 0.0
    this.engineGain.connect(this.master)

    this.osc1 = ctx.createOscillator()
    this.osc1.type = 'sawtooth'
    this.osc1.frequency.value = 70
    this.osc2 = ctx.createOscillator()
    this.osc2.type = 'sawtooth'
    this.osc2.frequency.value = 71
    this.sub = ctx.createOscillator()
    this.sub.type = 'sine'
    this.sub.frequency.value = 35
    this.osc1.connect(this.engineGain)
    this.osc2.connect(this.engineGain)
    this.sub.connect(this.engineGain)
    this.osc1.start()
    this.osc2.start()
    this.sub.start()

    // turbine whine (noise -> bandpass -> engine)
    const turbineSrc = ctx.createBufferSource()
    turbineSrc.buffer = buf
    turbineSrc.loop = true
    this.turbineFilter = ctx.createBiquadFilter()
    this.turbineFilter.type = 'bandpass'
    this.turbineFilter.frequency.value = 1500
    this.turbineFilter.Q.value = 6
    const turbineGain = ctx.createGain()
    turbineGain.gain.value = 0.05
    turbineSrc.connect(this.turbineFilter)
    this.turbineFilter.connect(turbineGain)
    turbineGain.connect(this.engineGain)
    turbineSrc.start()

    // --- wind bus ---
    this.windGain = ctx.createGain()
    this.windGain.gain.value = 0
    this.windGain.connect(this.master)
    this.windFilter = ctx.createBiquadFilter()
    this.windFilter.type = 'lowpass'
    this.windFilter.frequency.value = 500
    const windSrc = ctx.createBufferSource()
    windSrc.buffer = buf
    windSrc.loop = true
    windSrc.connect(this.windFilter)
    this.windFilter.connect(this.windGain)
    windSrc.start()

    this.started = true
  }

  update(state: FlightState) {
    if (!this.ctx || !this.started) return
    const t = this.ctx.currentTime
    const rpm = state.rpmNorm
    const thr = state.throttle
    const speed = state.airspeed

    if (this.osc1) this.osc1.frequency.setTargetAtTime(70 + rpm * 160, t, 0.1)
    if (this.osc2) this.osc2.frequency.setTargetAtTime(71 + rpm * 162, t, 0.1)
    if (this.sub) this.sub.frequency.setTargetAtTime(35 + rpm * 70, t, 0.1)
    if (this.engineGain) {
      const g = (0.04 + thr * 0.22) * (this.muted ? 0 : 1)
      this.engineGain.gain.setTargetAtTime(g, t, 0.1)
    }
    if (this.turbineFilter) {
      this.turbineFilter.frequency.setTargetAtTime(900 + rpm * 3500, t, 0.1)
    }
    if (this.windFilter) {
      this.windFilter.frequency.setTargetAtTime(300 + Math.min(speed, 280) * 22, t, 0.1)
    }
    if (this.windGain) {
      const w = Math.max(0, Math.min(1, speed / 240)) * 0.35 * (this.muted ? 0 : 1)
      this.windGain.gain.setTargetAtTime(w, t, 0.2)
    }
  }

  touchdown() {
    if (!this.ctx || !this.noiseBuf || !this.master) return
    const ctx = this.ctx
    const src = ctx.createBufferSource()
    src.buffer = this.noiseBuf
    const lp = ctx.createBiquadFilter()
    lp.type = 'lowpass'
    lp.frequency.value = 300
    const g = ctx.createGain()
    const now = ctx.currentTime
    g.gain.setValueAtTime(0.6, now)
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.4)
    src.connect(lp)
    lp.connect(g)
    g.connect(this.master)
    src.start(now)
    src.stop(now + 0.45)
  }

  gearSound() {
    if (!this.ctx || !this.master) return
    const ctx = this.ctx
    const o = ctx.createOscillator()
    o.type = 'square'
    o.frequency.value = 180
    const g = ctx.createGain()
    const now = ctx.currentTime
    g.gain.setValueAtTime(0.12, now)
    g.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
    o.connect(g)
    g.connect(this.master)
    o.start(now)
    o.stop(now + 0.3)
  }

  setMuted(m: boolean) {
    this.muted = m
  }

  suspend() {
    this.ctx?.suspend()
  }
  resume() {
    this.ctx?.resume()
  }

  dispose() {
    try {
      this.osc1?.stop()
      this.osc2?.stop()
      this.sub?.stop()
    } catch {
      /* noop */
    }
    this.ctx?.close()
    this.ctx = null
    this.started = false
  }
}
