import { describe, expect, it } from 'vitest'
import { CrackEffect } from '../../src/audio/worklet/effects/crack'

describe('CrackEffect', () => {
  it('passes samples through with no packet loss', () => {
    const effect = new CrackEffect(1000, () => 0)
    effect.setOptions({ packetLoss: 0, intensity: 1 })
    const input = Float32Array.from([0.1, -0.2, 0.3])
    const output = new Float32Array(input.length)

    effect.process(input, output)

    expect(output).toEqual(input)
  })

  it('silences packets at full packet loss', () => {
    const effect = new CrackEffect(1000, () => 0)
    effect.setOptions({ packetLoss: 1, intensity: 0 })
    const input = new Float32Array(20).fill(0.5)
    const output = new Float32Array(input.length)

    effect.process(input, output)

    expect([...output]).toEqual(new Array(20).fill(0))
  })
})
