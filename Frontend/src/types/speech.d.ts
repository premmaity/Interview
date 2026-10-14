interface SpeechRecognitionResultItem { transcript: string }
interface SpeechRecognitionResult { readonly isFinal: boolean; readonly length: number; readonly [index: number]: SpeechRecognitionResultItem }
interface SpeechRecognitionResultList { readonly length: number; readonly [index: number]: SpeechRecognitionResult }
interface SpeechRecognitionEvent extends Event { readonly resultIndex: number; readonly results: SpeechRecognitionResultList }
interface SpeechRecognition extends EventTarget {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: (() => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
}
interface SpeechRecognitionConstructor { new(): SpeechRecognition }
interface Window {
  SpeechRecognition?: SpeechRecognitionConstructor
  webkitSpeechRecognition?: SpeechRecognitionConstructor
}

