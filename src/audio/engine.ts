import type {
  EffectSettings,
  MeterMessage,
  WorkletConfiguration,
  WorkletMessage
} from './settings'
import { defaultEffectSettings } from './settings'

export interface InputDevice {
  id: string
  label: string
}

export interface AudioEngineSnapshot {
  status: 'idle' | 'starting' | 'running' | 'error'
  inputLevel: number
  outputLevel: number
  error?: string
}

type SnapshotListener = (snapshot: AudioEngineSnapshot) => void

const initialSnapshot: AudioEngineSnapshot = {
  status: 'idle',
  inputLevel: 0,
  outputLevel: 0
}

export class AudioEngine {
  private context?: AudioContext
  private stream?: MediaStream
  private worklet?: AudioWorkletNode
  private monitorGain?: GainNode
  private listeners = new Set<SnapshotListener>()
  private snapshot = initialSnapshot
  private configuration: WorkletConfiguration = {
    processingEnabled: true,
    effects: structuredClone(defaultEffectSettings)
  }
  private monitorEnabled = false
  private monitorVolume = 0.5

  subscribe(listener: SnapshotListener): () => void {
    this.listeners.add(listener)
    listener(this.snapshot)
    return () => this.listeners.delete(listener)
  }

  async getInputDevices(): Promise<InputDevice[]> {
    if (!navigator.mediaDevices?.enumerateDevices) return []
    const devices = await navigator.mediaDevices.enumerateDevices()
    return devices
      .filter((device) => device.kind === 'audioinput')
      .map((device, index) => ({
        id: device.deviceId,
        label: device.label || `Microphone ${index + 1}`
      }))
  }

  async start(deviceId?: string): Promise<void> {
    if (this.snapshot.status === 'starting' || this.snapshot.status === 'running') return
    this.setSnapshot({ status: 'starting', inputLevel: 0, outputLevel: 0 })

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error('Microphone capture is unavailable in this browser.')
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        }
      })
      this.stream = stream
      const context = new AudioContext({ latencyHint: 'interactive' })
      this.context = context
      await context.audioWorklet.addModule(chrome.runtime.getURL('audio-worklet.js'))
      if (context.state === 'suspended') await context.resume()

      const source = context.createMediaStreamSource(stream)
      const worklet = new AudioWorkletNode(context, 'fake-mic-processor', {
        numberOfInputs: 1,
        numberOfOutputs: 1,
        outputChannelCount: [1],
        processorOptions: { configuration: this.configuration }
      })
      const gain = context.createGain()
      gain.gain.value = this.monitorEnabled ? this.monitorVolume : 0
      source.connect(worklet).connect(gain).connect(context.destination)

      worklet.port.onmessage = (event: MessageEvent<MeterMessage>) => {
        if (event.data.type !== 'meters') return
        this.setSnapshot({
          ...this.snapshot,
          inputLevel: event.data.inputLevel,
          outputLevel: event.data.outputLevel
        })
      }
      worklet.onprocessorerror = () => {
        this.setSnapshot({
          status: 'error',
          inputLevel: 0,
          outputLevel: 0,
          error: 'The audio processor stopped unexpectedly.'
        })
        void this.releaseResources()
      }

      this.worklet = worklet
      this.monitorGain = gain
      this.sendConfiguration()
      this.setSnapshot({ status: 'running', inputLevel: 0, outputLevel: 0 })
    } catch (error) {
      await this.releaseResources()
      this.setSnapshot({
        status: 'error',
        inputLevel: 0,
        outputLevel: 0,
        error: this.formatError(error)
      })
      throw error
    }
  }

  async stop(): Promise<void> {
    await this.releaseResources()
    this.setSnapshot(initialSnapshot)
  }

  setProcessingEnabled(enabled: boolean): void {
    this.configuration.processingEnabled = enabled
    this.sendConfiguration()
  }

  setMonitorEnabled(enabled: boolean): void {
    this.monitorEnabled = enabled
    this.updateMonitorGain()
  }

  setMonitorVolume(value: number): void {
    this.monitorVolume = Math.min(1, Math.max(0, value))
    this.updateMonitorGain()
  }

  updateEffects(settings: EffectSettings): void {
    this.configuration.effects = structuredClone(settings)
    this.sendConfiguration()
  }

  private sendConfiguration(): void {
    const message: WorkletMessage = {
      type: 'configure',
      configuration: structuredClone(this.configuration)
    }
    this.worklet?.port.postMessage(message)
  }

  private updateMonitorGain(): void {
    if (!this.context || !this.monitorGain) return
    const value = this.monitorEnabled ? this.monitorVolume : 0
    this.monitorGain.gain.setTargetAtTime(value, this.context.currentTime, 0.015)
  }

  private async releaseResources(): Promise<void> {
    this.worklet?.port.postMessage({ type: 'reset' } satisfies WorkletMessage)
    this.worklet?.disconnect()
    this.monitorGain?.disconnect()
    this.stream?.getTracks().forEach((track) => track.stop())
    if (this.context && this.context.state !== 'closed') await this.context.close()
    this.context = undefined
    this.stream = undefined
    this.worklet = undefined
    this.monitorGain = undefined
  }

  private setSnapshot(snapshot: AudioEngineSnapshot): void {
    this.snapshot = snapshot
    this.listeners.forEach((listener) => listener(snapshot))
  }

  private formatError(error: unknown): string {
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      return 'Microphone permission was denied. Allow access and try again.'
    }
    if (error instanceof DOMException && error.name === 'NotFoundError') {
      return 'No microphone was found.'
    }
    return error instanceof Error ? error.message : 'The microphone could not be started.'
  }
}
