import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { useAuth } from '../../app/AuthProvider'
import { api, jsonBody } from '../../lib/api'

const loginSchema = z.object({ email: z.email(), password: z.string().min(1) })
const registerSchema = z.object({
  email: z.email(),
  username: z.string().min(3).max(64).regex(/^[a-zA-Z0-9_.-]+$/),
  password: z.string().min(12).max(128),
})

type LoginFields = z.infer<typeof loginSchema>
type RegisterFields = z.infer<typeof registerSchema>

function AuthLayout({ title, intro, children }: { title: string; intro: string; children: React.ReactNode }) {
  return (
    <div className="auth-page">
      <section className="auth-story">
        <Link to="/" className="brand light"><span className="brand-mark">IM</span>Interview Mentor</Link>
        <div>
          <p className="eyebrow">Private practice room</p>
          <h1>Build answers you can defend under pressure.</h1>
          <p>Structured rounds, durable transcripts, and feedback tied to what you actually said.</p>
        </div>
        <p className="trust-line"><ShieldCheck size={18} /> Voice transcription runs on your device; raw audio is not uploaded.</p>
      </section>
      <section className="auth-panel">
        <div className="auth-card">
          <p className="eyebrow">Welcome</p>
          <h2>{title}</h2>
          <p>{intro}</p>
          {children}
        </div>
      </section>
    </div>
  )
}

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [serverError, setServerError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginFields>({ resolver: zodResolver(loginSchema) })
  if (user) return <Navigate to="/app" replace />
  const submit = async (values: LoginFields) => {
    setServerError('')
    try {
      await login(values.email, values.password)
      const destination = (location.state as { from?: string } | null)?.from ?? '/app'
      await navigate(destination, { replace: true })
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Sign in failed')
    }
  }
  return (
    <AuthLayout title="Sign in" intro="Resume a session or start a focused practice round.">
      <form onSubmit={(event) => void handleSubmit(submit)(event)} className="form-stack" noValidate>
        {serverError && <div className="form-error" role="alert">{serverError}</div>}
        <label>Email<input type="email" autoComplete="email" {...register('email')} />{errors.email && <small>{errors.email.message}</small>}</label>
        <label>Password<input type="password" autoComplete="current-password" {...register('password')} />{errors.password && <small>{errors.password.message}</small>}</label>
        <button className="primary-button" disabled={isSubmitting}>{isSubmitting ? 'Signing in…' : 'Sign in'}<ArrowRight size={18} /></button>
      </form>
      <div className="auth-links"><Link to="/recovery">Forgot password?</Link><Link to="/register">Create account</Link></div>
    </AuthLayout>
  )
}

export function RegisterPage() {
  const navigate = useNavigate()
  const [serverError, setServerError] = useState('')
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<RegisterFields>({ resolver: zodResolver(registerSchema) })
  const submit = async (values: RegisterFields) => {
    setServerError('')
    try {
      await api('/api/v1/auth/register', { method: 'POST', body: jsonBody(values) })
      await navigate('/login', { replace: true })
    } catch (error) {
      setServerError(error instanceof Error ? error.message : 'Registration failed')
    }
  }
  return (
    <AuthLayout title="Create your account" intro="Use at least 12 characters; a passphrase works well.">
      <form onSubmit={(event) => void handleSubmit(submit)(event)} className="form-stack" noValidate>
        {serverError && <div className="form-error" role="alert">{serverError}</div>}
        <label>Email<input type="email" autoComplete="email" {...register('email')} />{errors.email && <small>{errors.email.message}</small>}</label>
        <label>Username<input autoComplete="username" {...register('username')} />{errors.username && <small>{errors.username.message}</small>}</label>
        <label>Password<input type="password" autoComplete="new-password" {...register('password')} />{errors.password && <small>{errors.password.message}</small>}</label>
        <button className="primary-button" disabled={isSubmitting}>Create account<ArrowRight size={18} /></button>
      </form>
      <div className="auth-links"><span>Already registered?</span><Link to="/login">Sign in</Link></div>
    </AuthLayout>
  )
}

export function RecoveryPage() {
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState('')
  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    await api('/api/v1/auth/recovery/request', { method: 'POST', body: jsonBody({ email }) })
    setMessage('If the account exists, recovery instructions will be sent.')
  }
  return (
    <AuthLayout title="Recover access" intro="We return the same response whether an account exists or not.">
      <form onSubmit={(event) => void submit(event)} className="form-stack">
        {message && <div className="success-note" role="status">{message}</div>}
        <label>Email<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} /></label>
        <button className="primary-button"><LockKeyhole size={18} />Request recovery</button>
      </form>
      <div className="auth-links"><Link to="/login">Back to sign in</Link></div>
    </AuthLayout>
  )
}
