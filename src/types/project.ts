export interface Project {
  id: string
  user_id: string
  name: string
  description: string
  short_description?: string
  technologies: string[]
  github_url?: string
  live_url?: string
  image_url?: string
  category: 'personal' | 'professional' | 'open_source' | 'academic'
  relevance_score?: number
  relevance_tags: string[]
  highlights: string[]
  start_date?: string
  end_date?: string
  current: boolean
  featured: boolean
  created_at: string
  updated_at: string
}
