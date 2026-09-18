import { describe, expect, it } from 'vitest'
import { DistortionEffect } from '../../src/audio/worklet/effects/distortion'

describe('DistortionEffect', () => {
  it('passes samples through at zero amount', () => {
    const effect = new DistortionEffect()
    effect.setOptions({ amount: 0 })
    const input = Float32Array.from([-0.5, 0.25, 0.75])
    const output = new Float32Array(input.length)

    effect.process(input, output)

    expect(output).toEqual(input)
  })

  it('reduces and holds samples at full amount', () => {
    const effect = new DistortionEffect()
    effect.setOptions({ amount: 1 })
    const input = Float32Array.from([0.1, 0.2, 0.3])
    const output = new Float32Array(input.length)

    effect.process(input, output)

    expect(output[0]).not.toBe(input[0])
    expect(output[1]).toBe(output[0])
    expect(output[2]).toBe(output[0])
  })
})
