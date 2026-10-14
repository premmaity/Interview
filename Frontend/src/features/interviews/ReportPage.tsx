import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle2, CircleAlert, Gauge, Lightbulb, RefreshCw } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'

import { ErrorState, LoadingState } from '../../components/States'
import { api } from '../../lib/api'
import type { Report } from '../../types'

export function ReportPage() {
  const { id = '' } = useParams()
  const report = useQuery({ queryKey: ['report', id], queryFn: () => api<Report>(`/api/v1/interviews/${id}/report`), retry: 2 })
  if (report.isLoading) return <LoadingState label="Loading your report" />
  if (report.error || !report.data) return <ErrorState error={report.error ?? new Error('Report unavailable')} onRetry={() => void report.refetch()} />
  const data = report.data
  return <div className="page-stack report-page"><header className="page-header report-header"><div><Link className="back-link" to="/app/history"><ArrowLeft size={16} />History</Link><p className="eyebrow">Completed report</p><h1>Your evidence, organized.</h1><p>{data.disclaimer}</p></div><div className="overall-score" aria-label={`Overall coaching score ${data.overall_score} out of 100`}><span>{Math.round(data.overall_score)}</span><small>overall / 100</small></div></header><section className="score-grid" aria-label="Category scores">{Object.entries(data.category_scores).map(([name, score]) => <article key={name}><div><Gauge size={18} /><span>{name}</span></div><strong>{Math.round(score)}</strong><progress value={score} max="100" aria-label={`${name} score`} /></article>)}</section><section className="two-column"><article className="panel"><p className="eyebrow"><CheckCircle2 size={15} />Strengths</p><ul className="insight-list">{data.strengths.map((item) => <li key={item}>{item}</li>)}</ul></article><article className="panel"><p className="eyebrow"><CircleAlert size={15} />Gaps</p><ul className="insight-list gaps">{data.gaps.map((item) => <li key={item}>{item}</li>)}</ul></article></section><section className="panel"><div className="panel-heading"><div><p className="eyebrow">Answer review</p><h2>Feedback tied to each response</h2></div></div><div className="feedback-list">{data.answer_feedback.map((item, index) => <article key={item.answer_id ?? index}><header><span>Answer {index + 1}</span><strong>{Math.round(item.overall_score)}/100</strong></header><div className="feedback-columns"><div><h3>Evidence</h3><ul>{item.evidence.map((line) => <li key={line}>{line}</li>)}</ul><h3>Improve next</h3><ul>{item.improvement_advice.map((line) => <li key={line}>{line}</li>)}</ul></div><div className="outline"><Lightbulb size={19} /><h3>Stronger outline</h3><p>{item.suggested_answer}</p><small>Confidence: {Math.round(item.confidence * 100)}%{item.confidence < 0.7 ? ' · Evidence was limited' : ''}</small></div></div></article>)}</div></section><section className="panel practice-plan"><div><p className="eyebrow">Three-day reset</p><h2>Turn gaps into another attempt.</h2></div><ol>{data.practice_plan.map((item) => <li key={item}>{item}</li>)}</ol><Link className="primary-button" to="/app/interviews/new"><RefreshCw size={17} />Practice again</Link></section></div>
}
