export interface Job {
  id: string
  user_id: string
  title: string
  company: string
  location: string
  remote_type: 'remote' | 'onsite' | 'hybrid' | 'unknown'
  salary_min?: number
  salary_max?: number
  salary_currency?: string
  description: string
  requirements: string[]
  responsibilities: string[]
  source: string
  source_url: string
  posted_date?: string
  job_type: 'full_time' | 'part_time' | 'contract' | 'freelance' | 'internship'
  status: 'new' | 'saved' | 'cv_drafted' | 'cl_drafted' | 'ready_to_apply' | 'applied' | 'interview' | 'technical_test' | 'rejected' | 'offer' | 'closed' | 'withdrawn' | 'skipped'
  match_score: number
  match_analysis?: MatchAnalysis
  created_at: string
  updated_at: string
  // ── User pipeline state (persisted via PATCH /api/jobs/:id) ──
  saved?: boolean
  skipped?: boolean
  notes?: string
  applied_date?: string
  next_action?: string
  next_action_date?: string
  reminder_date?: string
  reminder_set?: boolean
  checklist?: Record<string, boolean>
}

export interface MatchAnalysis {
  id: string
  job_id: string
  overall_score: number
  skill_match_score: number
  experience_match_score: number
  location_match_score: number
  salary_match_score: number
  explanation: string
  matched_skills: string[]
  missing_skills: string[]
  skill_gaps: SkillGap[]
  created_at: string
}

export interface SkillGap {
  skill: string
  required_level: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  user_level?: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  gap_description: string
}

export interface SearchSettings {
  id: string
  user_id: string
  keywords: string[]
  exclusions: string[]
  preferred_locations: string[]
  remote_preference: 'remote' | 'onsite' | 'hybrid' | 'no_preference'
  salary_min?: number
  salary_max?: number
  currency: string
  job_types: string[]
  sources: string[]
  frequency: 'realtime' | 'daily' | 'weekly'
  search_active: boolean
  next_search_at?: string
  created_at: string
  updated_at: string
}
