export type InterviewStatus = 'created' | 'active' | 'evaluating' | 'completed' | 'abandoned' | 'failed'
export type RoundType = 'technical' | 'behavioral' | 'system_design' | 'mixed' | 'custom'
export type Difficulty = 'easy' | 'medium' | 'hard'
export type InputMode = 'text' | 'voice'

export interface User {
  id: string
  email: string
  username: string | null
  created_at: string
}

export interface Profile {
  id: string
  target_role: string
  seniority: string
  years_experience: number
  skills: string[]
  preferred_language: string
  job_description: string | null
  resume_reference: string | null
}

export interface Question {
  id: string
  sequence: number
  question_type: RoundType
  text: string
  rubric_tags: string[]
}

export interface Answer {
  id: string
  question_id: string
  text: string
  source_mode: InputMode
  submitted_at: string
}

export interface Interview {
  id: string
  status: InterviewStatus
  target_role: string
  seniority: string
  round_type: RoundType
  difficulty: Difficulty
  input_mode: InputMode
  question_count: number
  current_question_number: number
  created_at: string
  started_at: string | null
  completed_at: string | null
  current_question: Question | null
  questions: Question[]
  answers: Answer[]
}

export interface InterviewList {
  items: Interview[]
  next_cursor: string | null
}

export interface Evaluation {
  answer_id: string | null
  overall_score: number
  category_scores: Record<string, number>
  evidence: string[]
  strengths: string[]
  gaps: string[]
  improvement_advice: string[]
  suggested_answer: string
  confidence: number
}

export interface Report {
  session_id: string
  status: InterviewStatus
  overall_score: number
  category_scores: Record<string, number>
  answer_feedback: Evaluation[]
  strengths: string[]
  gaps: string[]
  recommended_topics: string[]
  practice_plan: string[]
  disclaimer: string
}

