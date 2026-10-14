/// <reference lib="webworker" />

import { env, pipeline } from '@huggingface/transformers'
import ortFactoryUrl from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.mjs?url'
import ortWasmUrl from 'onnxruntime-web/ort-wasm-simd-threaded.asyncify.wasm?url'

interface TranscriptionRequest {
  audio: Float32Array
}

interface TranscriptionResult {
  text: string
}

interface ProgressUpdate {
  progress?: number
  status?: string
}

type Transcriber = (
  audio: Float32Array,
  options: { chunk_length_s: number; stride_length_s: number },
) => Promise<TranscriptionResult | TranscriptionResult[]>

const worker = self as unknown as DedicatedWorkerGlobalScope
let transcriberPromise: Promise<Transcriber> | undefined

if (env.backends.onnx.wasm) {
  env.backends.onnx.wasm.wasmPaths = { mjs: ortFactoryUrl, wasm: ortWasmUrl }
}

function getTranscriber(): Promise<Transcriber> {
  transcriberPromise ??= pipeline('automatic-speech-recognition', 'onnx-community/whisper-tiny', {
    device: 'wasm',
    progress_callback: (update: ProgressUpdate) => {
      worker.postMessage({
        type: 'loading',
        progress: typeof update.progress === 'number' ? Math.round(update.progress) : undefined,
        detail: update.status,
      })
    },
  }) as unknown as Promise<Transcriber>
  return transcriberPromise
}

worker.onmessage = (event: MessageEvent<TranscriptionRequest>) => {
  void (async () => {
    try {
      const transcriber = await getTranscriber()
      worker.postMessage({ type: 'transcribing' })
      const result = await transcriber(event.data.audio, {
        chunk_length_s: 30,
        stride_length_s: 5,
      })
      const text = (Array.isArray(result) ? result.map((item) => item.text).join(' ') : result.text)
        .trim()
      if (!text) throw new Error('No speech was detected. Try again closer to the microphone.')
      worker.postMessage({ type: 'result', text })
    } catch (error) {
      worker.postMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'Transcription failed',
      })
    }
  })()
}
