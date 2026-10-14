import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Mic, MicOff, RefreshCw, Send, Trash2, Upload } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { ErrorState, LoadingState } from '../../components/States'
import { api, jsonBody } from '../../lib/api'
import type { InputMode, Interview } from '../../types'

export function LiveInterviewPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [transcript, setTranscript] = useState('')
  const [listening, setListening] = useState(false)
  const [recording, setRecording] = useState(false)
  const [consent, setConsent] = useState(false)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const requestIdRef = useRef<string | null>(null)
  const session = useQuery({ queryKey: ['interview', id], queryFn: () => api<Interview>(`/api/v1/interviews/${id}`), refetchInterval: (query) => query.state.data?.status === 'evaluating' ? 2000 : false })
  useEffect(() => { if (session.data?.status === 'completed') void navigate(`/app/interviews/${id}/report`, { replace: true }) }, [id, navigate, session.data?.status])
  useEffect(() => () => { recognitionRef.current?.stop(); recorderRef.current?.stop() }, [])

  const submit = useMutation({ mutationFn: (source: InputMode) => {
    if (!session.data?.current_question) throw new Error('No current question')
    requestIdRef.current ??= crypto.randomUUID()
    return api<Interview>(`/api/v1/interviews/${id}/answers`, { method: 'POST', body: jsonBody({ question_id: session.data.current_question.id, client_request_id: requestIdRef.current, text: transcript, source_mode: source }) })
  }, onSuccess: (data) => { queryClient.setQueryData(['interview', id], data); setTranscript(''); requestIdRef.current = null } })

  const complete = useMutation({ mutationFn: () => api<Interview>(`/api/v1/interviews/${id}/complete`, { method: 'POST' }), onSuccess: (data) => queryClient.setQueryData(['interview', id], data) })
  const remove = useMutation({ mutationFn: () => api(`/api/v1/interviews/${id}`, { method: 'DELETE' }), onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ['interviews'] }); void navigate('/app/history') } })

  if (session.isLoading) return <LoadingState label="Restoring your interview" />
  if (session.error || !session.data) return <ErrorState error={session.error ?? new Error('Interview unavailable')} onRetry={() => void session.refetch()} />
  const interview = session.data
  if (interview.status === 'evaluating') return <div className="focus-page"><LoadingState label="Building your evidence-based report" /><p className="muted center">You can leave this page. The durable session will continue.</p></div>
  if (interview.status === 'failed') return <div className="focus-page"><ErrorState error={new Error('Evaluation failed safely. Your answers are still stored.')} onRetry={() => void complete.mutateAsync()} /></div>
  const question = interview.current_question
  const SpeechCtor = window.SpeechRecognition ?? window.webkitSpeechRecognition

  const toggleRecognition = () => {
    if (listening) { recognitionRef.current?.stop(); setListening(false); return }
    if (!SpeechCtor) return
    const recognition = new SpeechCtor()
    recognition.lang = 'en-US'; recognition.continuous = true; recognition.interimResults = true
    recognition.onresult = (event) => { let text = ''; for (let index = 0; index < event.results.length; index += 1) text += `${event.results[index][0].transcript} `; setTranscript(text.trim()) }
    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)
    recognitionRef.current = recognition; recognition.start(); setListening(true)
  }

  const toggleRecorder = async () => {
    if (recording) { recorderRef.current?.stop(); setRecording(false); return }
    if (!consent) return
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    const preferred = ['audio/webm;codecs=opus', 'audio/ogg;codecs=opus', 'audio/mp4'].find((type) => MediaRecorder.isTypeSupported(type))
    const recorder = new MediaRecorder(stream, preferred ? { mimeType: preferred } : undefined)
    chunksRef.current = []
    recorder.ondataavailable = (event) => { if (event.data.size) chunksRef.current.push(event.data) }
    recorder.onstop = () => { stream.getTracks().forEach((track) => track.stop()); void transcribeRecording(recorder.mimeType) }
    recorderRef.current = recorder; recorder.start(); setRecording(true)
  }

  const transcribeRecording = async (mimeType: string) => {
    const data = new FormData()
    data.append('consent', String(consent)); data.append('language', 'en')
    data.append('file', new Blob(chunksRef.current, { type: mimeType }), 'answer.webm')
    const result = await api<{ transcript: string }>(`/api/v1/interviews/${id}/transcriptions`, { method: 'POST', body: data, timeoutMs: 60_000 })
    setTranscript(result.transcript)
  }

  return <div className="interview-page"><header className="interview-header"><div><p className="eyebrow">{interview.round_type.replace('_', ' ')} · {interview.difficulty}</p><h1>{interview.target_role}</h1></div><div className="progress-wrap"><span>Question {interview.current_question_number} of {interview.question_count}</span><progress value={interview.current_question_number} max={interview.question_count} /></div></header><main className="interview-workspace"><section className="question-card" aria-live="polite"><span className="question-number">{String(interview.current_question_number).padStart(2, '0')}</span><p>{question?.text}</p><div className="tag-row">{question?.rubric_tags.map((tag) => <span key={tag}>{tag}</span>)}</div></section><section className="answer-card"><div className="answer-heading"><div><p className="eyebrow">Your answer</p><h2>Build the transcript before you submit.</h2></div><span className="autosave"><Check size={15} />Completed turns save on submit</span></div>{interview.input_mode === 'voice' && <div className="voice-tools"><button type="button" className={`secondary-button ${listening ? 'active' : ''}`} onClick={toggleRecognition} disabled={!SpeechCtor}>{listening ? <MicOff size={18} /> : <Mic size={18} />}{SpeechCtor ? (listening ? 'Stop dictation' : 'Browser dictation') : 'Dictation unavailable'}</button><button type="button" className={`secondary-button ${recording ? 'active' : ''}`} onClick={() => void toggleRecorder()} disabled={!consent}>{recording ? <MicOff size={18} /> : <Upload size={18} />}{recording ? 'Stop & transcribe' : 'Server transcription'}</button><label className="consent"><input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} />I consent to transient audio processing. Raw audio is deleted after transcription.</label></div>}<label className="sr-only" htmlFor="answer">Editable answer transcript</label><textarea id="answer" rows={10} value={transcript} onChange={(event) => { setTranscript(event.target.value); requestIdRef.current = null }} placeholder="Start with context, explain your decision, name the trade-off, and close with evidence." /><div className="answer-footer"><span>{transcript.trim().split(/\s+/).filter(Boolean).length} words</span><button className="primary-button" disabled={!transcript.trim() || submit.isPending} onClick={() => submit.mutate(interview.input_mode)}>{submit.isPending ? <RefreshCw className="spin" size={18} /> : <Send size={18} />}{submit.isPending ? 'Submitting safely…' : 'Submit answer'}</button></div>{submit.error && <div className="form-error" role="alert">{submit.error.message}</div>}</section></main><footer className="interview-actions"><button className="text-button danger" onClick={() => { if (window.confirm('Delete this interview and all its answers?')) remove.mutate() }}><Trash2 size={16} />Delete session</button><button className="text-button" disabled={interview.answers.length === 0 || complete.isPending} onClick={() => complete.mutate()}>Finish early and evaluate</button></footer></div>
}
