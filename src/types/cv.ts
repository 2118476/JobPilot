export interface MasterCV {
  id: string
  user_id: string
  full_name: string
  email: string
  phone?: string
  location?: string
  linkedin_url?: string
  github_url?: string
  website?: string
  summary: string
  skills: string[]
  experiences: CVExperience[]
  educations: CVEducation[]
  projects: CVProject[]
  certifications: string[]
  created_at: string
  updated_at: string
}

export interface CVExperience {
  id: string
  company: string
  title: string
  location?: string
  start_date: string
  end_date?: string
  current: boolean
  description: string
  highlights: string[]
}

export interface CVEducation {
  id: string
  institution: string
  degree: string
  field_of_study: string
  start_date: string
  end_date?: string
  current: boolean
  description?: string
}

export interface CVProject {
  id: string
  name: string
  description: string
  technologies: string[]
  url?: string
  highlights: string[]
}

export interface TailoredCV {
  id: string
  user_id: string
  job_id: string
  master_cv_id: string
  version_name: string
  custom_summary: string
  selected_skills: string[]
  selected_experiences: string[]
  selected_projects: string[]
  tailored_content: string
  cover_letter?: CoverLetter
  created_at: string
  updated_at: string
}

export interface CoverLetter {
  id: string
  tailored_cv_id: string
  job_id: string
  user_id: string
  content: string
  tone: 'professional' | 'enthusiastic' | 'formal'
  created_at: string
  updated_at: string
}

export interface CVVersion {
  id: string
  cv_id: string
  version_number: number
  content: string
  notes?: string
  created_at: string
}
