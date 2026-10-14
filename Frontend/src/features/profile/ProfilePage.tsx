import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Save } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

import { ErrorState, LoadingState } from '../../components/States'
import { api, jsonBody } from '../../lib/api'
import type { Profile } from '../../types'

const schema = z.object({
  target_role: z.string().min(1).max(120),
  seniority: z.string().min(1).max(40),
  years_experience: z.number().min(0).max(80),
  skills_text: z.string().max(1000),
  preferred_language: z.string().min(2).max(40),
  job_description: z.string().max(20000).optional(),
})
type Fields = z.infer<typeof schema>

export function ProfilePage() {
  const client = useQueryClient()
  const [saved, setSaved] = useState(false)
  const profile = useQuery({ queryKey: ['profile'], queryFn: () => api<Profile>('/api/v1/profile') })
  const { register, reset, handleSubmit, formState: { errors } } = useForm<Fields>({ resolver: zodResolver(schema) })
  useEffect(() => {
    if (profile.data) reset({ ...profile.data, skills_text: profile.data.skills.join(', '), job_description: profile.data.job_description ?? '' })
  }, [profile.data, reset])
  const mutation = useMutation({
    mutationFn: (values: Fields) => api<Profile>('/api/v1/profile', { method: 'PUT', body: jsonBody({ ...values, skills: values.skills_text.split(',').map((value) => value.trim()).filter(Boolean), skills_text: undefined, job_description: values.job_description || null }) }),
    onSuccess: (data) => { client.setQueryData(['profile'], data); setSaved(true) },
  })
  if (profile.isLoading) return <LoadingState label="Loading profile" />
  if (profile.error) return <ErrorState error={profile.error} />
  return <div className="page-stack"><header className="page-header"><div><p className="eyebrow">Candidate context</p><h1>Tell the coach what you’re aiming for.</h1><p>This context shapes questions. Resume upload is disabled until malware scanning and object storage are configured.</p></div></header><section className="panel form-panel"><form className="form-grid" onSubmit={(event) => void handleSubmit((values) => mutation.mutateAsync(values))(event)}><label>Target role<input {...register('target_role')} />{errors.target_role && <small>{errors.target_role.message}</small>}</label><label>Seniority<select {...register('seniority')}><option value="entry">Entry</option><option value="mid">Mid-level</option><option value="senior">Senior</option><option value="staff">Staff / lead</option></select></label><label>Years of experience<input type="number" min="0" max="80" {...register('years_experience', { valueAsNumber: true })} /></label><label>Preferred language<input {...register('preferred_language')} /></label><label className="full">Skills, separated by commas<input {...register('skills_text')} placeholder="Python, APIs, PostgreSQL" /></label><label className="full">Job description context<textarea rows={8} {...register('job_description')} /><small>Untrusted context is delimited and treated as data by the model.</small></label>{mutation.error && <div className="form-error full" role="alert">{mutation.error.message}</div>}{saved && <div className="success-note full" role="status">Profile saved.</div>}<button className="primary-button" disabled={mutation.isPending}><Save size={18} />{mutation.isPending ? 'Saving…' : 'Save profile'}</button></form></section></div>
}
