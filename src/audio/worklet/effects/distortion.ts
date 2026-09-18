export interface DistortionEffectOptions {
  amount: number
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum)

export class DistortionEffect {
  private amount = 0
  private drive = 1
  private quantizationSteps = 32768
  private holdLength = 1
  private holdOffset = 0
  private heldSample = 0

  setOptions(options: Partial<DistortionEffectOptions>): void {
    if (options.amount === undefined) {
      return
    }

    this.amount = clamp(options.amount, 0, 1)
    this.drive = 1 + this.amount * 18
    const bitDepth = Math.round(16 - this.amount * 12)
    this.quantizationSteps = 2 ** (bitDepth - 1)
    this.holdLength = 1 + Math.round(this.amount * 11)
  }

  reset(): void {
    this.holdOffset = 0
    this.heldSample = 0
  }

  process(input: Float32Array, output: Float32Array): void {
    const length = Math.min(input.length, output.length)

    if (this.amount === 0) {
      for (let index = 0; index < length; index += 1) {
        output[index] = input[index]
      }
      return
    }

    for (let index = 0; index < length; index += 1) {
      if (this.holdOffset === 0) {
        const sample = input[index] * this.drive
        const clipped = sample / (1 + Math.abs(sample))
        this.heldSample = Math.round(clipped * this.quantizationSteps) / this.quantizationSteps
      }

      output[index] = this.heldSample
      this.holdOffset += 1

      if (this.holdOffset === this.holdLength) {
        this.holdOffset = 0
      }
    }
  }
}
