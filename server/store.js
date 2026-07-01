// ─────────────────────────────────────────────────────────────
// store.js — tiny JSON-file persistence + canonical profile seed
// No native deps (works everywhere). Swap for SQLite/Postgres later.
// ─────────────────────────────────────────────────────────────
import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { supabaseConfigured } from './supabaseAdmin.js'
import * as db from './db.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')

async function ensureDir() {
  if (!existsSync(DATA_DIR)) await mkdir(DATA_DIR, { recursive: true })
}

async function readJson(name, fallback) {
  try {
    const raw = await readFile(path.join(DATA_DIR, name), 'utf8')
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

async function writeJson(name, data) {
  await ensureDir()
  await writeFile(path.join(DATA_DIR, name), JSON.stringify(data, null, 2), 'utf8')
}

// ─── Canonical candidate profile (the real junior-grad profile) ───
export const defaultProfile = {
  full_name: 'Mihretab Nega',
  email: 'mihretabtesfahun2124@gmail.com',
  phone: '07388 617 329',
  website: 'mihretab.org',
  linkedin: '',
  github: 'github.com/2118476',
  location: 'London, W3',
  headline: 'Junior Software Developer | Java & React | ITIL 4 (studying)',
  summary:
    'Junior Software Developer with strong experience in full-stack Java and React development, now expanding into .NET, cloud technologies and IT Service Management. Delivered real-world projects involving APIs, SQL databases and cloud deployment, with a focus on usability, debugging and performance. Currently studying ITIL 4 Foundation to formalise service management knowledge. A quick learner with an agile mindset, strong problem-solving skills and a commitment to delivering high-quality digital services with real impact.',
  education: [
    {
      institution: 'Brunel University London',
      degree: 'BSc Computer Science',
      dates: 'Sept 2021 – June 2024',
      note: 'Modules: Software Development, Algorithms, Cybersecurity, AI, Networking. Final Year Project: Hair Salon Booking System.',
    },
    {
      institution: 'Newham College of Further Education',
      degree: 'Access to HE Diploma (Electronics & Software Engineering)',
      dates: 'Sept 2020 – June 2021',
      note: 'Distinctions in Programming, Project Management and Web Design.',
    },
  ],
  // Recent graduate — experience is project-based (see projects). No salaried dev role yet.
  experience: [],
  skills: {
    'Languages & Frameworks': ['Java', 'Spring Boot', 'React.js', 'JavaScript', 'SQL', 'C# (learning)', 'ASP.NET (learning)'],
    'Databases': ['MySQL', 'PostgreSQL', 'SQL Server'],
    'APIs & Cloud': ['REST APIs', 'Twilio (SMS & Voice)', 'Azure DevOps (learning)'],
    'Deployment & Tools': ['Git', 'GitHub', 'Docker', 'Render', 'Vercel', 'Netlify', 'CI/CD (learning)'],
    'Development Concepts': ['OOP', 'MVC', 'Agile/Scrum', 'Microservices', 'Authentication', 'Version control'],
    'Debugging & Testing': ['IntelliJ', 'VS Code', 'Postman', 'SonarCloud', 'API testing'],
    'IT Service Management': ['ITIL 4 Foundation (studying)', 'Incident Management concepts', 'Service Desk principles'],
  },
  projects: [
    {
      name: 'MMS — SMS & Voice Call Web App',
      year: '2025',
      tech: ['React', 'Spring Boot', 'MySQL', 'Twilio', 'Render', 'Vercel'],
      detail: 'Full-stack communication app to send SMS, make and receive calls, and track call history. Integrated Twilio APIs with dynamic callback URLs for both local and deployed environments, built backend call routing with TwiML and server-side error handling, and designed a responsive UI with accessibility, dark mode and animated feedback.',
    },
    {
      name: 'Hair Salon Booking System (Final Year Project)',
      year: '2024',
      tech: ['Java', 'Spring Boot', 'MySQL'],
      detail: 'Secure appointment booking platform with admin/user roles and login authentication. Designed and optimised relational database schemas for performance, applying clean architecture and modular code practices.',
    },
    {
      name: 'E-Learning Platform — "Coding for All" (Group Project)',
      year: '2023',
      tech: ['React', 'Spring Boot', 'MySQL'],
      detail: 'Coding-lesson web app built as a team using agile methodology. Developed multiple frontend components and API integrations, and contributed to sprint planning and a collaborative Git workflow.',
    },
  ],
  certifications_in_progress: [
    {
      name: 'ITIL 4 Foundation',
      issuer: 'AXELOS / PeopleCert',
      status: 'studying',
      expected: '2026',
      note: 'Actively studying the ITIL 4 Foundation syllabus. Exam not yet taken — certificate pending.',
    },
  ],
  preferences: {
    titles: [
      'Junior Software Developer', 'Graduate Developer', 'Junior Java Developer',
      'Junior Full-Stack Developer', 'Junior React Developer', '.NET Developer',
      'Application Support Analyst', 'Service Desk Analyst', 'IT Support Analyst',
      'Civil Service Digital Developer', 'Public Sector Developer',
    ],
    seniority: ['Entry-level', 'Graduate', 'Junior'],
    locations: ['London', 'Remote (UK)', 'Hybrid'],
    salary_min: 25000,
    salary_max: 45000,
    currency: 'GBP',
    avoid: ['Senior', 'Lead', 'Principal', 'Staff', 'Manager', '5+ years'],
  },
  goals: 'Advance skills in C# and ASP.NET, complete ITIL 4 Foundation certification, and grow from junior into a well-rounded full-stack software developer building high-quality digital services — including in the public sector.',
  skills_to_learn: ['C#', 'ASP.NET', 'Azure DevOps', 'CI/CD', 'ITIL 4 Foundation (exam pending)'],
  additional: {
    volunteering: 'National Citizen Service (NCS) — team projects & video editing',
    languages: ['English (fluent)', 'Amharic (fluent)', 'Tigrinya (basic)'],
    interests: ['Football', 'Gym', 'AI experimentation'],
  },
}

// ─── Second career track: Construction Site Operative ────────
// Same person, different career hat. CPCS Blue card holder for Traffic
// Marshal + Hoist Operator since August 2020. Modelled on the SAME schema
// as the tech profile so every AI feature (scoring, CV/cover tailoring,
// coach, interview prep) works for it with zero extra code.
export const constructionProfile = {
  full_name: 'Mihretab Nega',
  email: 'mihretabtesfahun2124@gmail.com',
  phone: '07388 617 329',
  website: 'mihretab.org',
  linkedin: '',
  github: '',
  location: 'Acton, West London',
  headline: 'Hoist Operator | Traffic Marshal | Banksman | CPCS Blue Card (since Aug 2020)',
  summary:
    'Reliable and safety-driven construction site operative with hands-on experience as a Hoist Driver and Traffic Marshal/Banksman. Holds a CPCS Blue (Competent Operator) card for Traffic Marshal and Hoist Operator, held since August 2020. Proven track record coordinating plant movements, managing gatehouse and traffic flow, and delivering clear radio and hand-signal communication on busy London construction sites. Calm under pressure, punctual, and focused on maintaining a clean, compliant work area. Available for day or night shifts with immediate start.',
  education: [
    {
      institution: 'Brunel University London',
      degree: 'BSc (Hons) Computer Science',
      dates: 'Sept 2021 – June 2024',
      note: '',
    },
  ],
  // Real, dated site work — this is genuine employment history.
  experience: [
    {
      role: 'Hoist Driver / Hoist Operator',
      company: 'Various Construction Sites — London',
      dates: '2024 – 2025',
      detail:
        'Operated passenger and goods hoists, adhering strictly to load limits and safe travel procedures. Performed pre-use inspections, reported defects and coordinated with site management for timely fixes. Managed queues and ensured safe access and egress for trades, maintaining clear radio communication throughout.',
    },
    {
      role: 'Traffic Marshal / Banksman',
      company: 'Construction Sites — West London',
      dates: '2020 – 2025',
      detail:
        'Directed vehicle and plant movements using standard hand-signals and maintained exclusion zones. Controlled deliveries at the gatehouse, checked paperwork and kept accurate daily movement logs. Supported loading bay operations, liaising with drivers and trades to reduce waiting times and keep the site moving safely.',
    },
  ],
  skills: {
    'Plant & Hoist Operations': ['Passenger & goods hoist operation', 'Pre-use inspections', 'Load limits & safe travel', 'Loading bay & delivery coordination'],
    'Traffic & Site Management': ['Traffic management & gatehouse control', 'Banksman hand-signals', 'Radio communication', 'Exclusion zones & hazard spotting'],
    'Safety & Compliance': ['Permit to work & site inductions', 'RAMS & toolbox talks awareness', 'Emergency stop procedures', 'Housekeeping & waste segregation'],
    'People & Reliability': ['Customer & subcontractor liaison', 'Site logs & basic paperwork', 'Teamwork', 'Punctuality & reliability'],
  },
  // Empty projects (kept for schema parity with the tech profile).
  projects: [],
  cards_certifications: [
    'CPCS Blue (Competent Operator) — Traffic / Vehicle Marshal — held since August 2020',
    'CPCS Blue (Competent Operator) — Hoist Operator — held since August 2020',
  ],
  preferences: {
    titles: ['Hoist Operator', 'Traffic Marshal', 'Banksman', 'Vehicle Marshal', 'Gateman', 'Loading Bay Operative', 'Site Operative'],
    seniority: ['Operative', 'Skilled', 'Experienced'],
    locations: ['London', 'West London', 'Acton'],
    salary_min: 28000,
    salary_max: 45000,
    currency: 'GBP',
    avoid: ['Unpaid', 'Apprentice'],
  },
  goals:
    'Secure steady Hoist Operator and Traffic Marshal work on London construction sites, day or night shifts, alongside continuing software development.',
  skills_to_learn: ['First Aid at Work', 'Fire Marshal', 'Asbestos Awareness', 'SSSTS'],
  additional: {
    availability: 'Immediate start — available for day or night shifts',
    right_to_work: 'UK Right to Work (ILR / settled)',
    languages: ['English (fluent)', 'Amharic (fluent)', 'Tigrinya (basic)'],
    interests: ['Football', 'Gym'],
  },
}

// ─── Track-aware, multi-user storage ─────────────────────────
// Every function takes a userId (first arg). When Supabase is configured
// AND the user is a real signed-in user, data lives in Postgres scoped to
// that user. Otherwise it falls back to JSON files (single local user) —
// so local dev, demos and static deploys keep working unchanged.
const TRACK_FILES = { tech: 'profile.json', construction: 'profile.construction.json' }
const TRACK_DEFAULTS = { tech: defaultProfile, construction: constructionProfile }
const normTrack = (t) => (t === 'construction' ? 'construction' : 'tech')
const LOCAL_USER = 'local'
const useDb = (userId) => supabaseConfigured() && !!userId && userId !== LOCAL_USER

export async function getActiveTrack(userId) {
  if (useDb(userId)) return normTrack(await db.dbGetActiveTrack(userId))
  const meta = await readJson('meta.json', null)
  return normTrack(meta?.active_track)
}
export async function setActiveTrack(userId, track) {
  const t = normTrack(track)
  if (useDb(userId)) { await db.dbSetActiveTrack(userId, t); return t }
  await writeJson('meta.json', { active_track: t })
  return t
}
export function listTracks() {
  return [
    { id: 'tech', label: 'Software Developer', headline: defaultProfile.headline, icon: 'code' },
    { id: 'construction', label: 'Site Operative', headline: constructionProfile.headline, icon: 'hardhat' },
  ]
}

export async function getProfile(userId, track) {
  const t = normTrack(track || (await getActiveTrack(userId)))
  if (useDb(userId)) return (await db.dbGetProfile(userId, t)) || TRACK_DEFAULTS[t] || defaultProfile
  return (await readJson(TRACK_FILES[t], null)) || TRACK_DEFAULTS[t] || defaultProfile
}
export async function saveProfile(userId, profile, track) {
  const t = normTrack(track || (await getActiveTrack(userId)))
  if (useDb(userId)) return await db.dbSaveProfile(userId, t, profile)
  await writeJson(TRACK_FILES[t], profile)
  return profile
}

export async function getJobs(userId) {
  if (useDb(userId)) return await db.dbGetJobs(userId)
  return await readJson('jobs.json', [])
}
export async function saveJobs(userId, jobs) {
  if (useDb(userId)) return await db.dbSaveJobs(userId, jobs)
  await writeJson('jobs.json', jobs)
  return jobs
}

export async function getDocuments(userId) {
  if (useDb(userId)) return await db.dbGetDocuments(userId)
  return await readJson('documents.json', [])
}
export async function saveDocuments(userId, docs) {
  if (useDb(userId)) return await db.dbSaveDocuments(userId, docs)
  await writeJson('documents.json', docs)
  return docs
}
