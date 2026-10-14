import { resampleLinear } from './audio'

describe('resampleLinear', () => {
  it('returns a copy when the sample rate already matches', () => {
    const input = new Float32Array([0, 0.25, -0.5])
    const output = resampleLinear(input, 16_000)

    expect(output).toEqual(input)
    expect(output).not.toBe(input)
  })

  it('downsamples while preserving the signal endpoints', () => {
    const output = resampleLinear(new Float32Array([0, 0.25, 0.5, 0.75]), 32_000)

    expect(Array.from(output)).toEqual([0, 0.5])
  })
})
