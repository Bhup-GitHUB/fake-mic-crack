import type { EffectSettings, MeterMessage, WorkletConfiguration, WorkletMessage } from '../settings'
import { CrackEffect } from './effects/crack'
import { DistortionEffect } from './effects/distortion'
import { LatencyEffect } from './effects/latency'
import { RobotEffect } from './effects/robot'

declare const sampleRate: number

declare abstract class AudioWorkletProcessor {
  readonly port: MessagePort
  abstract process(
    inputs: Float32Array[][],
    outputs: Float32Array[][],
    parameters: Record<string, Float32Array>
  ): boolean
}

declare function registerProcessor(
  name: string,
  processorCtor: new (options: AudioWorkletNodeOptions) => AudioWorkletProcessor
): void

interface ProcessorOptions extends AudioWorkletNodeOptions {
  processorOptions?: {
    configuration?: WorkletConfiguration
  }
}

const emptySettings: EffectSettings = {
  crack: { enabled: false, packetLoss: 0, intensity: 0 },
  latency: { enabled: false, delayMs: 0, jitterMs: 0 },
  distortion: { enabled: false, amount: 0 },
  robot: { enabled: false, intensity: 0, carrierHz: 70 }
}

class FakeMicProcessor extends AudioWorkletProcessor {
  private readonly crack = new CrackEffect(sampleRate)
  private readonly latency = new LatencyEffect(sampleRate)
  private readonly distortion = new DistortionEffect()
  private readonly robot = new RobotEffect(sampleRate)
  private configuration: WorkletConfiguration = {
    processingEnabled: true,
    effects: emptySettings
  }
  private firstBuffer = new Float32Array(0)
  private secondBuffer = new Float32Array(0)
  private meterFrames = 0
  private inputPeak = 0
  private outputPeak = 0

  constructor(options: ProcessorOptions) {
    super()
    if (options.processorOptions?.configuration) {
      this.configure(options.processorOptions.configuration)
    }
    this.port.onmessage = (event: MessageEvent<WorkletMessage>) => {
      if (event.data.type === 'configure') this.configure(event.data.configuration)
      if (event.data.type === 'reset') this.reset()
    }
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][]): boolean {
    const input = inputs[0]?.[0]
    const output = outputs[0]?.[0]
    if (!output) return true
    if (!input) {
      output.fill(0)
      return true
    }

    this.ensureBuffers(input.length)
    if (this.configuration.processingEnabled) {
      this.runEffects(input, output)
    } else {
      output.set(input)
    }

    this.captureMeters(input, output)
    return true
  }

  private runEffects(input: Float32Array, output: Float32Array): void {
    let source = input
    let target = this.firstBuffer
    const settings = this.configuration.effects

    if (settings.crack.enabled) {
      this.crack.process(source, target)
      source = target
      target = this.secondBuffer
    }
    if (settings.latency.enabled) {
      this.latency.process(source, target)
      source = target
      target = target === this.firstBuffer ? this.secondBuffer : this.firstBuffer
    }
    if (settings.distortion.enabled) {
      this.distortion.process(source, target)
      source = target
      target = target === this.firstBuffer ? this.secondBuffer : this.firstBuffer
    }
    if (settings.robot.enabled) {
      this.robot.process(source, target)
      source = target
    }

    output.set(source)
    for (let index = 0; index < output.length; index += 1) {
      const sample = output[index]
      output[index] = Number.isFinite(sample) ? Math.max(-1, Math.min(1, sample)) : 0
    }
  }

  private configure(configuration: WorkletConfiguration): void {
    const previous = this.configuration.effects
    this.configuration = configuration
    const effects = configuration.effects
    this.crack.setOptions(effects.crack)
    this.latency.setOptions(effects.latency)
    this.distortion.setOptions(effects.distortion)
    this.robot.setOptions(effects.robot)
    if (previous.crack.enabled && !effects.crack.enabled) this.crack.reset()
    if (previous.latency.enabled && !effects.latency.enabled) this.latency.reset()
    if (previous.distortion.enabled && !effects.distortion.enabled) this.distortion.reset()
    if (previous.robot.enabled && !effects.robot.enabled) this.robot.reset()
  }

  private reset(): void {
    this.crack.reset()
    this.latency.reset()
    this.distortion.reset()
    this.robot.reset()
  }

  private ensureBuffers(length: number): void {
    if (this.firstBuffer.length === length) return
    this.firstBuffer = new Float32Array(length)
    this.secondBuffer = new Float32Array(length)
  }

  private captureMeters(input: Float32Array, output: Float32Array): void {
    for (let index = 0; index < input.length; index += 1) {
      this.inputPeak = Math.max(this.inputPeak, Math.abs(input[index]))
      this.outputPeak = Math.max(this.outputPeak, Math.abs(output[index]))
    }
    this.meterFrames += input.length
    if (this.meterFrames < sampleRate / 20) return
    const message: MeterMessage = {
      type: 'meters',
      inputLevel: this.inputPeak,
      outputLevel: this.outputPeak
    }
    this.port.postMessage(message)
    this.meterFrames = 0
    this.inputPeak = 0
    this.outputPeak = 0
  }
}

registerProcessor('fake-mic-processor', FakeMicProcessor)
