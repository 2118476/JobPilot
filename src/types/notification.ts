export interface Notification {
  id: string
  user_id: string
  type: 'job_found' | 'score_ready' | 'cv_ready' | 'interview_reminder' | 'application_deadline' | 'weekly_report' | 'system' | 'match_alert'
  title: string
  message: string
  read: boolean
  action_url?: string
  related_job_id?: string
  created_at: string
}

export interface WeeklyReport {
  id: string
  user_id: string
  week_start: string
  week_end: string
  jobs_found: number
  jobs_saved: number
  applications_sent: number
  interviews_scheduled: number
  responses_received: number
  average_match_score: number
  top_job_ids: string[]
  skill_gap_summary: string
  recommendations: string[]
  created_at: string
}
