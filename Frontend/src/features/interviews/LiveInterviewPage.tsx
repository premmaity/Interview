import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Check,
  Mic,
  MicOff,
  RefreshCw,
  Send,
  Trash2,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { ErrorState, LoadingState } from '../../components/States'
import { decodeForWhisper } from '../../lib/audio'
import { api, jsonBody } from '../../lib/api'
import type { InputMode, Interview } from '../../types'

type VoiceStatus = 'idle' | 'decoding' | 'loading' | 'transcribing'

type TranscriptionWorkerMessage =
  | { type: 'loading'; progress?: number }
  | { type: 'transcribing' }
  | { type: 'result'; text: string }
  | { type: 'error'; message: string }

function microphoneError(error: unknown): string {
  if (error instanceof DOMException && error.name === 'NotAllowedError') {
    return 'Microphone permission was blocked. Allow microphone access for this site and try again.'
  }
  if (error instanceof DOMException && error.name === 'NotFoundError') {
    return 'No microphone was found. Connect one and try again.'
  }
  return error instanceof Error ? error.message : 'The microphone could not be started.'
}

export function LiveInterviewPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [transcript, setTranscript] = useState('')
  const [listening, setListening] = useState(false)
  const [recording, setRecording] = useState(false)
  const [speaking, setSpeaking] = useState(false)
  const [voiceStatus, setVoiceStatus] = useState<VoiceStatus>('idle')
  const [modelProgress, setModelProgress] = useState<number | undefined>()
  const [voiceError, setVoiceError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const workerRef = useRef<Worker | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const requestIdRef = useRef<string | null>(null)
  const session = useQuery({
    queryKey: ['interview', id],
    queryFn: () => api<Interview>(`/api/v1/interviews/${id}`),
    refetchInterval: (query) => (query.state.data?.status === 'evaluating' ? 2000 : false),
  })

  useEffect(() => {
    if (session.data?.status === 'completed') {
      void navigate(`/app/interviews/${id}/report`, { replace: true })
    }
  }, [id, navigate, session.data?.status])

  useEffect(
    () => () => {
      recognitionRef.current?.stop()
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.onstop = null
        recorderRef.current.stop()
      }
      streamRef.current?.getTracks().forEach((track) => track.stop())
      workerRef.current?.terminate()
      window.speechSynthesis?.cancel()
    },
    [],
  )

  useEffect(() => {
    window.speechSynthesis?.cancel()
    setSpeaking(false)
  }, [session.data?.current_question?.id])

  const submit = useMutation({
    mutationFn: (source: InputMode) => {
      if (!session.data?.current_question) throw new Error('No current question')
      requestIdRef.current ??= crypto.randomUUID()
      return api<Interview>(`/api/v1/interviews/${id}/answers`, {
        method: 'POST',
        body: jsonBody({
          question_id: session.data.current_question.id,
          client_request_id: requestIdRef.current,
          text: transcript,
          source_mode: source,
        }),
      })
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['interview', id], data)
      setTranscript('')
      requestIdRef.current = null
    },
  })

  const complete = useMutation({
    mutationFn: () => api<Interview>(`/api/v1/interviews/${id}/complete`, { method: 'POST' }),
    onSuccess: (data) => queryClient.setQueryData(['interview', id], data),
  })
  const remove = useMutation({
    mutationFn: () => api(`/api/v1/interviews/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['interviews'] })
      void navigate('/app/history')
    },
  })

  if (session.isLoading) return <LoadingState label="Restoring your interview" />
  if (session.error || !session.data) {
    return (
      <ErrorState
        error={session.error ?? new Error('Interview unavailable')}
        onRetry={() => void session.refetch()}
      />
    )
  }
  const interview = session.data
  if (interview.status === 'evaluating') {
    return (
      <div className="focus-page">
        <LoadingState label="Building your evidence-based report" />
        <p className="muted center">
          You can leave this page. The durable session will continue.
        </p>
      </div>
    )
  }
  if (interview.status === 'failed') {
    return (
      <div className="focus-page">
        <ErrorState
          error={new Error('Evaluation failed safely. Your answers are still stored.')}
          onRetry={() => void complete.mutateAsync()}
        />
      </div>
    )
  }

  const question = interview.current_question
  const SpeechCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition
  const canReadAloud = 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window
  const processingVoice = voiceStatus !== 'idle'

  const toggleQuestionAudio = () => {
    if (!canReadAloud || !question) return
    if (speaking) {
      window.speechSynthesis.cancel()
      setSpeaking(false)
      return
    }
    setVoiceError(null)
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(question.text)
    utterance.lang = 'en-US'
    utterance.rate = 0.95
    utterance.onend = () => setSpeaking(false)
    utterance.onerror = () => {
      setSpeaking(false)
      setVoiceError('Question audio could not be played by this browser.')
    }
    window.speechSynthesis.speak(utterance)
    setSpeaking(true)
  }

  const toggleRecognition = () => {
    if (listening) {
      recognitionRef.current?.stop()
      setListening(false)
      return
    }
    if (!SpeechCtor) return
    setVoiceError(null)
    const recognition = new SpeechCtor()
    const original = transcript.trim()
    recognition.lang = 'en-US'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.onresult = (event) => {
      let spoken = ''
      for (let index = 0; index < event.results.length; index += 1) {
        spoken += `${event.results[index][0].transcript} `
      }
      setTranscript([original, spoken.trim()].filter(Boolean).join(' '))
    }
    recognition.onerror = () => {
      setListening(false)
      setVoiceError('Live dictation stopped. You can use on-device recording instead.')
    }
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition
    recognition.start()
    setListening(true)
  }

  const getTranscriptionWorker = () => {
    if (workerRef.current) return workerRef.current
    const worker = new Worker(new URL('../../workers/transcription.worker.ts', import.meta.url), {
      type: 'module',
    })
    worker.onmessage = (event: MessageEvent<TranscriptionWorkerMessage>) => {
      const message = event.data
      if (message.type === 'loading') {
        setVoiceStatus('loading')
        setModelProgress(message.progress)
      } else if (message.type === 'transcribing') {
        setVoiceStatus('transcribing')
        setModelProgress(undefined)
      } else if (message.type === 'result') {
        setTranscript((current) => [current.trim(), message.text].filter(Boolean).join(' '))
        setVoiceStatus('idle')
        setModelProgress(undefined)
      } else {
        setVoiceStatus('idle')
        setModelProgress(undefined)
        setVoiceError(message.message)
      }
    }
    worker.onerror = () => {
      setVoiceStatus('idle')
      setModelProgress(undefined)
      setVoiceError('The on-device voice model could not start. Check your connection and retry.')
    }
    workerRef.current = worker
    return worker
  }

  const transcribeOnDevice = async (blob: Blob) => {
    try {
      setVoiceStatus('decoding')
      const audio = await decodeForWhisper(blob)
      if (audio.length < 1600) {
        throw new Error('The recording was too short. Speak for a moment longer.')
      }
      getTranscriptionWorker().postMessage({ audio }, [audio.buffer])
    } catch (error) {
      setVoiceStatus('idle')
      setVoiceError(error instanceof Error ? error.message : 'The recording could not be read.')
    }
  }

  const toggleRecorder = async () => {
    if (recording) {
      recorderRef.current?.stop()
      setRecording(false)
      return
    }
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setVoiceError('This browser cannot record audio. The editable text answer is still available.')
      return
    }

    try {
      setVoiceError(null)
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      })
      streamRef.current = stream
      const preferred = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find(
        (type) => MediaRecorder.isTypeSupported(type),
      )
      const recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined)
      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size) chunksRef.current.push(event.data)
      }
      recorder.onerror = () => {
        setRecording(false)
        setVoiceError('Recording failed. Check the selected microphone and retry.')
      }
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop())
        streamRef.current = null
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType })
        void transcribeOnDevice(blob)
      }
      recorderRef.current = recorder
      recorder.start(1000)
      setRecording(true)
    } catch (error) {
      streamRef.current?.getTracks().forEach((track) => track.stop())
      streamRef.current = null
      setRecording(false)
      setVoiceError(microphoneError(error))
    }
  }

  const recordingLabel = recording
    ? 'Stop recording'
    : voiceStatus === 'decoding'
      ? 'Preparing audio…'
      : voiceStatus === 'loading'
        ? `Loading voice model${modelProgress === undefined ? '…' : ` ${modelProgress}%`}`
        : voiceStatus === 'transcribing'
          ? 'Transcribing…'
          : 'Record answer'

  return (
    <div className="interview-page">
      <header className="interview-header">
        <div>
          <p className="eyebrow">
            {interview.round_type.replace('_', ' ')} · {interview.difficulty}
          </p>
          <h1>{interview.target_role}</h1>
        </div>
        <div className="progress-wrap">
          <span>
            Question {interview.current_question_number} of {interview.question_count}
          </span>
          <progress value={interview.current_question_number} max={interview.question_count} />
        </div>
      </header>
      <main className="interview-workspace">
        <section className="question-card" aria-live="polite">
          <span className="question-number">
            {String(interview.current_question_number).padStart(2, '0')}
          </span>
          <p>{question?.text}</p>
          {interview.input_mode === 'voice' && (
            <button
              type="button"
              className={`question-audio ${speaking ? 'active' : ''}`}
              onClick={toggleQuestionAudio}
              disabled={!canReadAloud}
            >
              {speaking ? <VolumeX size={17} /> : <Volume2 size={17} />}
              {speaking ? 'Stop question audio' : 'Read question aloud'}
            </button>
          )}
          <div className="tag-row">
            {question?.rubric_tags.map((tag) => <span key={tag}>{tag}</span>)}
          </div>
        </section>
        <section className="answer-card">
          <div className="answer-heading">
            <div>
              <p className="eyebrow">Your answer</p>
              <h2>Build the transcript before you submit.</h2>
            </div>
            <span className="autosave">
              <Check size={15} />Completed turns save on submit
            </span>
          </div>
          {interview.input_mode === 'voice' && (
            <div className="voice-tools">
              {SpeechCtor && (
                <button
                  type="button"
                  className={`secondary-button ${listening ? 'active' : ''}`}
                  onClick={toggleRecognition}
                  disabled={recording || processingVoice}
                >
                  {listening ? <MicOff size={18} /> : <Mic size={18} />}
                  {listening ? 'Stop live dictation' : 'Live dictation'}
                </button>
              )}
              <button
                type="button"
                className={`secondary-button ${recording ? 'active' : ''}`}
                onClick={() => void toggleRecorder()}
                disabled={processingVoice || listening}
              >
                {recording ? <MicOff size={18} /> : <Mic size={18} />}
                {recordingLabel}
              </button>
              <p className="voice-privacy">
                Works in Firefox, Chrome, and Edge. Transcription runs on this device; your raw audio
                is not uploaded. The first use downloads the private voice model.
              </p>
              {voiceError && (
                <div className="form-error voice-error" role="alert">
                  {voiceError}
                </div>
              )}
            </div>
          )}
          <label className="sr-only" htmlFor="answer">
            Editable answer transcript
          </label>
          <textarea
            id="answer"
            rows={10}
            value={transcript}
            onChange={(event) => {
              setTranscript(event.target.value)
              requestIdRef.current = null
            }}
            placeholder="Start with context, explain your decision, name the trade-off, and close with evidence."
          />
          <div className="answer-footer">
            <span>{transcript.trim().split(/\s+/).filter(Boolean).length} words</span>
            <button
              className="primary-button"
              disabled={!transcript.trim() || submit.isPending}
              onClick={() => submit.mutate(interview.input_mode)}
            >
              {submit.isPending ? <RefreshCw className="spin" size={18} /> : <Send size={18} />}
              {submit.isPending ? 'Submitting safely…' : 'Submit answer'}
            </button>
          </div>
          {submit.error && (
            <div className="form-error" role="alert">
              {submit.error.message}
            </div>
          )}
        </section>
      </main>
      <footer className="interview-actions">
        <button
          className="text-button danger"
          onClick={() => {
            if (window.confirm('Delete this interview and all its answers?')) remove.mutate()
          }}
        >
          <Trash2 size={16} />Delete session
        </button>
        <button
          className="text-button"
          disabled={interview.answers.length === 0 || complete.isPending}
          onClick={() => complete.mutate()}
        >
          Finish early and evaluate
        </button>
      </footer>
    </div>
  )
}
