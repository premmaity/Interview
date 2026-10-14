import { useQuery } from '@tanstack/react-query'
import { ArrowRight } from 'lucide-react'
import { Link } from 'react-router-dom'

import { ErrorState, LoadingState } from '../../components/States'
import { api } from '../../lib/api'
import type { InterviewList } from '../../types'

export function HistoryPage() {
  const query = useQuery({ queryKey: ['interviews', 'history'], queryFn: () => api<InterviewList>('/api/v1/interviews?limit=100') })
  if (query.isLoading) return <LoadingState />
  if (query.error) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  return <div className="page-stack"><header className="page-header"><div><p className="eyebrow">History</p><h1>Every completed turn, still here.</h1><p>Resume unfinished rounds, review reports, or delete a session from its detail page.</p></div></header><section className="panel">{query.data?.items.length ? <div className="session-list">{query.data.items.map((item) => <Link key={item.id} to={item.status === 'completed' ? `/app/interviews/${item.id}/report` : `/app/interviews/${item.id}`}><div><strong>{item.target_role}</strong><span>{new Date(item.created_at).toLocaleDateString()} · {item.question_count} questions</span></div><div className={`status-pill ${item.status}`}>{item.status}</div><ArrowRight size={17} /></Link>)}</div> : <div className="empty-state"><h3>No sessions</h3><p>Your interview history is empty.</p></div>}</section></div>
}
