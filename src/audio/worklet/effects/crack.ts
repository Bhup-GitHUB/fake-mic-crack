export interface CrackEffectOptions {
  packetLoss: number
  intensity: number
}

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(Math.max(value, minimum), maximum)

export class CrackEffect {
  private readonly random: () => number
  private readonly packetSize: number
  private packetLoss = 0
  private maxBurstPackets = 1
  private packetOffset = 0
  private silentPackets = 0
  private packetMuted = false

  constructor(sampleRate: number, random: () => number = Math.random) {
    this.random = random
    this.packetSize = Math.max(1, Math.round(sampleRate * 0.02))
  }

  setOptions(options: Partial<CrackEffectOptions>): void {
    if (options.packetLoss !== undefined) {
      this.packetLoss = clamp(options.packetLoss, 0, 1)
    }

    if (options.intensity !== undefined) {
      this.maxBurstPackets = 1 + Math.round(clamp(options.intensity, 0, 1) * 9)
    }
  }

  reset(): void {
    this.packetOffset = 0
    this.silentPackets = 0
    this.packetMuted = false
  }

  process(input: Float32Array, output: Float32Array): void {
    const length = Math.min(input.length, output.length)

    for (let index = 0; index < length; index += 1) {
      if (this.packetOffset === 0) {
        if (this.silentPackets === 0 && this.random() < this.packetLoss) {
          this.silentPackets = 1 + Math.floor(this.random() * this.maxBurstPackets)
        }

        this.packetMuted = this.silentPackets > 0
      }

      output[index] = this.packetMuted ? 0 : input[index]
      this.packetOffset += 1

      if (this.packetOffset === this.packetSize) {
        if (this.packetMuted) {
          this.silentPackets -= 1
        }
        this.packetOffset = 0
      }
    }
  }
}
