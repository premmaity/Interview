import { Database, FileAudio, Scale, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { api, jsonBody } from '../../lib/api'

export function SettingsPage() {
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const removeAccount = async (event: React.FormEvent) => {
    event.preventDefault()
    setError('')
    try {
      await api('/api/v1/auth/me', { method: 'DELETE', body: jsonBody({ password, confirmation }) })
      await navigate('/', { replace: true })
      window.location.reload()
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Account deletion failed')
    }
  }
  return <div className="page-stack"><header className="page-header"><div><p className="eyebrow">Privacy & controls</p><h1>Your practice data should stay understandable.</h1><p>Interview Mentor is a coaching tool. It does not infer protected attributes or make hiring decisions.</p></div></header><section className="settings-grid"><article className="panel"><ShieldCheck /><h2>Session security</h2><p>Your sign-in session lives in an HttpOnly cookie, with CSRF protection on mutations. It is not stored in browser local storage.</p></article><article className="panel"><FileAudio /><h2>Audio lifecycle</h2><p>Microphone access is explicit. Voice transcription runs on your device, raw recordings are not uploaded, and you edit the text before submitting.</p></article><article className="panel"><Database /><h2>Durable practice</h2><p>Submitted answers and reports are stored so a refresh or API restart does not erase completed work. Delete any interview from its session page.</p></article><article className="panel"><Scale /><h2>Know the limits</h2><p>Scores are bounded coaching signals with confidence—not objective truth and never an automated employment recommendation.</p></article></section><section className="panel danger-zone"><div><h2>Delete account and owned data</h2><p>This immediately removes your profile, sessions, answers, reports, and active sign-ins. This cannot be undone.</p></div><form onSubmit={(event) => void removeAccount(event)} className="delete-form"><label>Password<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label><label>Type DELETE MY ACCOUNT<input value={confirmation} onChange={(event) => setConfirmation(event.target.value)} required /></label>{error && <div className="form-error" role="alert">{error}</div>}<button disabled={confirmation !== 'DELETE MY ACCOUNT'}>Delete account</button></form></section></div>
}
