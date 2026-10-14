import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { ArrowRight, Headphones, Keyboard } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { z } from 'zod'

import { api, jsonBody } from '../../lib/api'
import type { Interview } from '../../types'

const schema = z.object({
  target_role: z.string().min(1).max(120),
  seniority: z.string().min(1).max(40),
  round_type: z.enum(['technical', 'behavioral', 'system_design', 'mixed', 'custom']),
  difficulty: z.enum(['easy', 'medium', 'hard']),
  question_count: z.number().min(1).max(20),
  input_mode: z.enum(['text', 'voice']),
  custom_focus: z.string().max(1000).optional(),
})
type Fields = z.infer<typeof schema>

export function NewInterviewPage() {
  const navigate = useNavigate()
  const { register, handleSubmit, watch, formState: { errors } } = useForm<Fields>({ resolver: zodResolver(schema), defaultValues: { seniority: 'mid', round_type: 'technical', difficulty: 'medium', question_count: 5, input_mode: 'text' } })
  const mode = watch('input_mode')
  const mutation = useMutation({ mutationFn: async (values: Fields) => {
    const created = await api<Interview>('/api/v1/interviews', { method: 'POST', body: jsonBody({ ...values, custom_focus: values.custom_focus || null }) })
    return api<Interview>(`/api/v1/interviews/${created.id}/start`, { method: 'POST' })
  }, onSuccess: (session) => void navigate(`/app/interviews/${session.id}`) })
  return <div className="page-stack narrow"><header className="page-header"><div><p className="eyebrow">Configure a round</p><h1>Choose what pressure to rehearse.</h1><p>The server owns the question count and lifecycle. The model only supplies validated content.</p></div></header><section className="panel form-panel"><form className="form-grid" onSubmit={(event) => void handleSubmit((values) => mutation.mutateAsync(values))(event)}><label className="full">Target role<input placeholder="Backend engineer" autoFocus {...register('target_role')} />{errors.target_role && <small>{errors.target_role.message}</small>}</label><label>Seniority<select {...register('seniority')}><option value="entry">Entry</option><option value="mid">Mid-level</option><option value="senior">Senior</option><option value="staff">Staff / lead</option></select></label><label>Round<select {...register('round_type')}><option value="technical">Technical</option><option value="behavioral">Behavioral / HR</option><option value="system_design">System design</option><option value="mixed">Mixed</option><option value="custom">Custom focus</option></select></label><label>Difficulty<select {...register('difficulty')}><option value="easy">Foundational</option><option value="medium">Applied</option><option value="hard">Stretch</option></select></label><label>Questions<input type="number" min="1" max="20" {...register('question_count', { valueAsNumber: true })} /></label><fieldset className="full mode-picker"><legend>Answer mode</legend><label className={mode === 'text' ? 'selected' : ''}><input type="radio" value="text" {...register('input_mode')} /><Keyboard /> <span><strong>Text</strong><small>Universal and distraction-free</small></span></label><label className={mode === 'voice' ? 'selected' : ''}><input type="radio" value="voice" {...register('input_mode')} /><Headphones /><span><strong>Voice + transcript</strong><small>Text remains available at every step</small></span></label></fieldset><label className="full">Optional focus<textarea rows={3} placeholder="e.g. distributed caching and incident response" {...register('custom_focus')} /></label>{mutation.error && <div className="form-error full" role="alert">{mutation.error.message}</div>}<button className="primary-button" disabled={mutation.isPending}>{mutation.isPending ? 'Preparing your first question…' : 'Begin interview'}<ArrowRight size={18} /></button></form></section></div>
}
