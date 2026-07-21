(() => {
  try {
    const saved = JSON.parse(localStorage.getItem('jobpilot-appearance') || 'null')
    const legacy = JSON.parse(localStorage.getItem('jobpilot-theme') || 'null')
    const state = saved && saved.state ? saved.state : {}
    const legacyTheme = typeof legacy === 'string' ? legacy : legacy && legacy.state && legacy.state.theme
    const selected = state.theme || legacyTheme || 'dark'
    const resolved = selected === 'system'
      ? (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : selected
    const root = document.documentElement
    root.dataset.theme = resolved === 'light' ? 'light' : 'dark'
    root.dataset.fontSize = state.fontSize || 'default'
    root.dataset.compact = String(Boolean(state.compactMode))
    root.dataset.animations = state.animations === false ? 'off' : 'on'
    root.dataset.scoreRing = state.scoreRingStyle || 'gradient'
    root.classList.add(root.dataset.theme)
    root.style.colorScheme = root.dataset.theme
  } catch {
    document.documentElement.classList.add('dark')
  }
})()
