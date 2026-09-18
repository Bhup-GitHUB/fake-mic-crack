export interface RobotEffectOptions {
  intensity: number
  carrierHz: number
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum)

export class RobotEffect {
  private readonly sampleRate: number
  private intensity = 0
  private phase = 0
  private phaseIncrement = 0

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate
  }

  setOptions(options: Partial<RobotEffectOptions>): void {
    if (options.intensity !== undefined) {
      this.intensity = clamp(options.intensity, 0, 1)
    }

    if (options.carrierHz !== undefined) {
      this.phaseIncrement = (Math.PI * 2 * clamp(options.carrierHz, 20, 200)) / this.sampleRate
    }
  }

  reset(): void {
    this.phase = 0
  }

  process(input: Float32Array, output: Float32Array): void {
    const length = Math.min(input.length, output.length)

    if (this.intensity === 0) {
      for (let index = 0; index < length; index += 1) {
        output[index] = input[index]
      }
      return
    }

    for (let index = 0; index < length; index += 1) {
      const modulated = input[index] * Math.sin(this.phase)
      output[index] = input[index] + (modulated - input[index]) * this.intensity
      this.phase += this.phaseIncrement

      if (this.phase >= Math.PI * 2) {
        this.phase -= Math.PI * 2
      }
    }
  }
}
