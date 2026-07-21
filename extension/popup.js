// JobPilot "Save Job" popup — capture the current tab and POST it to the backend.

const $ = (id) => document.getElementById(id)
const DEFAULT_BACKEND = 'https://jobpilot-backend-qg2w.onrender.com'

// ── Load saved settings ──
chrome.storage.sync.get(['backend'], (cfg) => {
  $('backend').value = cfg.backend || DEFAULT_BACKEND
})
chrome.storage.session.get(['token'], (cfg) => { $('token').value = cfg.token || '' })

// ── Prefill from the active tab ──
async function prefill() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  if (!tab) return
  // Title: strip common " - Company | Site" suffixes for the job title guess.
  const rawTitle = (tab.title || '').split(/[|·—–-]/)[0].trim()
  $('title').value = rawTitle
  try {
    const host = new URL(tab.url).hostname.replace(/^www\./, '')
    $('company').value = host.split('.')[0].replace(/\b\w/g, (c) => c.toUpperCase())
  } catch {}

  // Pull selected text or a chunk of visible page text as the description.
  try {
    const [{ result } = {}] = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: () => {
        const sel = window.getSelection?.().toString().trim()
        if (sel && sel.length > 40) return sel.slice(0, 5000)
        const main = document.querySelector('main, article, [role=main]') || document.body
        return (main.innerText || '').replace(/\s+\n/g, '\n').trim().slice(0, 5000)
      },
    })
    if (result) $('description').value = result
  } catch {
    // scripting may be blocked on some pages (chrome://, store pages)
  }
}
prefill()

// ── Save ──
$('save').addEventListener('click', async () => {
  const btn = $('save')
  const msg = $('msg')
  const backend = ($('backend').value || DEFAULT_BACKEND).replace(/\/$/, '')
  const token = $('token').value.trim()
  chrome.storage.sync.set({ backend })
  chrome.storage.session.set({ token })

  const title = $('title').value.trim()
  if (!title) {
    msg.className = 'msg err'
    msg.textContent = 'Please enter a job title.'
    return
  }

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
  btn.disabled = true
  msg.className = 'msg'
  msg.textContent = 'Saving & scoring…'

  try {
    const res = await fetch(`${backend}/api/jobs/manual`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        title,
        company: $('company').value.trim() || 'Unknown',
        location: $('location').value.trim() || 'Unknown',
        description: $('description').value.trim(),
        source_url: tab?.url || '',
        source: 'Extension',
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || `${res.status} ${res.statusText}`)
    const score = data?.job?.match_score
    msg.className = 'msg ok'
    msg.textContent = `Saved! AI match score: ${score ?? '—'}%`
  } catch (e) {
    msg.className = 'msg err'
    msg.textContent = `Failed: ${e.message}`
  } finally {
    btn.disabled = false
  }
})
