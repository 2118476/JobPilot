// ─────────────────────────────────────────────────────────────
// ai.js — provider-agnostic LLM layer
// Implements Gemini (free) today; Anthropic/Groq/Ollama are easy
// drop-ins via AI_PROVIDER. Always falls back to a local heuristic
// scorer + template documents so the app never breaks.
// ─────────────────────────────────────────────────────────────

// Read env lazily (so it works regardless of when dotenv loads)
function cfg() {
  const provider = (process.env.AI_PROVIDER || 'gemini').toLowerCase()
  const geminiKey = process.env.GEMINI_API_KEY
  const geminiModel = process.env.GEMINI_MODEL || 'gemini-2.5-flash'
  const geminiScoreModel = process.env.GEMINI_SCORE_MODEL || 'gemini-2.5-flash-lite'
  const hasGemini = provider === 'gemini' && !!geminiKey
  return { provider, geminiKey, geminiModel, geminiScoreModel, hasGemini, live: hasGemini }
}

export function aiStatus() {
  const c = cfg()
  return {
    provider: c.provider,
    model: c.hasGemini ? c.geminiModel : 'heuristic',
    live: c.live,
    note: c.live ? null : 'No AI key configured — using local heuristic scoring + template documents.',
  }
}

// ─── Prompt context builders ─────────────────────────────────
function profileText(p) {
  const skills = Object.entries(p.skills || {})
    .map(([cat, list]) => `  ${cat}: ${list.join(', ')}`)
    .join('\n')
  const exp = (p.experience || [])
    .map((e) => `  - ${e.role} @ ${e.company} (${e.dates}): ${e.detail}`)
    .join('\n')
  const projects = (p.projects || [])
    .map((pr) => `  - ${pr.name}${pr.year ? ` (${pr.year})` : ''} [${(pr.tech || []).join(', ')}]: ${pr.detail}`)
    .join('\n')
  const edu = (p.education || [])
    .map((e) => `  - ${e.degree}, ${e.institution} (${e.dates})${e.note ? ` — ${e.note}` : ''}`)
    .join('\n')
  const certsInProgress = (p.certifications_in_progress || [])
    .map((c) => `  - ${c.name} (${c.issuer}) — ${c.status}. ${c.note || ''}`)
    .join('\n')
  const cards = (p.cards_certifications || []).map((c) => `  - ${c}`).join('\n')
  const prefs = p.preferences || {}
  const add = p.additional || {}
  const contact = [
    p.email && `Email: ${p.email}`,
    p.phone && `Phone: ${p.phone}`,
    p.website && `Portfolio: ${p.website}`,
    p.linkedin && `LinkedIn: ${p.linkedin}`,
    p.github && `GitHub: ${p.github}`,
  ].filter(Boolean).join(' | ')
  const lines = [
    `Name: ${p.full_name}`,
    `Contact: ${contact}`,
    `Location: ${p.location}`,
    `Headline: ${p.headline}`,
    `Summary: ${p.summary}`,
    `Education:\n${edu}`,
  ]
  if (exp) lines.push(`Experience:\n${exp}`)
  lines.push(`Skills:\n${skills}`)
  if (cards) lines.push(`Cards & Certifications (currently held):\n${cards}`)
  if (certsInProgress) lines.push(`Certifications in progress (not yet awarded):\n${certsInProgress}`)
  if (projects) lines.push(`Projects:\n${projects}`)
  const addl = [
    add.volunteering && `Volunteering: ${add.volunteering}`,
    add.availability && `Availability: ${add.availability}`,
    add.right_to_work && `Right to work: ${add.right_to_work}`,
    add.languages && `Languages: ${add.languages.join(', ')}`,
    add.interests && `Interests: ${add.interests.join(', ')}`,
  ].filter(Boolean).join('\n')
  if (addl) lines.push(`Additional:\n${addl}`)
  lines.push(`Target roles: ${(prefs.titles || []).join(', ')}`)
  lines.push(`Seniority: ${(prefs.seniority || []).join(', ')} | Avoid: ${(prefs.avoid || []).join(', ')}`)
  lines.push(`Salary target: ${prefs.currency || 'GBP'} ${prefs.salary_min}–${prefs.salary_max}`)
  lines.push(`Career goal: ${p.goals}`)
  return lines.join('\n')
}

// Strip Markdown so generated documents read as plain, human-written text
// (no **bold**, no "* " bullets, no # headings, no backticks).
function deMarkdown(s) {
  return String(s || '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/__(.*?)__/g, '$1')
    .replace(/(^|\n)\s{0,3}#{1,6}\s*/g, '$1')
    .replace(/(^|\n)[ \t]*[*•]\s+/g, '$1- ')
    .replace(/`+/g, '')
    .replace(/\*/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function jobText(job) {
  const sal =
    job.salary_min || job.salary_max
      ? `${job.salary_currency || 'GBP'} ${job.salary_min || '?'}–${job.salary_max || '?'}`
      : 'not stated'
  const reqs = (job.requirements || []).length ? `\nRequirements: ${job.requirements.join('; ')}` : ''
  const resp = (job.responsibilities || []).length ? `\nResponsibilities: ${job.responsibilities.join('; ')}` : ''
  const desc = (job.description || '').slice(0, 2500)
  return `Title: ${job.title}\nCompany: ${job.company}\nLocation: ${job.location} (${job.remote_type || 'unknown'})\nSalary: ${sal}\nDescription: ${desc}${reqs}${resp}`
}

// ─── Gemini REST call ────────────────────────────────────────
async function geminiGenerate({ system, user, json, schema, model }) {
  const { geminiKey, geminiModel } = cfg()
  const useModel = model || geminiModel
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${useModel}:generateContent`
  const generationConfig = { temperature: json ? 0.3 : 0.6, maxOutputTokens: 4096 }
  if (json) {
    generationConfig.responseMimeType = 'application/json'
    if (schema) generationConfig.responseSchema = schema
    // Gemini 2.5 "thinks" by default, eating the output budget and truncating
    // JSON. Structured extraction doesn't need it — disable so the full budget
    // goes to the answer.
    generationConfig.thinkingConfig = { thinkingBudget: 0 }
  }
  const body = { contents: [{ role: 'user', parts: [{ text: user }] }], generationConfig }
  if (system) body.systemInstruction = { parts: [{ text: system }] }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  let lastErr
  // Retry transient overload/rate-limit responses with backoff.
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const data = await res.json()
      const text = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('')
      if (!text) throw new Error('Gemini returned empty response')
      return text
    }
    const t = await res.text()
    lastErr = new Error(`Gemini ${res.status}: ${t.slice(0, 200)}`)
    if ((res.status === 503 || res.status === 429) && attempt < 2) {
      await sleep(900 * (attempt + 1))
      continue
    }
    throw lastErr
  }
  throw lastErr
}

// ─── Job scoring ─────────────────────────────────────────────
const scoreSchema = {
  type: 'OBJECT',
  properties: {
    overall_score: { type: 'INTEGER' },
    skill_match_score: { type: 'INTEGER' },
    experience_match_score: { type: 'INTEGER' },
    location_match_score: { type: 'INTEGER' },
    salary_match_score: { type: 'INTEGER' },
    matched_skills: { type: 'ARRAY', items: { type: 'STRING' } },
    missing_skills: { type: 'ARRAY', items: { type: 'STRING' } },
    explanation: { type: 'STRING' },
  },
  required: [
    'overall_score', 'skill_match_score', 'experience_match_score',
    'location_match_score', 'salary_match_score', 'matched_skills',
    'missing_skills', 'explanation',
  ],
}

const clamp = (n) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)))

function isCivilServiceJob(job) {
  const t = `${job.source || ''} ${job.title || ''} ${job.company || ''}`.toLowerCase()
  return (
    job.source === 'Civil Service Jobs' ||
    job.source === 'Find A Job (GOV.UK)' ||
    /civil service|government digital service|gds|cabinet office|home office|hmrc|dwp|nhs|public sector|ministry of|department for|department of/.test(t)
  )
}

function civilServiceContext(job) {
  if (!isCivilServiceJob(job)) return ''
  return (
    '\n\nIMPORTANT — This is a UK Civil Service / public sector role. Key differences to consider:\n' +
    '- UK Civil Service uses Behaviour/Competency frameworks (e.g. "Making Effective Decisions", "Delivering at Pace", "Working Together").\n' +
    '- Government Digital Service (GDS) roles align strongly with full-stack web development, agile delivery and open-source tools.\n' +
    '- Civil Service jobs are highly stable, often 35-hour weeks, generous pension — desirable for a junior.\n' +
    '- Security clearance (Basic/DBS) is commonly required but straightforward for UK residents.\n' +
    '- ITIL knowledge is a bonus for tech support and service management roles.\n' +
    '- Salary bands tend to be slightly lower than private sector but very stable.\n' +
    'Score favourably if the candidate\'s skills and profile match the technical requirements — even if they lack direct civil service experience.'
  )
}

export async function scoreJob(profile, job) {
  if (!cfg().live) return heuristicScore(profile, job)
  try {
    const isGov = isCivilServiceJob(job)
    const system =
      'You are an expert technical recruiter advising a job candidate. Score how well THIS CANDIDATE matches THIS JOB, from the candidate\'s perspective. Be realistic and honest: a junior/graduate candidate should score LOW (under ~45) on senior, lead, principal or "5+ years" roles, and HIGH on well-matched junior/graduate roles. All scores are integers 0–100.' +
      (isGov ? ' For UK Civil Service and public sector roles, treat ITIL knowledge (even studying) as a positive signal for service management roles, and value the candidate\'s agile/scrum experience highly.' : '')
    const user =
      `CANDIDATE PROFILE:\n${profileText(profile)}\n\nJOB POSTING:\n${jobText(job)}${civilServiceContext(job)}\n\n` +
      'Return JSON. matched_skills = skills the candidate genuinely has that this job wants (max 8). ' +
      'missing_skills = the most important skills/requirements the candidate lacks (max 5). ' +
      'explanation = one or two honest sentences addressed to the candidate ("You ...").'
    const text = await geminiGenerate({ system, user, json: true, schema: scoreSchema, model: cfg().geminiScoreModel })
    const p = JSON.parse(text)
    return {
      overall_score: clamp(p.overall_score),
      skill_match_score: clamp(p.skill_match_score),
      experience_match_score: clamp(p.experience_match_score),
      location_match_score: clamp(p.location_match_score),
      salary_match_score: clamp(p.salary_match_score),
      matched_skills: (p.matched_skills || []).slice(0, 8),
      missing_skills: (p.missing_skills || []).slice(0, 5),
      explanation: p.explanation || '',
    }
  } catch (e) {
    return { ...heuristicScore(profile, job), _error: String(e.message || e) }
  }
}

function heuristicScore(profile, job) {
  const text = jobText(job).toLowerCase()
  const allSkills = Object.values(profile.skills || {}).flat().map((s) => s.replace(/\s*\(.*?\)\s*/g, '').trim())
  // Also count certifications in progress as partial skill matches
  const inProgressCerts = (profile.certifications_in_progress || []).map((c) => c.name.replace(/\s*\(.*?\)\s*/g, '').trim())
  const matched = [...new Set(allSkills.filter((s) => s.length > 1 && text.includes(s.toLowerCase())))].slice(0, 8)
  const isSenior = /\b(senior|lead|principal|staff|head of|director|5\+? years|7\+? years|10\+? years)\b/.test(text)
  const isGovRole = isCivilServiceJob(job)
  // Partial ITIL credit: if job mentions ITIL and candidate is studying it
  const hasItilBonus = /\bitil\b/.test(text) && inProgressCerts.some((c) => /itil/i.test(c))
  let base = Math.min(94, 48 + matched.length * 7)
  if (isSenior) base = Math.max(28, base - 38)
  if (isGovRole && !isSenior) base = Math.min(94, base + 6) // civil service roles tend to be well-matched
  if (hasItilBonus) base = Math.min(94, base + 5)
  const candidates = ['AWS', 'Docker', 'Kubernetes', 'TypeScript', 'CI/CD', 'GraphQL', 'Kotlin', 'Go']
  const missing = candidates
    .filter((s) => text.includes(s.toLowerCase()) && !allSkills.some((k) => k.toLowerCase().includes(s.toLowerCase())))
    .slice(0, 5)
  let explanation = `You share ${matched.length} key skill${matched.length === 1 ? '' : 's'} with this role${isSenior ? ', but it looks more senior than your target level.' : '.'}`
  if (isGovRole) explanation += ' This is a public sector role — your agile background and project delivery experience are valued here.'
  if (hasItilBonus) explanation += ' Your ITIL 4 studies are directly relevant.'
  return {
    overall_score: base,
    skill_match_score: base,
    experience_match_score: Math.max(25, base - 10),
    location_match_score: /remote|london|hybrid|uk|united kingdom/.test(text) ? 88 : 65,
    salary_match_score: 85,
    matched_skills: matched,
    missing_skills: missing,
    explanation,
    _heuristic: true,
  }
}

// ─── Interview prep ──────────────────────────────────────────
const interviewSchema = {
  type: 'OBJECT',
  properties: {
    questions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          category: { type: 'STRING', enum: ['Technical', 'Behavioral', 'Project', 'Situational', 'Ask Them'] },
          q: { type: 'STRING' },
          tip: { type: 'STRING' },
        },
        required: ['category', 'q', 'tip'],
      },
    },
  },
  required: ['questions'],
}

export async function interviewPrep(profile, job) {
  if (!cfg().live) return { questions: heuristicQuestions(profile, job), fallback: true }
  try {
    const system =
      'You are an expert technical interview coach. Generate the most likely interview questions for THIS candidate interviewing for THIS specific job, plus how to answer each. ' +
      'Ground every tip in the candidate\'s REAL profile — name the specific project or skill they should draw on. Never invent experience. ' +
      'Mix the categories: Technical (the job\'s stack and the candidate\'s skills), Behavioral, Project (a deep-dive into one of the candidate\'s real projects), and Situational. ' +
      'Also include exactly 2 "Ask Them" entries — sharp questions the candidate should ask the interviewer (tip = why it\'s a strong question). ' +
      'Use UK English and these exact category labels: Technical, Behavioral, Project, Situational, Ask Them.'
    const user =
      `CANDIDATE:\n${profileText(profile)}\n\nJOB:\n${jobText(job)}\n\n` +
      'Return 8–10 questions total as JSON. Each item: category, q (the interview question), tip (1–2 sentences on how to approach it, referencing the candidate\'s real background).'
    const text = await geminiGenerate({ system, user, json: true, schema: interviewSchema })
    const parsed = JSON.parse(text)
    const questions = (parsed.questions || [])
      .filter((x) => x && x.q && x.category)
      .slice(0, 12)
      .map((x) => ({ category: x.category, q: deMarkdown(x.q), tip: deMarkdown(x.tip) }))
    return { questions: questions.length ? questions : heuristicQuestions(profile, job) }
  } catch (e) {
    return { questions: heuristicQuestions(profile, job), fallback: true, error: String(e.message || e) }
  }
}

function heuristicQuestions(profile, job) {
  const skills = (job.match_analysis?.matched_skills || Object.values(profile.skills || {}).flat()).map((x) =>
    x.replace(/\s*\(.*?\)\s*/g, '').trim(),
  )
  const top = skills[0] || 'Java'
  return [
    { category: 'Technical', q: `Walk me through how you've used ${top} in a real project.`, tip: 'Reference a specific project (e.g. your salon booking platform) and the technical decisions you made.' },
    { category: 'Technical', q: 'How do you design and test a REST API?', tip: 'Draw on your Spring Boot / Node.js API work; mention testing with JUnit.' },
    { category: 'Project', q: "Tell me about a project you're proud of and your role in it.", tip: 'Pick your most relevant project; explain the problem, your contribution and the outcome.' },
    { category: 'Behavioral', q: `Why do you want to work at ${job.company}?`, tip: 'Research their product; connect it to your goals as a junior developer.' },
    { category: 'Situational', q: "How do you approach a bug you can't immediately reproduce?", tip: 'Show a systematic process: logs, isolating variables, and asking for help when stuck.' },
    { category: 'Behavioral', q: 'Tell me about a time you learned a new technology quickly.', tip: 'Use a real example from your studies or freelance work.' },
    { category: 'Ask Them', q: 'What does the first three months look like for a junior developer here?', tip: "Shows you're thinking about ramp-up and growth." },
    { category: 'Ask Them', q: 'How is code reviewed, and how do juniors get mentorship?', tip: 'Signals that you value learning and code quality.' },
  ]
}

// ─── AI Career Coach (multi-turn chat) ───────────────────────
function pipelineSummary(ctx = {}) {
  const s = ctx.stats || {}
  const top = (ctx.topJobs || [])
    .slice(0, 5)
    .map((j) => `${j.title} at ${j.company} (${j.match_score}%)`)
    .join('; ')
  return (
    `Jobs tracked: ${s.totalJobs || 0} (${s.scoredJobs || 0} AI-scored). ` +
    `Strong matches (85%+): ${s.strongMatches || 0}. Applied: ${s.applied || 0}. ` +
    `Interviews: ${s.interviewsScheduled || 0}. Average match score: ${s.averageMatchScore || 0}%. ` +
    `Top current matches: ${top || 'none yet — the candidate should run a search'}.`
  )
}

export async function coachReply(profile, messages, context = {}) {
  if (!cfg().live) {
    return {
      text:
        'The AI coach needs a Gemini API key in server/.env to chat. In the meantime: prioritise your strongest matches, tailor your CV for each role, and prepare answers to the common interview questions.',
      fallback: true,
    }
  }
  const { geminiKey, geminiModel } = cfg()
  const system =
    'You are an elite, warm and honest UK tech careers coach helping a JUNIOR/GRADUATE software developer land their first role. ' +
    'Give specific, practical, encouraging, realistic advice. Ground every answer in THIS candidate\'s real profile and their current job-hunt pipeline below — reference their actual skills, projects and matches. ' +
    'Be concise and actionable; prefer a few short paragraphs or simple "- " bullets. UK English. ' +
    'Plain text only — NO Markdown, no asterisks, no bold. Never invent experience the candidate does not have.\n\n' +
    `CANDIDATE PROFILE:\n${profileText(profile)}\n\nCURRENT JOB-HUNT PIPELINE:\n${pipelineSummary(context)}`

  const contents = (messages || [])
    .slice(-12)
    .map((m) => ({ role: m.role === 'assistant' ? 'model' : 'user', parts: [{ text: String(m.content || '') }] }))
  if (!contents.length || contents[contents.length - 1].role !== 'user') {
    contents.push({ role: 'user', parts: [{ text: 'Hi — where should I focus my job hunt right now?' }] })
  }

  const body = {
    systemInstruction: { parts: [{ text: system }] },
    contents,
    generationConfig: { temperature: 0.7, maxOutputTokens: 1024, thinkingConfig: { thinkingBudget: 0 } },
  }
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiKey },
      body: JSON.stringify(body),
    })
    if (res.ok) {
      const data = await res.json()
      const text = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('')
      return { text: deMarkdown(text) || 'Sorry, I had trouble responding — please try again.' }
    }
    if ((res.status === 503 || res.status === 429) && attempt < 2) {
      await sleep(900 * (attempt + 1))
      continue
    }
    const t = await res.text()
    return { text: 'The coach is temporarily unavailable — please try again in a moment.', fallback: true, error: `Gemini ${res.status}: ${t.slice(0, 150)}` }
  }
  return { text: 'The coach is temporarily unavailable — please try again.', fallback: true }
}

// ─── CV / cover-letter tailoring ─────────────────────────────
export async function tailorDocument(profile, job, type, opts = {}) {
  const tone = opts.tone || 'professional'
  if (!cfg().live) return { text: deMarkdown(templateDoc(profile, job, type)), fallback: true }
  try {
    let system, user
    if (type === 'cover_letter') {
      system =
        `You are an expert cover-letter writer. Write a concise, truthful, ${tone} cover letter (about 250–320 words) for the candidate applying to this exact job. ` +
        'Use ONLY facts from the candidate profile — never invent experience, employers or skills. Use UK English. ' +
        'No bracketed placeholders. Address it to the named company\'s hiring team and sign off with the candidate\'s name. ' +
        'Write in plain text only — NO Markdown: no asterisks (*), no bold, no headings. It must read as if a person typed it.'
      user = `CANDIDATE:\n${profileText(profile)}\n\nJOB:\n${jobText(job)}\n\nWrite the cover letter now.`
    } else {
      system =
        'You are an expert CV writer. Produce a tailored, ATS-friendly CV for the candidate targeting this specific job. ' +
        'Reorder and emphasise the most relevant skills, projects and experience, rewrite the profile/summary for this role, and mirror the job\'s key terms — ' +
        'but use ONLY facts present in the candidate profile. Never fabricate roles, employers, dates, skills or certifications. ' +
        'Use the candidate\'s real contact details; NEVER output bracketed placeholders like [Email] — if a detail is absent, omit it. ' +
        'Use UK English with UPPERCASE section headings on their own lines, choosing only the ones the profile supports: CONTACT, PROFILE, KEY SKILLS, CARDS & CERTIFICATIONS, EXPERIENCE, PROJECTS, EDUCATION, ADDITIONAL INFORMATION. ' +
        'If the candidate holds cards or certifications (e.g. a CPCS card), include a CARDS & CERTIFICATIONS section near the top and state exactly what is held and since when. Only include an EXPERIENCE or PROJECTS section if the profile actually lists them. ' +
        'CRITICAL: write plain text only — NO Markdown whatsoever. Do NOT use asterisks (*), bold (**...**), hashes (#) or bullet symbols; use a simple hyphen (-) for any list item. The CV must read as if a person typed it, not as AI output.'
      user = `CANDIDATE PROFILE:\n${profileText(profile)}\n\nTARGET JOB:\n${jobText(job)}\n\nProduce the tailored CV now.`
    }
    const text = await geminiGenerate({ system, user, json: false })
    const out = deMarkdown(text) || deMarkdown(templateDoc(profile, job, type))
    return { text: out }
  } catch (e) {
    return { text: deMarkdown(templateDoc(profile, job, type)), fallback: true, error: String(e.message || e) }
  }
}

function templateDoc(profile, job, type) {
  const skills = Object.values(profile.skills || {}).flat().map((s) => s.replace(/\s*\(.*?\)\s*/g, '').trim())
  if (type === 'cover_letter') {
    return [
      `Dear ${job.company} Hiring Team,`,
      '',
      `I am writing to apply for the ${job.title} position at ${job.company}. As a Computer Science graduate from Brunel University London with full-stack experience in ${skills.slice(0, 4).join(', ')}, I am keen to contribute as a junior software developer on your team.`,
      '',
      'Through my projects I have built and deployed real applications — including a Java and Spring Boot hair salon booking system, and a React and Spring Boot SMS & voice communication app integrating the Twilio API — giving me hands-on experience with REST APIs, SQL databases and cloud deployment.',
      '',
      `I would welcome the opportunity to discuss how I can contribute to ${job.company} and continue growing as a developer.`,
      '',
      'Kind regards,',
      profile.full_name,
    ].join('\n')
  }
  const contact = [profile.location, profile.phone, profile.email, profile.website, profile.github].filter(Boolean).join(' | ')
  const exp = (profile.experience || [])
    .map((e) => `${e.role} | ${e.company} | ${e.dates}\n  ${e.detail}`)
    .join('\n\n')
  const projects = (profile.projects || [])
    .map((p) => `${p.name}${p.year ? ` (${p.year})` : ''} — ${(p.tech || []).join(', ')}\n  ${p.detail}`)
    .join('\n\n')
  const cards = (profile.cards_certifications || []).map((c) => `- ${c}`).join('\n')
  const edu = (profile.education || [])
    .map((e) => `${e.degree}, ${e.institution} (${e.dates})${e.note ? `\n  ${e.note}` : ''}`)
    .join('\n\n')
  const sections = [
    profile.full_name.toUpperCase(),
    contact,
    '',
    'PROFILE',
    profile.summary,
    '',
    'KEY SKILLS',
    Object.entries(profile.skills || {}).map(([c, l]) => `${c}: ${l.join(', ')}`).join('\n'),
  ]
  if (cards) sections.push('', 'CARDS & CERTIFICATIONS', cards)
  if (exp) sections.push('', 'EXPERIENCE', exp)
  if (projects) sections.push('', 'PROJECTS', projects)
  sections.push('', 'EDUCATION', edu)
  return sections.join('\n')
}
