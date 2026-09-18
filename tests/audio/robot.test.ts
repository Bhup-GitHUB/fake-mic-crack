import { describe, expect, it } from 'vitest'
import { RobotEffect } from '../../src/audio/worklet/effects/robot'

describe('RobotEffect', () => {
  it('passes samples through at zero intensity', () => {
    const effect = new RobotEffect(1000)
    effect.setOptions({ intensity: 0, carrierHz: 100 })
    const input = Float32Array.from([0.2, -0.3, 0.4])
    const output = new Float32Array(input.length)

    effect.process(input, output)

    expect(output).toEqual(input)
  })

  it('ring modulates samples at full intensity', () => {
    const effect = new RobotEffect(1000)
    effect.setOptions({ intensity: 1, carrierHz: 100 })
    const input = new Float32Array(3).fill(1)
    const output = new Float32Array(input.length)

    effect.process(input, output)

    expect(output[0]).toBeCloseTo(0)
    expect(output[1]).toBeGreaterThan(0.5)
  })
})
