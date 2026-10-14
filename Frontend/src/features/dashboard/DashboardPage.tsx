import { useQuery } from '@tanstack/react-query'
import { ArrowRight, CheckCircle2, Clock3, Plus, TrendingUp } from 'lucide-react'
import { Link } from 'react-router-dom'

import { ErrorState, LoadingState } from '../../components/States'
import { api } from '../../lib/api'
import type { InterviewList } from '../../types'

export function DashboardPage() {
  const sessions = useQuery({ queryKey: ['interviews'], queryFn: () => api<InterviewList>('/api/v1/interviews?limit=6') })
  if (sessions.isLoading) return <LoadingState label="Loading your practice history" />
  if (sessions.error) return <ErrorState error={sessions.error} onRetry={() => void sessions.refetch()} />
  const items = sessions.data?.items ?? []
  const completed = items.filter((item) => item.status === 'completed').length
  const active = items.filter((item) => item.status === 'active').length
  return (
    <div className="page-stack">
      <header className="page-header"><div><p className="eyebrow">Practice workspace</p><h1>Make the next answer sharper.</h1><p>Pick up where you left off or start a round around today’s weakest signal.</p></div><Link className="primary-button" to="/app/interviews/new"><Plus size={18} />Start interview</Link></header>
      <section className="stat-grid" aria-label="Practice summary"><article><Clock3 /><div><strong>{active}</strong><span>Active sessions</span></div></article><article><CheckCircle2 /><div><strong>{completed}</strong><span>Recently completed</span></div></article><article><TrendingUp /><div><strong>{completed >= 2 ? 'Building' : 'Pending'}</strong><span>Score trend</span></div></article></section>
      <section className="panel"><div className="panel-heading"><div><p className="eyebrow">Recent rounds</p><h2>Your interview history</h2></div><Link to="/app/history">View all<ArrowRight size={16} /></Link></div>
        {items.length === 0 ? <div className="empty-state"><h3>No practice data yet</h3><p>Create a focused interview. Your progress and reports will appear here.</p><Link className="secondary-button" to="/app/interviews/new">Configure a round</Link></div> : <div className="session-list">{items.map((item) => <Link key={item.id} to={item.status === 'completed' ? `/app/interviews/${item.id}/report` : `/app/interviews/${item.id}`}><div><strong>{item.target_role}</strong><span>{item.round_type.replace('_', ' ')} · {item.difficulty}</span></div><div className={`status-pill ${item.status}`}>{item.status}</div><ArrowRight size={17} /></Link>)}</div>}
      </section>
      <section className="two-column"><article className="panel soft"><p className="eyebrow">Weak topics</p><h2>Evidence arrives after two reports</h2><p>We wait for enough practice data before presenting a trend. One score is a moment, not a pattern.</p></article><article className="panel dark"><p className="eyebrow">Practice cue</p><h2>Name the trade-off.</h2><p>Strong answers do more than choose an approach: they explain what the choice costs and what would change the decision.</p></article></section>
    </div>
  )
}

