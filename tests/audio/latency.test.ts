import { describe, expect, it } from 'vitest'
import { LatencyEffect } from '../../src/audio/worklet/effects/latency'

describe('LatencyEffect', () => {
  it('delays an impulse by the configured amount', () => {
    const effect = new LatencyEffect(1000, 100, () => 0.5)
    effect.setOptions({ delayMs: 3, jitterMs: 0 })
    const input = Float32Array.from([1, 0, 0, 0, 0, 0])
    const output = new Float32Array(input.length)

    effect.process(input, output)

    expect([...output]).toEqual([0, 0, 0, 1, 0, 0])
  })

  it('keeps jittered delay within the configured buffer limit', () => {
    const effect = new LatencyEffect(1000, 10, () => 1)
    effect.setOptions({ delayMs: 10, jitterMs: 10 })
    const input = new Float32Array(40)
    const output = new Float32Array(input.length)

    effect.process(input, output)

    expect([...output].every(Number.isFinite)).toBe(true)
  })
})
