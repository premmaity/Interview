import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Activity, ExternalLink, Plus, Power, RefreshCw, Server, Trash2 } from 'lucide-react'
import { useState, type FormEvent } from 'react'

import { ErrorState, LoadingState } from '../../components/States'
import { api, jsonBody } from '../../lib/api'
import type { KeepAliveProject, KeepAliveProjectList } from '../../types'

function pingLabel(project: KeepAliveProject): string {
  if (!project.enabled) return 'Paused'
  if (project.last_error) return 'Retrying'
  if (project.last_ping_at === null) return 'Starting…'
  if (project.last_status_code !== null && project.last_status_code >= 500) return 'Target error'
  return 'Live'
}

function lastPing(project: KeepAliveProject): string {
  if (project.last_ping_at === null) return 'Waiting for first ping'
  return `Last ping ${new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(project.last_ping_at))}`
}

export function KeepAlivePage() {
  const queryClient = useQueryClient()
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const projects = useQuery({
    queryKey: ['keepalive-projects'],
    queryFn: () => api<KeepAliveProjectList>('/api/v1/keepalive-projects'),
    refetchInterval: 30_000,
  })

  const createProject = useMutation({
    mutationFn: () => api<KeepAliveProject>('/api/v1/keepalive-projects', {
      method: 'POST',
      body: jsonBody({ name, url }),
    }),
    onSuccess: () => {
      setName('')
      setUrl('')
      void queryClient.invalidateQueries({ queryKey: ['keepalive-projects'] })
    },
  })

  const toggleProject = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      api<KeepAliveProject>(`/api/v1/keepalive-projects/${id}`, {
        method: 'PATCH',
        body: jsonBody({ enabled }),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData<KeepAliveProjectList>(['keepalive-projects'], (current) => ({
        items: (current?.items ?? []).map((item) => item.id === updated.id ? updated : item),
      }))
    },
  })

  const deleteProject = useMutation({
    mutationFn: (id: string) => api<void>(`/api/v1/keepalive-projects/${id}`, {
      method: 'DELETE',
    }),
    onSuccess: (_, id) => {
      queryClient.setQueryData<KeepAliveProjectList>(['keepalive-projects'], (current) => ({
        items: (current?.items ?? []).filter((item) => item.id !== id),
      }))
    },
  })

  const submit = (event: FormEvent) => {
    event.preventDefault()
    createProject.mutate()
  }

  if (projects.isLoading) return <LoadingState label="Loading Render projects" />
  if (projects.error) {
    return <ErrorState error={projects.error} onRetry={() => void projects.refetch()} />
  }

  const items = projects.data?.items ?? []
  const active = items.filter((project) => project.enabled).length

  return (
    <div className="page-stack keepalive-page">
      <header className="page-header">
        <div>
          <p className="eyebrow">Render keep alive</p>
          <h1>Keep selected services warm.</h1>
          <p>Add a public Render URL, then turn it on. Active projects receive an HTTP ping every ten minutes.</p>
        </div>
        <div className="keepalive-summary" aria-label={`${active} active projects`}>
          <Activity size={20} />
          <strong>{active}</strong>
          <span>active</span>
        </div>
      </header>

      <section className="panel keepalive-form-panel">
        <div>
          <p className="eyebrow">Add a service</p>
          <h2>Render project details</h2>
        </div>
        <form className="keepalive-form" onSubmit={submit}>
          <label>
            Project name
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="My API"
              maxLength={120}
              required
            />
          </label>
          <label>
            Render link
            <input
              type="url"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://my-api.onrender.com/health"
              required
            />
          </label>
          <button className="primary-button" disabled={createProject.isPending}>
            {createProject.isPending ? <RefreshCw className="spin" size={18} /> : <Plus size={18} />}
            {createProject.isPending ? 'Adding…' : 'Add project'}
          </button>
        </form>
        {createProject.error && <div className="form-error" role="alert">{createProject.error.message}</div>}
        <p className="keepalive-note">
          Only public HTTPS <code>*.onrender.com</code> links are accepted. Keeping services active consumes their Render free-instance hours.
        </p>
      </section>

      <section className="panel">
        <div className="panel-heading">
          <div>
            <p className="eyebrow">Your projects</p>
            <h2>Ping controls</h2>
          </div>
          <span className="muted">Auto-refreshes every 30 seconds</span>
        </div>
        {items.length === 0 ? (
          <div className="empty-state">
            <Server size={36} />
            <h3>No Render projects yet</h3>
            <p>Add a project above. It stays paused until you switch it on.</p>
          </div>
        ) : (
          <div className="keepalive-list">
            {items.map((project) => {
              const toggling = toggleProject.isPending && toggleProject.variables?.id === project.id
              const deleting = deleteProject.isPending && deleteProject.variables === project.id
              return (
                <article key={project.id} className={project.enabled ? 'enabled' : ''}>
                  <div className="keepalive-project-icon"><Server size={20} /></div>
                  <div className="keepalive-project-copy">
                    <div>
                      <h3>{project.name}</h3>
                      <span className={`keepalive-state ${project.enabled ? 'enabled' : ''}`}>
                        {pingLabel(project)}
                      </span>
                    </div>
                    <a href={project.url} target="_blank" rel="noreferrer">
                      {project.url}<ExternalLink size={14} />
                    </a>
                    <small>{lastPing(project)}{project.last_status_code ? ` · HTTP ${project.last_status_code}` : ''}</small>
                    {project.last_error && <small className="keepalive-error">{project.last_error}</small>}
                  </div>
                  <div className="keepalive-controls">
                    <button
                      type="button"
                      className={`keepalive-toggle ${project.enabled ? 'on' : ''}`}
                      role="switch"
                      aria-checked={project.enabled}
                      aria-label={`${project.enabled ? 'Pause' : 'Keep alive'} ${project.name}`}
                      disabled={toggling || deleting}
                      onClick={() => toggleProject.mutate({ id: project.id, enabled: !project.enabled })}
                    >
                      <span><Power size={15} /></span>
                      {project.enabled ? 'On' : 'Off'}
                    </button>
                    <button
                      type="button"
                      className="icon-button danger"
                      aria-label={`Delete ${project.name}`}
                      disabled={toggling || deleting}
                      onClick={() => deleteProject.mutate(project.id)}
                    >
                      {deleting ? <RefreshCw className="spin" size={17} /> : <Trash2 size={17} />}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
        {(toggleProject.error || deleteProject.error) && (
          <div className="form-error" role="alert">
            {(toggleProject.error ?? deleteProject.error)?.message}
          </div>
        )}
      </section>
    </div>
  )
}
