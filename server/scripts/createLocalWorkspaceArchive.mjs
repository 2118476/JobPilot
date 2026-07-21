import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.resolve(here, '..', 'data')
const output = process.argv[2]

if (!output) {
  throw new Error('Usage: node server/scripts/createLocalWorkspaceArchive.mjs <output.json>')
}

async function readJson(name, fallback) {
  try {
    return JSON.parse(await readFile(path.join(dataDir, name), 'utf8'))
  } catch {
    return fallback
  }
}

const [tech, construction, jobs, documents, searchSettings, meta] = await Promise.all([
  readJson('profile.json', {}),
  readJson('profile.construction.json', {}),
  readJson('jobs.json', []),
  readJson('documents.json', []),
  readJson('search_settings.json', {}),
  readJson('meta.json', {}),
])

const archive = {
  format: 'jobpilot-workspace',
  version: 1,
  exported_at: new Date().toISOString(),
  active_track: meta.active_track === 'construction' ? 'construction' : 'tech',
  profiles: { tech, construction },
  jobs,
  documents,
  search_settings: searchSettings,
}

await writeFile(path.resolve(output), JSON.stringify(archive), 'utf8')
console.log(JSON.stringify({ profiles: 2, jobs: jobs.length, documents: documents.length }))
