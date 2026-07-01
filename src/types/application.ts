export interface Application {
  id: string
  user_id: string
  job_id: string
  status: 'saved' | 'cv_drafted' | 'cl_drafted' | 'ready_to_apply' | 'applied' | 'interview' | 'technical_test' | 'rejected' | 'offer' | 'closed' | 'withdrawn'
  applied_date?: string
  cv_version_id?: string
  cover_letter_id?: string
  notes?: string
  next_action?: string
  next_action_date?: string
  interviews: Interview[]
  communications: Communication[]
  created_at: string
  updated_at: string
}

export interface Interview {
  id: string
  application_id: string
  type: 'phone_screen' | 'technical' | 'behavioral' | 'cultural' | 'final' | 'assessment'
  scheduled_date: string
  duration_minutes?: number
  interviewer_name?: string
  interviewer_email?: string
  location?: string
  notes?: string
  status: 'scheduled' | 'completed' | 'cancelled' | 'no_show'
  feedback?: string
  rating?: number
  created_at: string
  updated_at: string
}

export interface Communication {
  id: string
  application_id: string
  type: 'email' | 'phone' | 'meeting' | 'rejection' | 'offer'
  direction: 'inbound' | 'outbound'
  subject?: string
  content?: string
  sent_at: string
  created_at: string
}
