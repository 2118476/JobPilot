export interface UserProfile {
  id: string
  user_id: string
  full_name: string
  email: string
  avatar_url?: string
  headline?: string
  summary?: string
  location?: string
  phone?: string
  website?: string
  linkedin_url?: string
  github_url?: string
  years_experience?: number
  preferred_role?: string
  preferred_location?: string
  remote_preference: 'remote' | 'onsite' | 'hybrid' | 'no_preference'
  salary_min?: number
  salary_max?: number
  currency?: string
  notice_period_days?: number
  created_at: string
  updated_at: string
}

export interface Education {
  id: string
  profile_id: string
  institution: string
  degree: string
  field_of_study: string
  start_date: string
  end_date?: string
  current: boolean
  description?: string
  created_at: string
}

export interface WorkExperience {
  id: string
  profile_id: string
  company: string
  title: string
  location?: string
  start_date: string
  end_date?: string
  current: boolean
  description?: string
  achievements?: string[]
  created_at: string
}

export interface Skill {
  id: string
  profile_id: string
  name: string
  category: 'technical' | 'soft' | 'language' | 'tool' | 'domain'
  proficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert'
  years_experience?: number
  created_at: string
}

export interface Certification {
  id: string
  profile_id: string
  name: string
  issuer: string
  issue_date: string
  expiry_date?: string
  credential_url?: string
  created_at: string
}
