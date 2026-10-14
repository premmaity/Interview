const WHISPER_SAMPLE_RATE = 16_000

export function mixToMono(buffer: AudioBuffer): Float32Array {
  const mono = new Float32Array(buffer.length)
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const samples = buffer.getChannelData(channel)
    for (let index = 0; index < samples.length; index += 1) {
      mono[index] += samples[index] / buffer.numberOfChannels
    }
  }
  return mono
}

export function resampleLinear(
  input: Float32Array,
  sourceRate: number,
  targetRate = WHISPER_SAMPLE_RATE,
): Float32Array {
  if (sourceRate === targetRate) return input.slice()
  const outputLength = Math.max(1, Math.round((input.length * targetRate) / sourceRate))
  const output = new Float32Array(outputLength)
  const ratio = sourceRate / targetRate

  for (let index = 0; index < outputLength; index += 1) {
    const position = index * ratio
    const left = Math.floor(position)
    const right = Math.min(left + 1, input.length - 1)
    const weight = position - left
    output[index] = input[left] * (1 - weight) + input[right] * weight
  }
  return output
}

export async function decodeForWhisper(blob: Blob): Promise<Float32Array> {
  const AudioContextConstructor = window.AudioContext
  const context = new AudioContextConstructor()
  try {
    const buffer = await context.decodeAudioData(await blob.arrayBuffer())
    return resampleLinear(mixToMono(buffer), buffer.sampleRate)
  } finally {
    await context.close()
  }
}
