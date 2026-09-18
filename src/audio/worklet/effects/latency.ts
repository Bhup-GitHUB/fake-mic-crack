export interface LatencyEffectOptions {
  delayMs: number
  jitterMs: number
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum)

export class LatencyEffect {
  private readonly random: () => number
  private readonly sampleRate: number
  private readonly buffer: Float32Array
  private readonly jitterIntervalSamples: number
  private readonly maximumDelaySamples: number
  private delaySamples = 0
  private jitterSamples = 0
  private currentDelaySamples = 0
  private targetDelaySamples = 0
  private samplesUntilJitter = 0
  private writeIndex = 0

  constructor(
    sampleRate: number,
    maximumDelayMs = 1200,
    random: () => number = Math.random,
  ) {
    this.sampleRate = sampleRate
    this.random = random
    this.maximumDelaySamples = Math.max(1, Math.round((sampleRate * maximumDelayMs) / 1000))
    this.buffer = new Float32Array(this.maximumDelaySamples + 2)
    this.jitterIntervalSamples = Math.max(1, Math.round(sampleRate * 0.1))
  }

  setOptions(options: Partial<LatencyEffectOptions>): void {
    if (options.delayMs !== undefined) {
      this.delaySamples = clamp(
        Math.round((options.delayMs * this.sampleRate) / 1000),
        0,
        this.maximumDelaySamples,
      )
    }

    if (options.jitterMs !== undefined) {
      this.jitterSamples = clamp(
        Math.round((options.jitterMs * this.sampleRate) / 1000),
        0,
        this.maximumDelaySamples,
      )
    }

    this.targetDelaySamples = this.resolveTargetDelay()
    if (this.currentDelaySamples === 0) {
      this.currentDelaySamples = this.targetDelaySamples
    }
  }

  reset(): void {
    this.buffer.fill(0)
    this.currentDelaySamples = this.targetDelaySamples
    this.samplesUntilJitter = 0
    this.writeIndex = 0
  }

  process(input: Float32Array, output: Float32Array): void {
    const length = Math.min(input.length, output.length)
    const bufferLength = this.buffer.length

    for (let index = 0; index < length; index += 1) {
      if (this.samplesUntilJitter === 0) {
        this.targetDelaySamples = this.resolveTargetDelay()
        this.samplesUntilJitter = this.jitterIntervalSamples
      }

      this.currentDelaySamples += (this.targetDelaySamples - this.currentDelaySamples) * 0.002
      this.buffer[this.writeIndex] = input[index]

      let readPosition = this.writeIndex - this.currentDelaySamples
      if (readPosition < 0) {
        readPosition += bufferLength
      }

      const lowerIndex = Math.floor(readPosition)
      const upperIndex = lowerIndex + 1 === bufferLength ? 0 : lowerIndex + 1
      const fraction = readPosition - lowerIndex
      output[index] = this.buffer[lowerIndex] + (this.buffer[upperIndex] - this.buffer[lowerIndex]) * fraction

      this.writeIndex += 1
      if (this.writeIndex === bufferLength) {
        this.writeIndex = 0
      }

      this.samplesUntilJitter -= 1
    }
  }

  private resolveTargetDelay(): number {
    const jitterOffset = this.jitterSamples === 0 ? 0 : (this.random() * 2 - 1) * this.jitterSamples
    return clamp(this.delaySamples + jitterOffset, 0, this.maximumDelaySamples)
  }
}
