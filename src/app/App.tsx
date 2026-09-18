import { useEffect, useRef, useState } from 'react'
import { AudioEngine, type AudioEngineSnapshot, type InputDevice } from '../audio/engine'
import { defaultEffectSettings, type EffectSettings } from '../audio/settings'
import { EffectCard } from './components/EffectCard'
import { LevelMeter } from './components/LevelMeter'
import { RangeControl } from './components/RangeControl'
import { Toggle } from './components/Toggle'

const initialSnapshot: AudioEngineSnapshot = {
  status: 'idle',
  inputLevel: 0,
  outputLevel: 0,
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : 'Unable to access the microphone.'
}

export function App() {
  const engineRef = useRef<AudioEngine | null>(null)
  const [devices, setDevices] = useState<InputDevice[]>([])
  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [snapshot, setSnapshot] = useState<AudioEngineSnapshot>(initialSnapshot)
  const [effects, setEffects] = useState<EffectSettings>(defaultEffectSettings)
  const [processingEnabled, setProcessingEnabled] = useState(true)
  const [monitorEnabled, setMonitorEnabled] = useState(false)
  const [monitorVolume, setMonitorVolume] = useState(45)
  const [actionError, setActionError] = useState<string | null>(null)

  if (!engineRef.current) {
    engineRef.current = new AudioEngine()
  }

  const engine = engineRef.current
  const isStarting = snapshot.status === 'starting'
  const isRunning = snapshot.status === 'running'
  const statusError = actionError ?? snapshot.error

  useEffect(() => {
    const unsubscribe = engine.subscribe(setSnapshot)
    engine.getInputDevices().then(setDevices).catch(() => undefined)

    return () => {
      unsubscribe()
      void engine.stop()
    }
  }, [engine])

  useEffect(() => {
    engine.updateEffects(effects)
  }, [effects, engine])

  const refreshDevices = async () => {
    const nextDevices = await engine.getInputDevices()
    setDevices(nextDevices)

    if (!selectedDeviceId && nextDevices[0]) {
      setSelectedDeviceId(nextDevices[0].id)
    }
  }

  const start = async () => {
    setActionError(null)

    try {
      await engine.start(selectedDeviceId || undefined)
      await refreshDevices()
    } catch (error) {
      setActionError(errorMessage(error))
    }
  }

  const stop = async () => {
    setActionError(null)

    try {
      await engine.stop()
    } catch (error) {
      setActionError(errorMessage(error))
    }
  }

  const updateEffects = (updater: (current: EffectSettings) => EffectSettings) => {
    setEffects((current) => updater(current))
  }

  const resetEffects = () => {
    setEffects(defaultEffectSettings)
    setProcessingEnabled(true)
    setMonitorVolume(45)
    engine.setProcessingEnabled(true)
    engine.setMonitorVolume(0.45)
  }

  const setProcessing = (enabled: boolean) => {
    setProcessingEnabled(enabled)
    engine.setProcessingEnabled(enabled)
  }

  const setMonitoring = (enabled: boolean) => {
    setMonitorEnabled(enabled)
    engine.setMonitorEnabled(enabled)
  }

  const setVolume = (value: number) => {
    setMonitorVolume(value)
    engine.setMonitorVolume(value / 100)
  }

  return (
    <main className="app-shell">
      <section className="hero">
        <div className="hero__eyebrow">Audio playground</div>
        <h1>Fake Mic</h1>
        <p>Shape your live microphone into a beautifully unreliable connection.</p>
      </section>

      <section className="session-card" aria-label="Audio session controls">
        <div className="session-card__topline">
          <div className="status">
            <span className={`status__dot status__dot--${snapshot.status}`} />
            <span>{isRunning ? 'Live processing' : isStarting ? 'Connecting microphone' : 'Ready to start'}</span>
          </div>
          <button className="button button--quiet" type="button" onClick={resetEffects} disabled={isStarting}>
            Reset controls
          </button>
        </div>

        <label className="select-control">
          <span>Microphone</span>
          <select
            value={selectedDeviceId}
            disabled={isRunning || isStarting}
            onChange={(event) => setSelectedDeviceId(event.target.value)}
          >
            <option value="">Default microphone</option>
            {devices.map((device) => (
              <option key={device.id} value={device.id}>
                {device.label || 'Unnamed microphone'}
              </option>
            ))}
          </select>
        </label>

        <div className="session-card__actions">
          <button
            className={`button button--primary${isRunning ? ' button--stop' : ''}`}
            type="button"
            onClick={isRunning ? stop : start}
            disabled={isStarting}
          >
            {isRunning ? 'Stop session' : isStarting ? 'Starting…' : 'Start microphone'}
          </button>
          <div className="session-card__meters">
            <LevelMeter label="Input" value={snapshot.inputLevel} />
            <LevelMeter label="Output" value={snapshot.outputLevel} />
          </div>
        </div>

        {statusError ? <p className="notice notice--error" role="alert">{statusError}</p> : null}
        {!monitorEnabled ? <p className="notice">Monitoring is off. Use headphones before turning it on.</p> : null}
      </section>

      <section className="global-controls" aria-label="Global audio controls">
        <div className="global-control">
          <div>
            <h2>Process effects</h2>
            <p>Send your microphone through the active effects chain.</p>
          </div>
          <Toggle checked={processingEnabled} label="Enable effects processing" onChange={setProcessing} />
        </div>
        <div className="global-control">
          <div>
            <h2>Monitor locally</h2>
            <p>Hear the result through your default output device.</p>
          </div>
          <Toggle checked={monitorEnabled} label="Enable local monitoring" onChange={setMonitoring} />
        </div>
        <RangeControl
          label="Monitor volume"
          value={monitorVolume}
          min={0}
          max={100}
          step={1}
          unit="%"
          disabled={!monitorEnabled}
          onChange={setVolume}
        />
      </section>

      <section className="effects-grid" aria-label="Voice effects">
        <EffectCard
          title="Crack"
          description="Drop fragments and break speech into unstable packets."
          enabled={effects.crack.enabled}
          onEnabledChange={(enabled) => updateEffects((current) => ({
            ...current,
            crack: { ...current.crack, enabled },
          }))}
        >
          <RangeControl
            label="Packet loss"
            value={effects.crack.packetLoss * 100}
            min={0}
            max={100}
            step={1}
            unit="%"
            disabled={!effects.crack.enabled}
            onChange={(packetLoss) => updateEffects((current) => ({
              ...current,
              crack: { ...current.crack, packetLoss: packetLoss / 100 },
            }))}
          />
          <RangeControl
            label="Break intensity"
            value={effects.crack.intensity * 100}
            min={0}
            max={100}
            step={1}
            unit="%"
            disabled={!effects.crack.enabled}
            onChange={(intensity) => updateEffects((current) => ({
              ...current,
              crack: { ...current.crack, intensity: intensity / 100 },
            }))}
          />
        </EffectCard>

        <EffectCard
          title="Latency"
          description="Delay the signal and shift its timing with soft jitter."
          enabled={effects.latency.enabled}
          onEnabledChange={(enabled) => updateEffects((current) => ({
            ...current,
            latency: { ...current.latency, enabled },
          }))}
        >
          <RangeControl
            label="Delay"
            value={effects.latency.delayMs}
            min={0}
            max={1000}
            step={10}
            unit="ms"
            disabled={!effects.latency.enabled}
            onChange={(delayMs) => updateEffects((current) => ({
              ...current,
              latency: { ...current.latency, delayMs },
            }))}
          />
          <RangeControl
            label="Jitter"
            value={effects.latency.jitterMs}
            min={0}
            max={200}
            step={5}
            unit="ms"
            disabled={!effects.latency.enabled}
            onChange={(jitterMs) => updateEffects((current) => ({
              ...current,
              latency: { ...current.latency, jitterMs },
            }))}
          />
        </EffectCard>

        <EffectCard
          title="Distortion"
          description="Compress, flatten, and reduce detail in the signal."
          enabled={effects.distortion.enabled}
          onEnabledChange={(enabled) => updateEffects((current) => ({
            ...current,
            distortion: { ...current.distortion, enabled },
          }))}
        >
          <RangeControl
            label="Amount"
            value={effects.distortion.amount * 100}
            min={0}
            max={100}
            step={1}
            unit="%"
            disabled={!effects.distortion.enabled}
            onChange={(amount) => updateEffects((current) => ({
              ...current,
              distortion: { ...current.distortion, amount: amount / 100 },
            }))}
          />
        </EffectCard>

        <EffectCard
          title="Robot"
          description="Blend in metallic modulation for an artificial voice."
          enabled={effects.robot.enabled}
          onEnabledChange={(enabled) => updateEffects((current) => ({
            ...current,
            robot: { ...current.robot, enabled },
          }))}
        >
          <RangeControl
            label="Amount"
            value={effects.robot.intensity * 100}
            min={0}
            max={100}
            step={1}
            unit="%"
            disabled={!effects.robot.enabled}
            onChange={(intensity) => updateEffects((current) => ({
              ...current,
              robot: { ...current.robot, intensity: intensity / 100 },
            }))}
          />
          <RangeControl
            label="Carrier frequency"
            value={effects.robot.carrierHz}
            min={20}
            max={200}
            step={1}
            unit="Hz"
            disabled={!effects.robot.enabled}
            onChange={(carrierHz) => updateEffects((current) => ({
              ...current,
              robot: { ...current.robot, carrierHz },
            }))}
          />
        </EffectCard>
      </section>
    </main>
  )
}
